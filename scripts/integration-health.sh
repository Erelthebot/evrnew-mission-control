#!/bin/bash
# Integration Health Check
# Tests all external API integrations and reports status

echo "🔌 Integration Health Check"
echo "================================"
echo ""

# Load environment variables
if [ -f ~/evrnew-marketing/.env ]; then
    export $(grep -v '^#' ~/evrnew-marketing/.env | xargs)
fi

FAILURES=0
WARNINGS=0

# Function to test HTTP endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)
    
    if [ "$response" = "$expected_code" ]; then
        echo "  ✅ $name: HTTP $response"
        return 0
    elif [ "$response" -ge 200 ] && [ "$response" -lt 300 ]; then
        echo "  ⚠️  $name: HTTP $response (expected $expected_code)"
        WARNINGS=$((WARNINGS + 1))
        return 1
    else
        echo "  ❌ $name: HTTP $response (expected $expected_code)"
        FAILURES=$((FAILURES + 1))
        return 2
    fi
}

# 1. GoHighLevel API
echo "📊 GoHighLevel (GHL)"
if [ -n "$GHL_API_KEY" ]; then
    ghl_response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $GHL_API_KEY" \
        "https://services.leadconnectorhq.com/locations/$GHL_LOCATION_ID" 2>&1)
    
    if [ "$ghl_response" = "200" ]; then
        echo "  ✅ GHL API: Connected (HTTP 200)"
    elif [ "$ghl_response" = "403" ]; then
        echo "  ❌ GHL API: Authentication failed (HTTP 403)"
        FAILURES=$((FAILURES + 1))
    else
        echo "  ⚠️  GHL API: HTTP $ghl_response"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  ⚠️  GHL API: API key not configured"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 2. Telegram Bot API
echo "💬 Telegram Bot"
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    tg_response=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe")
    if echo "$tg_response" | grep -q '"ok":true'; then
        bot_username=$(echo "$tg_response" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        echo "  ✅ Telegram API: Connected (@$bot_username)"
    else
        echo "  ❌ Telegram API: Authentication failed"
        FAILURES=$((FAILURES + 1))
    fi
else
    echo "  ⚠️  Telegram API: Token not configured"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 3. Local Services
echo "🔧 Local Services"
test_endpoint "n8n" "http://localhost:5678" "200"
test_endpoint "Ollama embeddings" "http://localhost:11435" "200"
test_endpoint "MLX overflow" "http://localhost:52416/health" "200"
test_endpoint "Holo3 local" "http://localhost:8080/health" "200"
test_endpoint "Mission Control" "http://localhost:3003" "200"
test_endpoint "nginx (Docker)" "http://localhost:80" "301"
echo ""

# 4. Cloudflare Tunnel
echo "☁️  Cloudflare"
if pgrep -f cloudflared > /dev/null; then
    echo "  ✅ Cloudflared: Running"
else
    echo "  ⚠️  Cloudflared: Not running"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 5. Docker
echo "🐳 Docker"
if docker info > /dev/null 2>&1; then
    container_count=$(docker ps -q | wc -l | tr -d ' ')
    echo "  ✅ Docker: Running ($container_count containers)"
    docker ps --format "    • {{.Names}}: {{.Status}}"
else
    echo "  ❌ Docker: Not running"
    FAILURES=$((FAILURES + 1))
fi
echo ""

# 6. OpenClaw Gateway
echo "🦞 OpenClaw"
if curl -s http://localhost:18789/health > /dev/null 2>&1; then
    echo "  ✅ Gateway: Running (port 18789)"
else
    echo "  ⚠️  Gateway: Not responding on port 18789"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Summary
echo "================================"
echo "📊 Summary"
echo "  Failures: $FAILURES"
echo "  Warnings: $WARNINGS"
echo ""

if [ $FAILURES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All integrations healthy"
    exit 0
elif [ $FAILURES -eq 0 ]; then
    echo "⚠️  Some warnings detected"
    exit 1
else
    echo "❌ Integration failures detected"
    exit 2
fi
