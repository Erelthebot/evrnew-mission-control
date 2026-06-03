#!/usr/bin/env bash
# Unified supervisor for Hermes + OpenClaw reliability.
# Safe for frequent scheduling from cron/launchd due to lock + bounded restart policy.

set -u
set -o pipefail

COMPONENT="both"
SOURCE="manual"
DRY_RUN=0

USER_UID="$(id -u)"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT_DIR}/logs/reliability"
STATE_DIR="${LOG_DIR}/state"
LOCK_DIR="${LOG_DIR}/.supervisor.lock"
SUPERVISOR_LOG="${LOG_DIR}/supervisor.log"
ESCALATION_LOG="${LOG_DIR}/escalations.log"
INCIDENTS_FILE="${LOG_DIR}/incidents.ndjson"
IMPROVEMENT_TASKS_FILE="${LOG_DIR}/improvement-tasks.ndjson"

OPENCLAW_HEALTH_URL="${OPENCLAW_HEALTH_URL:-http://127.0.0.1:18789/health}"
MAX_RETRIES="${MAX_RETRIES:-3}"
BASE_DELAY_SECONDS="${BASE_DELAY_SECONDS:-2}"
MAX_JITTER_SECONDS="${MAX_JITTER_SECONDS:-2}"
POST_RESTART_PROBES="${POST_RESTART_PROBES:-2}"
POST_RESTART_PROBE_DELAY_SECONDS="${POST_RESTART_PROBE_DELAY_SECONDS:-3}"
MAX_RESTARTS_PER_WINDOW="${MAX_RESTARTS_PER_WINDOW:-4}"
RESTART_WINDOW_SECONDS="${RESTART_WINDOW_SECONDS:-1200}"
COOLDOWN_SECONDS="${COOLDOWN_SECONDS:-1800}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-5}"
TELEGRAM_ALERT_CHAT_ID="${TELEGRAM_ALERT_CHAT_ID:-8688596596}"

RUN_ID="$(date -u '+%Y%m%dT%H%M%SZ')-$$"
LAST_PROBE_REASON=""

usage() {
  cat <<'EOF'
Usage: hermes-openclaw-supervisor.sh [--component hermes|openclaw|both] [--source NAME] [--dry-run]
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --component)
      COMPONENT="${2:-}"
      shift 2
      ;;
    --source)
      SOURCE="${2:-manual}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [ "$COMPONENT" != "hermes" ] && [ "$COMPONENT" != "openclaw" ] && [ "$COMPONENT" != "both" ]; then
  echo "Invalid --component value: $COMPONENT" >&2
  exit 2
fi

mkdir -p "$LOG_DIR" "$STATE_DIR"
touch "$SUPERVISOR_LOG" "$ESCALATION_LOG" "$INCIDENTS_FILE" "$IMPROVEMENT_TASKS_FILE"

log() {
  printf '[%s] run=%s source=%s component=%s dry_run=%s %s\n' \
    "$(date '+%Y-%m-%d %H:%M:%S')" \
    "$RUN_ID" \
    "$SOURCE" \
    "$COMPONENT" \
    "$DRY_RUN" \
    "$*" >> "$SUPERVISOR_LOG"
}

release_lock() {
  if [ -d "$LOCK_DIR" ] && [ -f "$LOCK_DIR/pid" ]; then
    local lock_pid
    lock_pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
    if [ "$lock_pid" = "$$" ]; then
      rm -rf "$LOCK_DIR"
    fi
  fi
}

acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "$$" > "$LOCK_DIR/pid"
    trap release_lock EXIT INT TERM
    return 0
  fi

  local active_pid
  active_pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
  if [ -n "$active_pid" ] && kill -0 "$active_pid" 2>/dev/null; then
    log "lock_active pid=${active_pid} exiting_noop"
    exit 0
  fi

  rm -rf "$LOCK_DIR"
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "$$" > "$LOCK_DIR/pid"
    trap release_lock EXIT INT TERM
    return 0
  fi

  log "lock_error unable_to_acquire"
  exit 1
}

write_incident() {
  local component="$1"
  local cause="$2"
  local action="$3"
  local result="$4"
  local details="${5:-}"
  local attempt="${6:-0}"

  details="${details//$'\n'/ }"

  python3 - "$INCIDENTS_FILE" "$RUN_ID" "$SOURCE" "$component" "$cause" "$action" "$result" "$details" "$attempt" <<'PY'
import json
import sys
from datetime import datetime, timezone

path, run_id, source, component, cause, action, result, details, attempt = sys.argv[1:]
record = {
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "run_id": run_id,
    "source": source,
    "component": component,
    "cause": cause,
    "action": action,
    "result": result,
    "attempt": int(attempt),
    "details": details,
}
with open(path, "a", encoding="utf-8") as f:
    f.write(json.dumps(record, ensure_ascii=True) + "\n")
PY
}

