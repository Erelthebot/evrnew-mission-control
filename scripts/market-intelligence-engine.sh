#!/bin/zsh
# EVRNEW MARKET INTELLIGENCE ENGINE
# Runs continuously, pulls everything, saves and analyzes religiously

LOG="$HOME/evrnew-marketing/logs/market-intel.log"
DATA="$HOME/evrnew-marketing/data/market-intelligence"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] === MARKET INTELLIGENCE SWEEP STARTED ===" >> $LOG

# Load API keys from .env only
if [ -f "$HOME/evrnew-marketing/.env" ]; then
  set -a; source "$HOME/evrnew-marketing/.env"; set +a
fi

QUERIES=(
  "insulation contractor Seattle WA"
  "insulation contractor Bellevue WA"
  "insulation contractor Everett WA"
  "insulation contractor Marysville WA"
  "insulation contractor Arlington WA"
  "insulation contractor Mount Vernon WA"
  "insulation contractor Bellingham WA"
  "insulation contractor Anacortes WA"
  "insulation contractor Kirkland WA"
  "insulation contractor Redmond WA"
  "insulation contractor Bothell WA"
  "insulation contractor Lynnwood WA"
  "insulation contractor Edmonds WA"
  "insulation contractor Shoreline WA"
  "insulation contractor Lake Stevens WA"
  "spray foam insulation Seattle"
  "blown in insulation Everett WA"
  "attic insulation cost Seattle"
  "crawl space encapsulation Snohomish County"
  "batt insulation Skagit County"
  "insulation rebates Washington State 2025"
  "energy efficient insulation King County"
  "best insulation company Snohomish County reviews"
  "insulation contractor near me Skagit County"
  "spray foam insulation cost per sqft Washington"
)

echo "[$DATE] Running ${#QUERIES[@]} market intelligence searches..." >> $LOG

for query in "${QUERIES[@]}"; do
  SAFE_NAME=$(echo "$query" | tr ' ' '_' | tr '/' '_')
  RESULT=$(curl -s "https://api.search.brave.com/res/v1/web/search?q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")&count=10&country=us&search_lang=en" \
    -H "Accept: application/json" \
    -H "Accept-Encoding: gzip" \
    -H "X-Subscription-Token: $BRAVE_API_KEY" 2>/dev/null)
  
  if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK')" 2>/dev/null; then
    echo "$RESULT" > "$DATA/competitors/${SAFE_NAME}_$(date +%Y%m%d).json"
    COUNT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('web',{}).get('results',[])))" 2>/dev/null)
    echo "[$DATE] ✓ '$query' — $COUNT results saved" >> $LOG
  else
    echo "[$DATE] ✗ '$query' — API error" >> $LOG
  fi
  sleep 0.5
done

echo "[$DATE] === SWEEP COMPLETE ===" >> $LOG
