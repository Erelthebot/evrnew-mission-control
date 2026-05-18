#!/usr/bin/env bash
# Big-bang cutover to 2026-05 model stack. Run AFTER key rotation and .env is populated.
# Usage: ./scripts/cutover-model-stack-2026-05.sh

set -euo pipefail
ROOT="$HOME/evrnew-marketing"
cd "$ROOT"

echo "=== Model stack cutover (2026-05) ==="

if [ ! -f "$ROOT/.env" ]; then
  echo "ERROR: $ROOT/.env missing. Copy from .env.example and fill keys."
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ROOT/.env"
set +a

for key in XAI_API_KEY OPENROUTER_API_KEY; do
  if [ -z "${!key:-}" ]; then
    echo "ERROR: $key not set in .env"
    exit 1
  fi
done

echo "1. Propagate llm-config to runtime..."
"$ROOT/scripts/update-llm-config.sh" || true

echo "2. Restart LaunchAgents / gateway..."
launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true
launchctl kickstart -k "gui/$(id -u)/com.evrnew.erel-inbox" 2>/dev/null || true
sudo launchctl kickstart -k system/com.evrnew.llama-server 2>/dev/null || true

echo "3. Health checks..."
"$ROOT/scripts/verify-services.sh" || true
"$ROOT/scripts/check-credentials.py" || true

echo "4. Smoke: llm-router..."
"$ROOT/scripts/llm-router.sh" "Reply with exactly: stack-ok" conversational || true

echo "=== Cutover script finished. Review logs above. ==="