derive_improvement_task() {
  local component="$1"
  local cause="$2"

  python3 - "$INCIDENTS_FILE" "$IMPROVEMENT_TASKS_FILE" "$component" "$cause" "$RUN_ID" <<'PY'
import json
import sys
from datetime import datetime, timedelta, timezone

incidents_path, tasks_path, component, cause, run_id = sys.argv[1:]
now = datetime.now(timezone.utc)
cutoff = now - timedelta(hours=24)
threshold = 3
key = f"{component}:{cause}"

def parse_lines(path):
    items = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    items.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except FileNotFoundError:
        pass
    return items

incidents = parse_lines(incidents_path)
count = 0
for item in incidents:
    if item.get("component") != component:
        continue
    if item.get("cause") != cause:
        continue
    if item.get("result") in {"recovered", "healthy"}:
        continue
    ts = item.get("timestamp")
    try:
      dt = datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except Exception:
      continue
    if dt >= cutoff:
      count += 1

if count < threshold:
    sys.exit(0)

tasks = parse_lines(tasks_path)
for task in tasks:
    if task.get("task_key") != key:
        continue
    if task.get("status") != "open":
        continue
    ts = task.get("created_at")
    try:
        dt = datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except Exception:
        continue
    if dt >= cutoff:
        sys.exit(0)

suggestions = {
    "restart_rate_limited": "Investigate crash loop before increasing restart allowance.",
    "openclaw_health_unhealthy": "Review OpenClaw /health dependencies and startup readiness budget.",
    "hermes_launchctl_not_running": "Inspect Hermes startup logs and launchd dependency ordering.",
}
suggestion = suggestions.get(cause, "Review incident cluster and add a targeted health gate or dependency check.")
task = {
    "created_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    "task_key": key,
    "status": "open",
    "component": component,
    "trigger_cause": cause,
    "incident_count_24h": count,
    "suggestion": suggestion,
    "linked_run_id": run_id,
}
with open(tasks_path, "a", encoding="utf-8") as f:
    f.write(json.dumps(task, ensure_ascii=True) + "\n")
PY
}

send_escalation_alert() {
  local message="$1"
  local token="${TELEGRAM_BOT_TOKEN:-}"
  if [ -z "$token" ]; then
    log "escalation_alert_skipped reason=missing_TELEGRAM_BOT_TOKEN"
    return 0
  fi

  local endpoint="http://127.0.0.1:18799/bot${token}/sendMessage"
  curl -sf -X POST "$endpoint" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": ${TELEGRAM_ALERT_CHAT_ID}, \"text\": \"${message}\"}" \
    > /dev/null 2>&1 || true
}

escalate_failure() {
  local component="$1"
  local cause="$2"
  local details="$3"
  local stamp
  stamp="$(date '+%Y-%m-%d %H:%M:%S')"
  printf '[%s] component=%s cause=%s details=%s\n' "$stamp" "$component" "$cause" "$details" >> "$ESCALATION_LOG"
  log "escalated component=${component} cause=${cause} details=${details}"
  send_escalation_alert "Reliability escalation: ${component} cause=${cause}. See ${ESCALATION_LOG}."
}

state_file_for() {
  printf '%s/%s.state\n' "$STATE_DIR" "$1"
}

load_state() {
  local component="$1"
  local file
  file="$(state_file_for "$component")"
  RESTART_COUNT=0
  WINDOW_START=0
  COOLDOWN_UNTIL=0

  [ -f "$file" ] || return 0
  while IFS='=' read -r key value; do
    case "$key" in
      restart_count) RESTART_COUNT="${value:-0}" ;;
      window_start) WINDOW_START="${value:-0}" ;;
      cooldown_until) COOLDOWN_UNTIL="${value:-0}" ;;
    esac
  done < "$file"
}

save_state() {
  local component="$1"
  local file
  file="$(state_file_for "$component")"
  {
    echo "restart_count=${RESTART_COUNT}"
    echo "window_start=${WINDOW_START}"
    echo "cooldown_until=${COOLDOWN_UNTIL}"
  } > "$file"
}

