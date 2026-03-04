#!/bin/bash
LOG="$HOME/evrnew-marketing/logs/health.log"
ALERT=0

check_service() {
  local name="$1" cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo "$(date) [OK]   $name" >> "$LOG"
  else
    echo "$(date) [FAIL] $name" >> "$LOG"
    ALERT=1
  fi
}

echo "" >> "$LOG"
echo "$(date) ---- HEALTH CHECK START ----" >> "$LOG"
check_service "Internet connectivity" "ping -c1 -W3 8.8.8.8"
check_service "DNS resolution" "host google.com"
check_service "Anthropic API reachable" "curl -sf --max-time 5 https://api.anthropic.com/ -o /dev/null"
check_service "xAI API reachable" "curl -sf --max-time 5 https://api.x.ai/ -o /dev/null"
check_service "Ollama running" "curl -sf --max-time 3 http://localhost:11434/api/tags -o /dev/null"
check_service "n8n running" "curl -sf --max-time 3 http://localhost:5678/ -o /dev/null"
check_service "Erel inbox monitor" "pgrep -f erel_inbox_monitor"
check_service "Disk space >10GB free" "[ $(df -g / | tail -1 | awk '{print \$4}') -gt 10 ]"
echo "$(date) ---- HEALTH CHECK END (alerts: $ALERT) ----" >> "$LOG"
[ $ALERT -eq 1 ] && echo "$(date) *** ATTENTION: One or more services need attention ***" >> "$LOG"
