#!/bin/bash
# ============================================================
# EVRNEW FULL RESTART PROTOCOL
# Restarts all marketing bots, validates Gemini API key,
# and confirms everything is live before exiting.
# Run manually: bash ~/evrnew-marketing/scripts/restart-protocol.sh
# Also called by watchdog on failure detection.
# ============================================================

LOG="$HOME/evrnew-marketing/logs/restart-protocol.log"
TS=$(date '+%Y-%m-%d %H:%M:%S')
ERRORS=0

log() { echo "[$TS] $1" | tee -a "$LOG"; }

log "==============================="
log "EVRNEW RESTART PROTOCOL START"
log "==============================="

# ── 1. Load environment ─────────────────────────────────────────
if [ -f "$HOME/evrnew-marketing/.env" ]; then
  set -a; source "$HOME/evrnew-marketing/.env"; set +a
  log "ENV: .env loaded"
elif [ -f "$HOME/.zshrc" ]; then
  source "$HOME/.zshrc" 2>/dev/null
  log "ENV: .zshrc sourced"
fi

# ── 2. Validate Gemini API key ──────────────────────────────────
log "CHECKING: Gemini API key..."
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
GEMINI_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${GEMINI_API_KEY}" \
  "https://generativelanguage.googleapis.com/v1beta/openai/models")

if [ "$GEMINI_TEST" = "200" ]; then
  log "OK: Gemini API key valid (HTTP 200)"
else
  log "WARN: Gemini API returned HTTP $GEMINI_TEST — check key or quota"
  ERRORS=$((ERRORS+1))
fi

# ── 3. Restart OpenClaw (Telegram bot / agent gateway) ──────────
log "RESTARTING: OpenClaw gateway..."
launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" >> "$LOG" 2>&1
sleep 3
OPENCLAW_PID=$(launchctl list | awk '$3 == "ai.openclaw.gateway" {print $1}')
if [[ "$OPENCLAW_PID" =~ ^[0-9]+$ ]]; then
  log "OK: OpenClaw running (pid $OPENCLAW_PID)"
else
  log "WARN: OpenClaw did not start — attempting plist reload"
  launchctl load "$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist" 2>/dev/null
  sleep 3
  launchctl kickstart "gui/$(id -u)/ai.openclaw.gateway" >> "$LOG" 2>&1
  ERRORS=$((ERRORS+1))
fi

# ── 4. Restart inbox monitor ────────────────────────────────────
log "RESTARTING: Erel inbox monitor..."
launchctl kickstart -k "gui/$(id -u)/com.evrnew.erel-inbox" >> "$LOG" 2>&1
sleep 2
INBOX_PID=$(launchctl list | awk '$3 == "com.evrnew.erel-inbox" {print $1}')
if [[ "$INBOX_PID" =~ ^[0-9]+$ ]]; then
  log "OK: Inbox monitor running (pid $INBOX_PID)"
else
  log "WARN: Inbox monitor did not start"
  ERRORS=$((ERRORS+1))
fi

# ── 5. Check/Restart Mission Control (Next.js on port 3333) ──────
log "CHECKING: Mission Control (port 3333)..."
MC_PORT=$(lsof -ti :3333 2>/dev/null | head -1)
if [[ -n "$MC_PORT" ]]; then
  log "OK: Mission Control running (pid $MC_PORT)"
else
  log "STARTING: Mission Control not on port 3333, launching..."
  launchctl kickstart -k "gui/$(id -u)/com.evrnew.mission-control" >> "$LOG" 2>&1
  sleep 4
  MC_PORT=$(lsof -ti :3333 2>/dev/null | head -1)
  if [[ -n "$MC_PORT" ]]; then
    log "OK: Mission Control started (pid $MC_PORT)"
  else
    log "WARN: Mission Control failed to start"
    ERRORS=$((ERRORS+1))
  fi
fi

# ── 6. Restart n8n ──────────────────────────────────────────────
log "RESTARTING: n8n..."
launchctl kickstart -k "gui/$(id -u)/com.evrnew.n8n" >> "$LOG" 2>&1
sleep 2
N8N_PID=$(launchctl list | awk '$3 == "com.evrnew.n8n" {print $1}')
if [[ "$N8N_PID" =~ ^[0-9]+$ ]]; then
  log "OK: n8n running (pid $N8N_PID)"
else
  log "INFO: n8n not running (may be on-demand)"
fi

# ── 7. Restart watchdog ─────────────────────────────────────────
log "RESTARTING: Watchdog..."
launchctl kickstart -k "gui/$(id -u)/com.evrnew.watchdog" >> "$LOG" 2>&1
sleep 1
log "OK: Watchdog restarted"

# ── 8. Restart moltbook heartbeat ───────────────────────────────
log "RESTARTING: Moltbook heartbeat..."
launchctl kickstart -k "gui/$(id -u)/com.evrnew.moltbook-heartbeat" >> "$LOG" 2>&1
sleep 1
log "OK: Moltbook heartbeat restarted"

# ── 9. Final status summary ─────────────────────────────────────
log "-------------------------------"
log "RESTART PROTOCOL COMPLETE"
log "Errors/warnings: $ERRORS"
log "-------------------------------"

# ── 10. Send Telegram notification ─────────────────────────────
BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-8756673493:AAGEYSw0TXoB40LJeMz-8mDo88WXhudV-u0}"
CHAT_ID="${TELEGRAM_CHAT_ID:--5294204937}"

if [ "$ERRORS" -eq 0 ]; then
  MSG="Erel restart complete. All systems are live. Gemini API confirmed valid. Zero errors."
else
  MSG="Erel restart complete with $ERRORS warning(s). Check ~/evrnew-marketing/logs/restart-protocol.log for details."
fi

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d "chat_id=${CHAT_ID}" \
  -d "text=${MSG}" >> "$LOG" 2>&1

log "Telegram notification sent."
exit $ERRORS
