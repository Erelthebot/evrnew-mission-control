#!/bin/bash
# Critical Systems Audit - Runs every 2 minutes
# Auto-fixes EVERYTHING without asking

LOG="/tmp/critical-audit.log"
TELEGRAM_CHAT="-5294204937"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }
alert() { curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" -d "chat_id=${TELEGRAM_CHAT}" -d "text=🚨 $*" > /dev/null 2>&1; }

# 1. Next.js Mission Control (port 3003)
if ! curl -sf http://localhost:3003/api/gateway-health > /dev/null 2>&1; then
  log "FIXING: Next.js down"
  pkill -9 -f next
  cd /Users/erel_master/evrnew-marketing/sites/openclaw-site && nohup npm run dev > /tmp/next.log 2>&1 &
  sleep 8
  curl -sf http://localhost:3003/api/gateway-health > /dev/null 2>&1 && log "FIXED: Next.js" || alert "Next.js FAILED to restart"
fi

# 2. Ollama LLM
if ! curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
  log "FIXING: Ollama down"
  pkill -9 ollama
  nohup ollama serve > /tmp/ollama.log 2>&1 &
  sleep 5
  curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1 && log "FIXED: Ollama" || alert "Ollama FAILED - check GPU"
fi

# 3. Gateway
if ! curl -sf http://127.0.0.1:18789/ > /dev/null 2>&1; then
  log "FIXING: Gateway down"
  openclaw gateway restart > /tmp/gateway-restart.log 2>&1
  sleep 3
  curl -sf http://127.0.0.1:18789/ > /dev/null 2>&1 && log "FIXED: Gateway" || alert "Gateway FAILED to restart"
fi

# 4. Memory check
MEM_USED=$(vm_stat | awk '/Pages active/ {a=$3} /Pages wired/ {w=$3} END {print int((a+w)*4096/1073741824)}')
if [ "$MEM_USED" -gt 45 ]; then
  alert "Memory critical: ${MEM_USED}GB/48GB"
fi

# 5. Disk cleanup
DISK_PCT=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_PCT" -gt 85 ]; then
  log "FIXING: Disk at ${DISK_PCT}%"
  find /tmp -type f -mtime +3 -delete 2>/dev/null
  find ~/Library/Caches -type f -mtime +7 -delete 2>/dev/null
  npm cache clean --force > /dev/null 2>&1
  [ "$DISK_PCT" -gt 90 ] && alert "Disk critical: ${DISK_PCT}%"
fi

# 6. Integration health
BUFFER=$(curl -sf http://localhost:3003/api/integrations 2>/dev/null | jq -r '.services[]|select(.key=="buffer")|.status')
[ "$BUFFER" != "ok" ] && log "WARN: Buffer status=$BUFFER"

DFS=$(curl -sf http://localhost:3003/api/integrations 2>/dev/null | jq -r '.services[]|select(.key=="dataforseo")|.status')
[ "$DFS" != "ok" ] && log "WARN: DataForSEO status=$DFS"

# 7. Cloudflare Tunnel
if ! pgrep -f "cloudflared tunnel" > /dev/null; then
  log "FIXING: Cloudflare tunnel down"
  pkill -9 cloudflared
  cloudflared tunnel --config /Users/erel_master/.cloudflared/config.yml run > /tmp/cloudflared.log 2>&1 &
  sleep 5
  pgrep -f "cloudflared tunnel" > /dev/null && log "FIXED: Cloudflare tunnel" || alert "Cloudflare tunnel FAILED"
fi

# 8. erel.evrnew.com public access
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://erel.evrnew.com 2>/dev/null)
if [ "$HTTP_CODE" != "200" ]; then
  log "WARN: erel.evrnew.com returns $HTTP_CODE"
fi

# Log rotation
[ -f "$LOG" ] && [ $(stat -f%z "$LOG" 2>/dev/null || echo 0) -gt 2097152 ] && mv "$LOG" "${LOG}.old"
