#!/bin/bash
# Auto-verifies all services in infrastructure.md and updates last-verified dates.
# Run nightly via cron. Updates dates only for services that respond.

INFRA="$HOME/evrnew-marketing/memory/infrastructure.md"
DATE=$(date "+%Y-%m-%d")
LOG="$HOME/evrnew-marketing/logs/verify-services.log"
ISSUES="$HOME/evrnew-marketing/memory/issues.md"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG"; }

check_port() {
  local name="$1" port="$2"
  if nc -z -w2 127.0.0.1 "$port" 2>/dev/null; then
    log "OK  $name (:$port)"
    return 0
  else
    log "DOWN $name (:$port)"
    return 1
  fi
}

check_http() {
  local name="$1" url="$2"
  local code
  code=$(curl -sk --connect-timeout 3 -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  if [[ "$code" == "200" || "$code" == "301" || "$code" == "302" ]]; then
    log "OK  $name ($url → $code)"
    return 0
  else
    log "DOWN $name ($url → $code)"
    return 1
  fi
}

log "=== Service verification: $DATE ==="

# Check each service and update last-verified in infrastructure.md if healthy
update_verified() {
  local section="$1"
  sed -i '' "s/\(\*\*last-verified:\*\* \)[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\(.*# ${section}\)/\1${DATE}\2/" "$INFRA" 2>/dev/null || true
  # Alternative: sed without lookahead — find section and update line after it
  python3 - "$INFRA" "$section" "$DATE" <<'PYEOF'
import sys, re
path, section, date = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f: content = f.read()
# Replace last-verified date in the block that follows the section header
pattern = r'(## ' + re.escape(section) + r'\n\*\*last-verified:\*\* )\d{4}-\d{2}-\d{2}'
new = re.sub(pattern, r'\g<1>' + date, content)
with open(path, 'w') as f: f.write(new)
PYEOF
}

# Mission Control
check_http "Mission Control" "http://localhost:3003/" && update_verified "Mission Control"

# OpenClaw Gateway
check_port "OpenClaw Gateway" 18789 && update_verified "OpenClaw Gateway"

# OpenClaw Browser Relay
check_port "OpenClaw Browser Relay" 18792 && update_verified "OpenClaw Browser Relay"

# Ollama
check_http "Ollama embeddings" "http://localhost:11435/" && update_verified "Ollama embeddings (:11435)"
check_http "MLX overflow" "http://localhost:52416/health" && update_verified "MLX Llama-70B-4bit"
check_http "Holo3" "http://localhost:8080/health" && update_verified "Holo3 vision (:8080)"

# n8n
check_port "n8n" 5678 && update_verified "n8n"

# Cloudflare Tunnel (check local metrics endpoint)
check_http "Cloudflare Tunnel" "http://127.0.0.1:20241/metrics" && update_verified "Cloudflare Tunnel"

log "=== Done ==="
