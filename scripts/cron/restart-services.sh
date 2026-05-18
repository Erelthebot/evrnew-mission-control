#!/bin/bash
# restart-services.sh [all|inbox|llama-server|n8n|openclaw]
SERVICE="${1:-all}"
LOG="$HOME/evrnew-marketing/logs/maintenance.log"
TS=$(date '+%Y-%m-%d %H:%M:%S')

restart_inbox() {
  echo "[$TS] Restarting inbox monitor..." >> "$LOG"
  launchctl kickstart -k gui/$(id -u)/com.evrnew.erel-inbox >> "$LOG" 2>&1
}

restart_openclaw() {
  echo "[$TS] Restarting OpenClaw gateway..." >> "$LOG"
  launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway >> "$LOG" 2>&1
}

restart_llama_server() {
  echo "[$TS] Restarting llama-server..." >> "$LOG"
  sudo launchctl kickstart -k system/com.evrnew.llama-server >> "$LOG" 2>&1
}

restart_n8n() {
  echo "[$TS] Restarting n8n..." >> "$LOG"
  pkill -f "n8n" 2>/dev/null; sleep 2
  nohup n8n start >> "$LOG" 2>&1 &
}

case "$SERVICE" in
  all)          restart_inbox; restart_openclaw; restart_llama_server; restart_n8n ;;
  inbox)        restart_inbox ;;
  openclaw)     restart_openclaw ;;
  llama-server) restart_llama_server ;;
  n8n)          restart_n8n ;;
  *)            echo "Usage: $0 [all|inbox|openclaw|llama-server|n8n]" ;;
esac
echo "[$TS] Service restart complete: $SERVICE" >> "$LOG"
