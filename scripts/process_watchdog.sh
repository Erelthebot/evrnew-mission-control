#!/usr/bin/env bash
# Evrnew process watchdog — checks all services and restarts any that are down
# Runs every 5 minutes via com.evrnew.watchdog LaunchAgent
# On critical failure, calls full restart protocol
# Fixed: use /usr/bin/env bash (Homebrew bash 5+) for associative array support
# Fixed: Mission Control port updated to 3003 (2026-04-01)

LOG="$HOME/evrnew-marketing/logs/watchdog.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
CRITICAL_FAILURES=0

SERVICES=(
  "ai.openclaw.gateway"
  "com.evrnew.erel-inbox"
  "com.evrnew.mission-control"
  "com.evrnew.watchdog"
  "com.evrnew.moltbook-heartbeat"
)

declare -A PLIST_MAP
PLIST_MAP["ai.openclaw.gateway"]="$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist"
PLIST_MAP["com.evrnew.erel-inbox"]="$HOME/Library/LaunchAgents/com.evrnew.erel-inbox.plist"
PLIST_MAP["com.evrnew.mission-control"]="$HOME/Library/LaunchAgents/com.evrnew.mission-control.plist"
PLIST_MAP["com.evrnew.moltbook-heartbeat"]="$HOME/Library/LaunchAgents/com.evrnew.moltbook-heartbeat.plist"
PLIST_MAP["com.evrnew.n8n"]="$HOME/Library/LaunchAgents/com.evrnew.n8n.plist"

echo "[$TIMESTAMP] --- watchdog run ---" >> "$LOG"

# ── Load env ────────────────────────────────────────────────────
[ -f "$HOME/evrnew-marketing/.env" ] && { set -a; source "$HOME/evrnew-marketing/.env"; set +a; }

# ── Check Anthropic API key health ──────────────────────────────
if [ -n "$ANTHROPIC_API_KEY" ]; then
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "x-api-key: ${ANTHROPIC_API_KEY}" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{"model":"claude-haiku-4-5","max_tokens":5,"messages":[{"role":"user","content":"ping"}]}' \
    https://api.anthropic.com/v1/messages)
  if [ "$HTTP" = "200" ]; then
    echo "[$TIMESTAMP]   OK  anthropic-api (HTTP 200)" >> "$LOG"
  else
    echo "[$TIMESTAMP]  WARN anthropic-api returned HTTP $HTTP" >> "$LOG"
    CRITICAL_FAILURES=$((CRITICAL_FAILURES+1))
  fi
fi

# ── Check LaunchAgent services ──────────────────────────────────
for svc in "${SERVICES[@]}"; do
  pid=$(launchctl list | awk -v s="$svc" '$3 == s {print $1}')
  if [[ "$pid" =~ ^[0-9]+$ ]] && [[ "$pid" -gt 0 ]]; then
    echo "[$TIMESTAMP]   OK  $svc (pid $pid)" >> "$LOG"
  else
    echo "[$TIMESTAMP]  DOWN $svc — attempting recovery" >> "$LOG"
    CRITICAL_FAILURES=$((CRITICAL_FAILURES+1))
    if ! launchctl kickstart -k "gui/$(id -u)/$svc" >> "$LOG" 2>&1; then
      plist="${PLIST_MAP[$svc]}"
      if [[ -n "$plist" && -f "$plist" ]]; then
        echo "[$TIMESTAMP]  LOAD $svc — reloading plist" >> "$LOG"
        launchctl load "$plist" >> "$LOG" 2>&1
        sleep 2
        launchctl kickstart "gui/$(id -u)/$svc" >> "$LOG" 2>&1
      else
        echo "[$TIMESTAMP]  WARN $svc — no plist found" >> "$LOG"
      fi
    fi
  fi
done

# ── Tailscale ───────────────────────────────────────────────────
TAILSCALE="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
if [[ -x "$TAILSCALE" ]]; then
  TS_STATUS=$("$TAILSCALE" status 2>&1)
  if echo "$TS_STATUS" | grep -q "^100\."; then
    echo "[$TIMESTAMP]   OK  tailscale (connected)" >> "$LOG"
  else
    echo "[$TIMESTAMP]  DOWN tailscale — reconnecting" >> "$LOG"
    "$TAILSCALE" up --accept-routes >> "$LOG" 2>&1
  fi
fi

echo "[$TIMESTAMP] --- done (failures: $CRITICAL_FAILURES) ---" >> "$LOG"
