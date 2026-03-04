#!/bin/bash
LOG_DIR="$HOME/evrnew-marketing/logs"
ARCHIVE_DIR="$LOG_DIR/archive"
mkdir -p "$ARCHIVE_DIR"
TIMESTAMP=$(date +%Y%m%d)
for logfile in "$LOG_DIR"/*.log; do
  [ -f "$logfile" ] || continue
  BASENAME=$(basename "$logfile")
  if [ $(stat -f%z "$logfile" 2>/dev/null || echo 0) -gt 10485760 ]; then
    mv "$logfile" "$ARCHIVE_DIR/${BASENAME%.log}-$TIMESTAMP.log"
    touch "$logfile"
    echo "$(date): Rotated $BASENAME (>10MB)" >> "$LOG_DIR/maintenance.log"
  fi
done
find "$ARCHIVE_DIR" -name "*.log" -mtime +30 -delete 2>/dev/null
echo "$(date): Log rotation complete" >> "$LOG_DIR/maintenance.log"
