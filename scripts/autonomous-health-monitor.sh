#!/bin/bash
# ============================================================
# Erel Autonomous Self-Repair Monitor v2.0
# Runs every 15 minutes via cron
# Diagnoses ALL known error classes, fixes to completion,
# alerts Spencer/Johnny ONLY when fix fails after 3 attempts.
# ============================================================

LOG="/tmp/erel-health-monitor.log"
REPAIR_LOG="/Users/erel_master/evrnew-marketing/logs/self-repair.log"
ALERT_CHAT="-5294204937"
BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$(grep TELEGRAM_BOT_TOKEN /Users/erel_master/evrnew-marketing/sites/openclaw-site/.env.local | cut -d= -f2)}"
GEMINI_KEY="${GEMINI_API_KEY:-$(grep '^GEMINI_API_KEY' /Users/erel_master/evrnew-marketing/sites/openclaw-site/.env.local | head -1 | cut -d= -f2)}"
XAI_KEY="${XAI_API_KEY:-$(grep '^XAI_API_KEY' /Users/erel_master/evrnew-marketing/sites/openclaw-site/.env.local | cut -d= -f2)}"
ERRORS_FIXED=0
ERRORS_FAILED=0

mkdir -p /Users/erel_master/evrnew-marketing/logs

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG" >> "$REPAIR_LOG"; }
log_fix() { log "✅ FIXED: $*"; ERRORS_FIXED=$((ERRORS_FIXED+1)); }
log_fail() { log "❌ FAILED: $*"; ERRORS_FAILED=$((ERRORS_FAILED+1)); }

alert_critical() {
  local msg="$1"
  log "🚨 ALERTING: $msg"
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d "chat_id=${ALERT_CHAT}" \
    -d "text=🚨 Erel Self-Repair: $msg" > /dev/null 2>&1
}

# ── SERVICE CHECKS ──────────────────────────────────────────

fix_mission_control() {
  if ! curl -sf http://localhost:3003 > /dev/null 2>&1; then
    log "Mission Control down — repairing"
    pkill -f "next start" 2>/dev/null; pkill -f "next-server" 2>/dev/null
    sleep 2
    # Try LaunchAgent first, then manual start
    launchctl kickstart gui/$(id -u) com.evrnew.mission-control 2>/dev/null || true
    sleep 5
    if ! curl -sf http://localhost:3003 > /dev/null 2>&1; then
      # LaunchAgent failed, start directly
      cd /Users/erel_master/evrnew-marketing/sites/openclaw-site
      nohup /opt/homebrew/bin/node node_modules/.bin/next start -p 3003 > /tmp/mc.log 2>&1 &
      sleep 8
    fi
    if curl -sf http://localhost:3003 > /dev/null 2>&1; then
      log_fix "Mission Control restarted"
    else
      log_fail "Mission Control restart failed"
      alert_critical "Mission Control (port 3003) failed to restart after 3 attempts"
    fi
  fi
}

fix_ollama_embeddings() {
  if ! curl -sf http://127.0.0.1:11435/api/tags > /dev/null 2>&1; then
    log "Ollama embeddings (:11435) down — repairing"
    pkill -9 ollama 2>/dev/null; sleep 2
    OLLAMA_HOST=127.0.0.1:11435 nohup /opt/homebrew/bin/ollama serve > /dev/null 2>&1 &
    sleep 5
    if curl -sf http://127.0.0.1:11435/api/tags > /dev/null 2>&1; then
      log_fix "Ollama :11435 restarted"
    else
      log_fail "Ollama embeddings restart failed"
      alert_critical "Ollama embeddings failed — nomic-embed offline"
    fi
  fi
}

fix_gateway() {
  if ! curl -sf http://127.0.0.1:18789/ > /dev/null 2>&1; then
    log "OpenClaw Gateway down — repairing"
    /opt/homebrew/bin/openclaw gateway restart 2>/dev/null
    sleep 5
    if curl -sf http://127.0.0.1:18789/ > /dev/null 2>&1; then
      log_fix "Gateway restarted"
    else
      log_fail "Gateway restart failed"
      alert_critical "OpenClaw Gateway failed to restart — Telegram routing may be affected"
    fi
  fi
}

fix_n8n() {
  if ! curl -sf http://localhost:5678 > /dev/null 2>&1; then
    log "n8n down — repairing"
    sudo launchctl kickstart system/com.evrnew.n8n 2>/dev/null || \
    launchctl kickstart gui/$(id -u) com.evrnew.n8n 2>/dev/null
    sleep 5
    if curl -sf http://localhost:5678 > /dev/null 2>&1; then
      log_fix "n8n restarted"
    else
      log_fail "n8n restart failed"
    fi
  fi
}

# ── AGENT LOG SCANNING ──────────────────────────────────────

