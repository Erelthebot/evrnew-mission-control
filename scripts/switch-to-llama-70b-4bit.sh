#!/bin/bash
# Start or verify MLX mlx_lm.server with Llama-3.3-70B-Instruct-4bit on port 52416.
# Replaces scripts/switch-to-qwen3-72b.sh (Qwen3-72B / LlamaCPP :11434 deprecated).

set -euo pipefail

MLX_PORT=52416
MODEL="Llama-3.3-70B-Instruct-4bit"
LOG="$HOME/evrnew-marketing/logs/model-switch.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "Checking MLX overflow LLM ($MODEL on :$MLX_PORT)..."

if curl -sf "http://127.0.0.1:${MLX_PORT}/v1/models" >/dev/null 2>&1; then
  log "SUCCESS — MLX server already healthy on :$MLX_PORT"
  exit 0
fi

log "MLX not responding — restart via LaunchAgent com.evrnew.mlx-server (manual):"
log "  sudo launchctl kickstart -k system/com.evrnew.mlx-server"
log "Cluster proxy should listen on :52415 once master (:52416) is up."

exit 1
