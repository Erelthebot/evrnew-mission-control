#!/bin/bash
# disk-cleanup.sh - Weekly cache cleanup
LOG="$HOME/evrnew-marketing/logs/maintenance.log"
TS=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TS] Disk cleanup starting..." >> "$LOG"
brew cleanup --prune=7 >> "$LOG" 2>&1
pip3 cache purge >> "$LOG" 2>&1
npm cache clean --force >> "$LOG" 2>&1
python3 -m playwright clean-downloads >> "$LOG" 2>&1 || true
echo "[$TS] Disk cleanup complete. Free: $(df -h / | awk 'NR==2 {print $4}')" >> "$LOG"