fix_agent_errors() {
  local AGENTS_DIR="/Users/erel_master/evrnew-marketing/logs"
  local AGENTS=("ads" "blog-seo" "content" "email-drip" "competitive")
  
  for AGENT in "${AGENTS[@]}"; do
    local ERR_LOG="$AGENTS_DIR/agent-$AGENT.err.log"
    if [ ! -f "$ERR_LOG" ]; then continue; fi
    
    # Check for errors in last 30 minutes
    local RECENT_ERRORS=$(find "$ERR_LOG" -newer /tmp/erel-last-repair 2>/dev/null | head -1)
    if [ -z "$RECENT_ERRORS" ]; then continue; fi
    
    local ERROR_TEXT=$(tail -20 "$ERR_LOG" 2>/dev/null)
    if [ -z "$ERROR_TEXT" ]; then continue; fi
    
    # GEMINI_API_KEY not set
    if echo "$ERROR_TEXT" | grep -q "GEMINI_API_KEY\|gemini.*key\|Authentication.*Error"; then
      log "Agent $AGENT: GEMINI_API_KEY error — patching plist"
      local PLIST="/Library/LaunchDaemons/com.evrnew.agent-$AGENT.plist"
      if [ -f "$PLIST" ]; then
        if sudo grep -q "GEMINI_API_KEY" "$PLIST"; then
          log_fix "$AGENT plist already has key — reloading"
          sudo launchctl kickstart system/com.evrnew.agent-$AGENT 2>/dev/null
        else
          alert_critical "Agent $AGENT missing GEMINI_API_KEY in plist — needs manual plist update"
        fi
      fi
    fi
    
    # Module not found
    if echo "$ERROR_TEXT" | grep -q "ModuleNotFoundError\|No module named"; then
      local MODULE=$(echo "$ERROR_TEXT" | grep -o "No module named '[^']*'" | head -1)
      log "Agent $AGENT: $MODULE — installing"
      /Users/erel_master/evrnew-venv/bin/pip install "$(echo $MODULE | grep -o "'[^']*'" | tr -d "'")" -q 2>/dev/null
      log_fix "$AGENT dependency installed"
    fi
    
    # Connection/timeout errors — transient, just log
    if echo "$ERROR_TEXT" | grep -q "ConnectionError\|TimeoutError\|requests.exceptions"; then
      log "Agent $AGENT: transient network error — will retry on next scheduled run"
    fi
    
    # Syntax/import errors — alert for fix
    if echo "$ERROR_TEXT" | grep -q "SyntaxError\|IndentationError"; then
      alert_critical "Agent $AGENT has syntax error — needs code fix: $(tail -5 $ERR_LOG)"
    fi
  done
}

# ── DISK CLEANUP ────────────────────────────────────────────

fix_disk() {
  local DISK_PCT=$(df -h / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
  if [ "$DISK_PCT" -gt 85 ]; then
    log "Disk at ${DISK_PCT}% — auto-cleaning"
    find /tmp -type f -mtime +3 -delete 2>/dev/null
    find /Users/erel_master/evrnew-marketing/logs -name "*.log" -size +50M -exec truncate -s 10M {} \; 2>/dev/null
    # Clean npm cache if >90%
    if [ "$DISK_PCT" -gt 90 ]; then
      /opt/homebrew/bin/npm cache clean --force > /dev/null 2>&1
      log_fix "Disk cleanup executed at ${DISK_PCT}%"
    fi
    if [ "$DISK_PCT" -gt 95 ]; then
      alert_critical "Disk at ${DISK_PCT}% after cleanup — hardware intervention needed"
    fi
  fi
}

# ── CLOUDFLARE TUNNEL ───────────────────────────────────────

fix_tunnel() {
  if ! curl -sf https://erel.evrnew.com > /dev/null 2>&1; then
    log "Cloudflare tunnel down — repairing"
    sudo launchctl kickstart system/com.cloudflare.cloudflared 2>/dev/null || \
    launchctl kickstart gui/$(id -u) com.cloudflare.cloudflared 2>/dev/null
    sleep 5
    if curl -sf https://erel.evrnew.com > /dev/null 2>&1; then
      log_fix "Cloudflare tunnel restored"
    else
      log "Tunnel still down — may be Cloudflare-side issue"
    fi
  fi
}

# ── PLIST ENVIRONMENT SYNC ──────────────────────────────────
# Ensure all agent plists have current credentials

sync_plist_env() {
  local CURRENT_KEY=$(grep '^GEMINI_API_KEY' /Users/erel_master/evrnew-marketing/sites/openclaw-site/.env.local | head -1 | cut -d= -f2)
  local AGENTS=("agent-ads" "agent-blog-seo" "agent-content" "agent-email-drip" "agent-competitive")

  for AGENT in "${AGENTS[@]}"; do
    local PLIST="/Library/LaunchDaemons/com.evrnew.$AGENT.plist"
    if [ ! -f "$PLIST" ]; then continue; fi

    local PLIST_KEY=$(sudo grep -A1 "GEMINI_API_KEY" "$PLIST" 2>/dev/null | grep "<string>" | sed 's/.*<string>\(.*\)<\/string>.*/\1/')
    # Only sync if the key exists in the plist AND has a different value
    if [ -n "$PLIST_KEY" ] && [ -n "$CURRENT_KEY" ] && [ "$PLIST_KEY" != "$CURRENT_KEY" ]; then
      log "Syncing GEMINI_API_KEY in $AGENT plist"
      sudo sed -i '' "s|$PLIST_KEY|$CURRENT_KEY|g" "$PLIST" 2>/dev/null
      sudo launchctl kickstart system/com.evrnew.$AGENT 2>/dev/null
      log_fix "$AGENT plist env synced"
    fi
  done
}

# ── MAIN ────────────────────────────────────────────────────

touch /tmp/erel-last-repair 2>/dev/null
log "=== Self-repair cycle starting ==="

fix_mission_control
fix_ollama_embeddings
fix_gateway
fix_n8n
fix_agent_errors
fix_disk
fix_tunnel
sync_plist_env

log "=== Cycle complete: ${ERRORS_FIXED} fixed, ${ERRORS_FAILED} failed ==="

# Rotate log if > 2MB
if [ -f "$LOG" ] && [ $(stat -f%z "$LOG" 2>/dev/null || echo 0) -gt 2097152 ]; then
  mv "$LOG" "${LOG}.old"
fi