register_restart_attempt() {
  local component="$1"
  local now
  now="$(date +%s)"
  load_state "$component"

  if [ "$WINDOW_START" -eq 0 ] || [ $((now - WINDOW_START)) -gt "$RESTART_WINDOW_SECONDS" ]; then
    WINDOW_START="$now"
    RESTART_COUNT=0
  fi

  RESTART_COUNT=$((RESTART_COUNT + 1))
  save_state "$component"
}

restart_allowed() {
  local component="$1"
  local now
  now="$(date +%s)"
  load_state "$component"

  if [ "$COOLDOWN_UNTIL" -gt "$now" ]; then
    LAST_PROBE_REASON="restart_cooldown_active"
    return 1
  fi

  if [ "$WINDOW_START" -eq 0 ] || [ $((now - WINDOW_START)) -gt "$RESTART_WINDOW_SECONDS" ]; then
    WINDOW_START="$now"
    RESTART_COUNT=0
    COOLDOWN_UNTIL=0
    save_state "$component"
    return 0
  fi

  if [ "$RESTART_COUNT" -ge "$MAX_RESTARTS_PER_WINDOW" ]; then
    COOLDOWN_UNTIL=$((now + COOLDOWN_SECONDS))
    save_state "$component"
    LAST_PROBE_REASON="restart_rate_limited"
    return 1
  fi

  return 0
}

probe_hermes() {
  local status pid
  status="$(launchctl print "gui/${USER_UID}/ai.hermes.gateway" 2>/dev/null || true)"
  if [ -z "$status" ]; then
    LAST_PROBE_REASON="hermes_launchctl_unavailable"
    return 1
  fi

  if ! printf '%s\n' "$status" | grep -q "state = running"; then
    LAST_PROBE_REASON="hermes_launchctl_not_running"
    return 1
  fi

  pid="$(printf '%s\n' "$status" | awk '/pid = / {print $3; exit}')"
  if ! [[ "$pid" =~ ^[0-9]+$ ]] || [ "$pid" -le 0 ]; then
    LAST_PROBE_REASON="hermes_pid_missing"
    return 1
  fi

  if ! kill -0 "$pid" 2>/dev/null; then
    LAST_PROBE_REASON="hermes_pid_not_alive"
    return 1
  fi

  LAST_PROBE_REASON=""
  return 0
}

probe_openclaw() {
  local status pid health
  status="$(sudo launchctl print system/ai.openclaw.gateway 2>/dev/null || true)"
  if [ -z "$status" ]; then
    LAST_PROBE_REASON="openclaw_launchctl_unavailable"
    return 1
  fi

  if ! printf '%s\n' "$status" | grep -q "state = running"; then
    LAST_PROBE_REASON="openclaw_launchctl_not_running"
    return 1
  fi

  pid="$(printf '%s\n' "$status" | awk '/pid = / {print $3; exit}')"
  if ! [[ "$pid" =~ ^[0-9]+$ ]] || [ "$pid" -le 0 ]; then
    LAST_PROBE_REASON="openclaw_pid_missing"
    return 1
  fi

  health="$(curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "$OPENCLAW_HEALTH_URL" 2>/dev/null || true)"
  if ! printf '%s\n' "$health" | grep -Eq '"ok"[[:space:]]*:[[:space:]]*true'; then
    LAST_PROBE_REASON="openclaw_health_unhealthy"
    return 1
  fi

  LAST_PROBE_REASON=""
  return 0
}

probe_component() {
  local component="$1"
  case "$component" in
    hermes) probe_hermes ;;
    openclaw) probe_openclaw ;;
    *)
      LAST_PROBE_REASON="invalid_component"
      return 1
      ;;
  esac
}

restart_component() {
  local component="$1"
  local attempt="$2"

  if ! restart_allowed "$component"; then
    write_incident "$component" "$LAST_PROBE_REASON" "restart_gate" "suppressed" "restart not allowed by cooldown policy" "$attempt"
    derive_improvement_task "$component" "$LAST_PROBE_REASON"
    escalate_failure "$component" "$LAST_PROBE_REASON" "Restart suppressed by storm guard."
    return 1
  fi

  register_restart_attempt "$component"

  if [ "$DRY_RUN" -eq 1 ]; then
    log "dry_run restart component=${component} attempt=${attempt}"
    write_incident "$component" "planned_restart" "restart" "simulated" "dry-run restart only" "$attempt"
    return 0
  fi

  case "$component" in
    hermes)
      if launchctl kickstart -k "gui/${USER_UID}/ai.hermes.gateway" >> "$SUPERVISOR_LOG" 2>&1; then
        log "restart_command_ok component=hermes attempt=${attempt}"
        return 0
      fi
      ;;
    openclaw)
      if sudo launchctl kickstart -k system/ai.openclaw.gateway >> "$SUPERVISOR_LOG" 2>&1; then
        log "restart_command_ok component=openclaw attempt=${attempt}"
        return 0
      fi
      ;;
  esac

  write_incident "$component" "restart_command_failed" "restart" "failed" "launchctl kickstart failed" "$attempt"
  derive_improvement_task "$component" "restart_command_failed"
  return 1
}

