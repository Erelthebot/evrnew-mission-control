#!/bin/bash
# health-check.sh - Runs every 15 min via cron
# Silent unless errors — 2026-03-30
LOG="$HOME/evrnew-marketing/logs/health.log"
TS=$(date '+%Y-%m-%d %H:%M:%S')

# Check disk space
DISK=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
[ "$DISK" -gt 85 ] && echo "[$TS] WARN: Disk usage ${DISK}%" >> "$LOG"

# Check OpenClaw gateway
pgrep -f "openclaw.*gateway" > /dev/null || {
  echo "[$TS] ERROR: OpenClaw gateway down, restarting..." >> "$LOG"
  launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway >> "$LOG" 2>&1
}

# Check inbox monitor
pgrep -f "erel_inbox_monitor" > /dev/null || {
  echo "[$TS] ERROR: Inbox monitor down, restarting..." >> "$LOG"
  launchctl kickstart -k gui/$(id -u)/com.evrnew.erel-inbox >> "$LOG" 2>&1
}

# Check llama-server (port 8080, Holo3-35B-A3B vision/GUI)
LLAMA_HEALTH=$(curl -sf http://127.0.0.1:8080/health 2>/dev/null)
if ! echo "$LLAMA_HEALTH" | grep -q '"status":"ok"'; then
  RESTART_COUNT_FILE="/tmp/llama-server-restart-count"
  COUNT=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo 0)
  COUNT=$((COUNT + 1))
  echo "$COUNT" > "$RESTART_COUNT_FILE"
  if [ "$COUNT" -ge 3 ]; then
    echo "[$TS] CRITICAL: llama-server down after 3 attempts — routing to xAI fallback. Alert in 05:00 digest." >> "$LOG"
    rm -f "$RESTART_COUNT_FILE"
  else
    echo "[$TS] ERROR: llama-server unhealthy (attempt $COUNT/3), restarting..." >> "$LOG"
    sudo launchctl kickstart -k system/com.evrnew.llama-server >> "$LOG" 2>&1
  fi
else
  rm -f /tmp/llama-server-restart-count 2>/dev/null
fi
