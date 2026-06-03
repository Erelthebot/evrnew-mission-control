# Hermes/OpenClaw Reliability Runbook

## Purpose

Provide one coordinated reliability flow for Hermes and OpenClaw while preserving existing cron and launchd wiring.

## Canonical Supervisor

- Script: `scripts/hermes-openclaw-supervisor.sh`
- Existing cron entrypoints now delegate to this script:
  - `scripts/autoheal-hermes.sh`
  - `scripts/autoheal-openclaw.sh`
- High-frequency audit scripts now delegate OpenClaw recovery through this supervisor:
  - `scripts/autonomous-health-monitor.sh`
  - `scripts/critical-systems-audit.sh`

## Reliability Controls

- Deterministic probes:
  - Hermes: `launchctl print gui/<uid>/ai.hermes.gateway` state + live PID
  - OpenClaw: `launchctl print system/ai.openclaw.gateway` state + `/health` JSON probe
- Bounded retries: `MAX_RETRIES` (default `3`)
- Backoff with jitter: exponential from `BASE_DELAY_SECONDS` plus `MAX_JITTER_SECONDS`
- Verification gate: `POST_RESTART_PROBES` checks after each restart
- Restart storm guard:
  - `MAX_RESTARTS_PER_WINDOW` in `RESTART_WINDOW_SECONDS`
  - Cooldown suppression for `COOLDOWN_SECONDS`
- Idempotency:
  - lock directory: `logs/reliability/.supervisor.lock`
  - stale-lock recovery if previous pid is not alive

## Incident + Improvement Loop

- Incident stream (NDJSON): `logs/reliability/incidents.ndjson`
- Escalations: `logs/reliability/escalations.log`
- Improvement task stream (NDJSON): `logs/reliability/improvement-tasks.ndjson`
- Task derivation rule:
  - if same `component:cause` appears `>=3` times in 24h without recovery, add an open improvement task suggestion

## Operations

Run normal health pass (coordinated):

```bash
./scripts/hermes-openclaw-supervisor.sh --component both --source manual
```

Run dry-run (no restarts, policy visibility):

```bash
./scripts/hermes-openclaw-supervisor.sh --component both --source manual-dry-run --dry-run
```

Run OpenClaw-only pass:

```bash
./scripts/hermes-openclaw-supervisor.sh --component openclaw --source manual-openclaw
```

Watch supervisor decisions:

```bash
tail -f logs/reliability/supervisor.log
```

Watch escalations only:

```bash
tail -f logs/reliability/escalations.log
```

Inspect latest incidents:

```bash
python3 - <<'PY'
import json
from pathlib import Path

path = Path("logs/reliability/incidents.ndjson")
if not path.exists():
    print("no incidents file yet")
    raise SystemExit(0)

lines = path.read_text(encoding="utf-8").strip().splitlines()[-20:]
for line in lines:
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        continue
    print(f"{data.get('timestamp')} {data.get('component')} {data.get('cause')} -> {data.get('result')}")
PY
```

## Safety Notes

- The supervisor never deletes system files or runs destructive resets.
- Secrets are not written to incident logs or supervisor logs.
- Telegram escalation is optional and only attempted when `TELEGRAM_BOT_TOKEN` is present in environment.
