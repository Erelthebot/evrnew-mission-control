#!/bin/bash
# health-check.sh - Runs every 15 min via cron
LOG="$HOME/evrnew-marketing/logs/health.log"
TS=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TS] Health check starting" >> "$LOG"

# Check disk space
DISK=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
[ "$DISK" -gt 85 ] && echo "[$TS] WARN: Disk usage ${DISK}%" >> "$LOG"

# Check RAM
RAM_USED=$(vm_stat | awk '/Pages active/ {active=$3} /Pages wired/ {wired=$4} END {printf "%.0f", (active+wired)*4096/1073741824}')
echo "[$TS] RAM in use: ~${RAM_USED}GB" >> "$LOG"

# Check OpenClaw gateway
pgrep -f "openclaw.*gateway" > /dev/null && echo "[$TS] OpenClaw: running" >> "$LOG" || {
  echo "[$TS] WARN: OpenClaw gateway down, restarting..." >> "$LOG"
  launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway >> "$LOG" 2>&1
}

# Check Ollama
pgrep -f "ollama" > /dev/null && echo "[$TS] Ollama: running" >> "$LOG" || echo "[$TS] INFO: Ollama not running (on-demand is OK)" >> "$LOG"

# Check inbox monitor
pgrep -f "erel_inbox_monitor" > /dev/null && echo "[$TS] Inbox monitor: running" >> "$LOG" || {
  echo "[$TS] WARN: Inbox monitor down, restarting..." >> "$LOG"
  launchctl kickstart -k gui/$(id -u)/com.evrnew.erel-inbox >> "$LOG" 2>&1
}

echo "[$TS] Health check complete" >> "$LOG"