verify_component_after_restart() {
  local component="$1"
  local check=1
  while [ "$check" -le "$POST_RESTART_PROBES" ]; do
    sleep "$POST_RESTART_PROBE_DELAY_SECONDS"
    if probe_component "$component"; then
      return 0
    fi
    check=$((check + 1))
  done
  return 1
}

backoff_sleep() {
  local attempt="$1"
  local base delay jitter
  base=$((BASE_DELAY_SECONDS * (2 ** (attempt - 1))))
  jitter=$((RANDOM % (MAX_JITTER_SECONDS + 1)))
  delay=$((base + jitter))
  log "backoff_seconds=${delay} before_next_attempt"
  sleep "$delay"
}

clear_openclaw_bot_conflict() {
  local pids
  pids="$(pgrep -f "telegram-bot/bot\.py" 2>/dev/null || true)"
  [ -z "$pids" ] && return 0

  if [ "$DRY_RUN" -eq 1 ]; then
    log "dry_run bot_conflict_detected pids=${pids}"
    write_incident "openclaw" "bot_conflict" "terminate_conflict" "simulated" "would kill bot.py conflict process(es)" "0"
    return 0
  fi

  local killed=1
  local pid
  for pid in $pids; do
    if ! kill "$pid" 2>/dev/null; then
      killed=0
    fi
  done

  if [ "$killed" -eq 1 ]; then
    log "bot_conflict_cleared pids=${pids}"
    write_incident "openclaw" "bot_conflict" "terminate_conflict" "recovered" "terminated conflicting bot.py process(es)" "0"
  else
    log "bot_conflict_clear_failed pids=${pids}"
    write_incident "openclaw" "bot_conflict" "terminate_conflict" "failed" "failed to terminate one or more bot.py processes" "0"
    derive_improvement_task "openclaw" "bot_conflict"
  fi
}

heal_component() {
  local component="$1"
  local initial_cause attempt

  if probe_component "$component"; then
    log "healthy component=${component}"
    return 0
  fi

  initial_cause="$LAST_PROBE_REASON"
  log "unhealthy component=${component} cause=${initial_cause}"
  write_incident "$component" "$initial_cause" "health_probe" "degraded" "initial probe failed" "0"
  derive_improvement_task "$component" "$initial_cause"

  attempt=1
  while [ "$attempt" -le "$MAX_RETRIES" ]; do
    log "restart_attempt component=${component} attempt=${attempt}/${MAX_RETRIES}"
    if ! restart_component "$component" "$attempt"; then
      return 1
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
      return 0
    fi

    if verify_component_after_restart "$component"; then
      log "recovered component=${component} attempt=${attempt}"
      write_incident "$component" "$initial_cause" "post_restart_verify" "recovered" "component healthy after restart" "$attempt"
      return 0
    fi

    log "post_restart_verify_failed component=${component} attempt=${attempt} cause=${LAST_PROBE_REASON}"
    write_incident "$component" "$LAST_PROBE_REASON" "post_restart_verify" "failed" "component still unhealthy after restart" "$attempt"
    derive_improvement_task "$component" "$LAST_PROBE_REASON"

    attempt=$((attempt + 1))
    if [ "$attempt" -le "$MAX_RETRIES" ]; then
      backoff_sleep $((attempt - 1))
    fi
  done

  escalate_failure "$component" "$LAST_PROBE_REASON" "Exhausted retries (${MAX_RETRIES})."
  return 1
}

acquire_lock
log "supervisor_start"

if [ "$COMPONENT" = "openclaw" ] || [ "$COMPONENT" = "both" ]; then
  clear_openclaw_bot_conflict
fi

EXIT_CODE=0
if [ "$COMPONENT" = "both" ]; then
  heal_component "hermes" || EXIT_CODE=1
  heal_component "openclaw" || EXIT_CODE=1
else
  heal_component "$COMPONENT" || EXIT_CODE=1
fi

log "supervisor_done exit_code=${EXIT_CODE}"
exit "$EXIT_CODE"
