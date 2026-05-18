#!/bin/bash
# update-llm-config.sh — Run this whenever the LLM stack changes.
#
# What it updates:
#   1. config/llm-config.json        — single source of truth (edit manually first)
#   2. consensus.py                  — LOCAL_URL env default
#   3. scripts/cron/health-check.sh  — llama-server health check port
#   4. CLAUDE.md                     — architecture line
#   5. inference-health/route.ts     — Holo3 port
#   6. Mission Control webpage       — rebuild + restart (Next.js)
#
# Usage:
#   # 1. Edit ~/evrnew-marketing/config/llm-config.json with new values
#   # 2. Run:
#   ./scripts/update-llm-config.sh
#
# Optional flags (override config file):
#   --local-port 8080
#   --local-model Holo3-35B-A3B.Q4_K_M.gguf
#   --skip-rebuild     (skip MC rebuild — useful for testing)

set -e
REPO="$HOME/evrnew-marketing"
CFG="$REPO/config/llm-config.json"
LOG="$REPO/logs/update-llm-config.log"
TS=$(date '+%Y-%m-%d %H:%M:%S')
SKIP_REBUILD=0

# ── Parse flags ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --local-port)   OVERRIDE_PORT="$2";  shift 2 ;;
    --local-model)  OVERRIDE_MODEL="$2"; shift 2 ;;
    --skip-rebuild) SKIP_REBUILD=1;      shift ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# ── Read config ────────────────────────────────────────────────────────────────
if [ ! -f "$CFG" ]; then
  echo "[$TS] ERROR: $CFG not found" | tee -a "$LOG"; exit 1
fi

LOCAL_PORT=$(python3 -c "import json; d=json.load(open('$CFG')); print(d['local']['port'])")
LOCAL_MODEL=$(python3 -c "import json; d=json.load(open('$CFG')); print(d['local']['model_file'])")
LOCAL_MODEL_ID=$(python3 -c "import json; d=json.load(open('$CFG')); print(d['local']['model_id'])")

# Apply overrides
[ -n "$OVERRIDE_PORT"  ] && LOCAL_PORT="$OVERRIDE_PORT"
[ -n "$OVERRIDE_MODEL" ] && LOCAL_MODEL="$OVERRIDE_MODEL"

echo "[$TS] update-llm-config: port=$LOCAL_PORT model=$LOCAL_MODEL" | tee -a "$LOG"

# ── 1. consensus.py ────────────────────────────────────────────────────────────
CONSENSUS="$REPO/consensus.py"
sed -i '' "s|LOCAL_URL.*=.*os.environ.get(\"LOCAL_URL\",.*\"http://127.0.0.1:[0-9]*\")|LOCAL_URL      = os.environ.get(\"LOCAL_URL\", \"http://127.0.0.1:${LOCAL_PORT}\")|" "$CONSENSUS"
echo "[$TS]   updated consensus.py LOCAL_URL → port $LOCAL_PORT" | tee -a "$LOG"

# ── 2. health-check.sh ─────────────────────────────────────────────────────────
HCHECK="$REPO/scripts/cron/health-check.sh"
sed -i '' "s|curl -sf http://127.0.0.1:[0-9]*/health|curl -sf http://127.0.0.1:${LOCAL_PORT}/health|" "$HCHECK"
echo "[$TS]   updated health-check.sh → port $LOCAL_PORT" | tee -a "$LOG"

# ── 3. CLAUDE.md architecture line ─────────────────────────────────────────────
CLAUDEMD="$REPO/CLAUDE.md"
# Replace the local model line (matches anything between 'via llama-server' patterns)
sed -i '' "s|.*via llama-server (local, port [0-9]*).*|- ${LOCAL_MODEL_ID} via llama-server (local, port ${LOCAL_PORT}, TurboQuant binary) as primary local model|" "$CLAUDEMD"
echo "[$TS]   updated CLAUDE.md architecture line" | tee -a "$LOG"

# ── 4. inference-health/route.ts port constant ─────────────────────────────────
ROUTE="$REPO/sites/openclaw-site/app/api/inference-health/route.ts"
sed -i '' "s|const LLAMA_URL = 'http://127.0.0.1:[0-9]*'|const LLAMA_URL = 'http://127.0.0.1:${LOCAL_PORT}'|" "$ROUTE"
echo "[$TS]   updated inference-health/route.ts LLAMA_URL → port $LOCAL_PORT" | tee -a "$LOG"

# ── 5. Update config/llm-config.json date + overrides ──────────────────────────
TODAY=$(date '+%Y-%m-%d')
python3 - <<PYEOF
import json
with open('$CFG') as f:
    d = json.load(f)
d['updated'] = '$TODAY'
if '$OVERRIDE_PORT':
    d['local']['port'] = int('$LOCAL_PORT')
if '$OVERRIDE_MODEL':
    d['local']['model_file'] = '$LOCAL_MODEL'
with open('$CFG', 'w') as f:
    json.dump(d, f, indent=2)
    f.write('\n')
PYEOF
echo "[$TS]   updated config/llm-config.json date" | tee -a "$LOG"

# ── 6. Mission Control rebuild + restart ───────────────────────────────────────
if [ "$SKIP_REBUILD" = "0" ]; then
  MC_DIR="$REPO/sites/openclaw-site"
  echo "[$TS]   building Mission Control..." | tee -a "$LOG"
  cd "$MC_DIR"
  npm run build >> "$LOG" 2>&1
  echo "[$TS]   restarting com.evrnew.mission-control..." | tee -a "$LOG"
  launchctl kickstart -k "gui/$(id -u)/com.evrnew.mission-control" >> "$LOG" 2>&1
  echo "[$TS]   Mission Control restarted" | tee -a "$LOG"
else
  echo "[$TS]   skipping MC rebuild (--skip-rebuild)" | tee -a "$LOG"
fi

echo "[$TS] Done. Verify at https://erel.evrnew.com" | tee -a "$LOG"
