#!/bin/bash
LOG="$HOME/evrnew-marketing/logs/maintenance.log"
TARGET="${1:-all}"

restart_inbox() {
  launchctl kickstart -k "gui/$(id -u)/com.evrnew.erel-inbox" 2>/dev/null || \
    (pkill -f erel_inbox_monitor 2>/dev/null; sleep 1; nohup python3 ~/evrnew-marketing/agents/email-inbox/erel_inbox_monitor.py &)
  echo "$(date): Inbox monitor restarted" >> "$LOG"
}

restart_ollama() {
  brew services restart ollama 2>/dev/null
  echo "$(date): Ollama restarted" >> "$LOG"
}

restart_n8n() {
  pkill -f n8n 2>/dev/null; sleep 1
  nohup n8n start &>/dev/null &
  echo "$(date): n8n restarted" >> "$LOG"
}

case "$TARGET" in
  inbox) restart_inbox ;;
  ollama) restart_ollama ;;
  n8n) restart_n8n ;;
  all) restart_inbox; restart_ollama; restart_n8n ;;
  *) echo "Usage: $0 [all|inbox|ollama|n8n]" ;;
esac
