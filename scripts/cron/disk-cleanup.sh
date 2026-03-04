#!/bin/bash
LOG="$HOME/evrnew-marketing/logs/maintenance.log"
echo "$(date): Disk cleanup starting" >> "$LOG"
brew cleanup --prune=7 2>/dev/null
echo "$(date): Homebrew cache cleaned" >> "$LOG"
source ~/evrnew-venv/bin/activate && pip cache purge 2>/dev/null
echo "$(date): pip cache purged" >> "$LOG"
npm cache clean --force 2>/dev/null
echo "$(date): npm cache cleaned" >> "$LOG"
DISK_FREE=$(df -h / | tail -1 | awk '{print $4}')
echo "$(date): Disk cleanup complete. Free space: $DISK_FREE" >> "$LOG"
