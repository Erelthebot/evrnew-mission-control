#!/bin/bash
# log-rotate.sh - Weekly log rotation
LOG_DIR="$HOME/evrnew-marketing/logs"
TS=$(date '+%Y-%m-%d_%H%M%S')

# Rotate logs larger than 10MB
find "$LOG_DIR" -name "*.log" -size +10M | while read f; do
  mv "$f" "${f%.log}-${TS}.log.bak"
  touch "$f"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Rotated: $f" >> "$LOG_DIR/maintenance.log"
done

# Clean archives older than 30 days
find "$LOG_DIR" -name "*.log.bak" -mtime +30 -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Log rotation complete" >> "$LOG_DIR/maintenance.log"
