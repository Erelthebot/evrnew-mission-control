#!/opt/homebrew/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# llm_daily_bench.sh  —  Daily best-model selector for M5 Pro 48GB
# Tests: MLX overflow (:52416) + Ollama embeddings (:11435) + Holo3 (:8080)
# Scores: tok/s (40%), TTFT (30%), RAM headroom (30%)
# Usage:  ./llm_daily_bench.sh [--node <hostname>]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Argument parsing ──────────────────────────────────────────────────────────
NODE="localhost"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --node) NODE="$2"; shift 2 ;;
    *)      echo "Unknown arg: $1"; exit 1 ;;
  esac
done

MLX_URL="http://${NODE}:52416"
HOLO_URL="http://${NODE}:8080"
OLLAMA_URL="http://${NODE}:11435"
TOTAL_RAM_GB=48
LOG_DIR="${HOME}/.llm_bench"
LOG_FILE="${LOG_DIR}/bench_$(date +%Y%m%d_%H%M%S).jsonl"
REPORT_FILE="${LOG_DIR}/latest_report.txt"

mkdir -p "$LOG_DIR"

# ── Benchmark prompts (short/medium/long context) ────────────────────────────
PROMPTS=(
  "List 5 marketing campaign KPIs in JSON."
  "Write a 200-word executive summary for a Q2 digital ad performance report showing 18% CTR improvement."
  "You are a senior marketing strategist. A DTC brand spent \$120k on Google Ads last quarter with a 3.2x ROAS. Paid social returned 2.1x ROAS but drove 40% of new customer acquisition. Draft a reallocation recommendation with projected outcomes for Q3, including channel mix, budget splits, and risk factors."
)

declare -A SCORES
declare -A RESULTS

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { echo "[$(date +%H:%M:%S)] $*"; }
warn() { echo "[WARN] $*" >&2; }

get_ram_used_gb() {
  ps aux | awk '/llama|ollama/ && !/awk/ {sum += $6} END {printf "%.1f", sum/1024/1024}'
}

# ── Discover models ───────────────────────────────────────────────────────────
discover_mlx() {
  curl -sf --max-time 3 "${MLX_URL}/v1/models" 2>/dev/null \
    | python3 -c "import sys,json; [print('mlx:'+m['id']) for m in json.load(sys.stdin).get('data',[])]" \
    2>/dev/null || true
}

discover_ollama() {
  curl -sf --max-time 3 "${OLLAMA_URL}/api/tags" 2>/dev/null \
    | python3 -c "import sys,json; [print('ollama:'+m['name']) for m in json.load(sys.stdin).get('models',[])]" \
    2>/dev/null || true
}

# ── Single model benchmark ────────────────────────────────────────────────────
bench_model() {
  local backend_model="$1"
  local backend="${backend_model%%:*}"
  local model="${backend_model#*:}"
  local total_tps=0 total_ttft=0 runs=0

  log "  Testing: ${backend_model}"

  for prompt in "${PROMPTS[@]}"; do
    local response tps ttft tokens

    if [[ "$backend" == "mlx" ]]; then
      local start end elapsed
      start=$(python3 -c 'import time; print(time.time())')
      response=$(curl -sf --max-time 120 \
        -X POST "${MLX_URL}/v1/chat/completions" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"${model}\",\"messages\":[{\"role\":\"user\",\"content\":$(echo "$prompt" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))')}],\"max_tokens\":256,\"temperature\":0.3}" \
        2>/dev/null) || { warn "mlx timeout on ${model}"; continue; }
      end=$(python3 -c 'import time; print(time.time())')
      elapsed=$(python3 -c "print(round(${end}-${start},3))")
      tokens=$(echo "$response" | python3 -c \
        "import sys,json; d=json.load(sys.stdin); print(len(d['choices'][0]['message']['content'].split()))" 2>/dev/null || echo 1)
      tps=$(python3 -c "print(round(${tokens}/max(${elapsed},0.001),1))")
      ttft=$elapsed

    elif [[ "$backend" == "ollama" ]]; then
      response=$(curl -sf --max-time 60 \
        -X POST "${OLLAMA_URL}/api/generate" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"${model}\",\"prompt\":$(echo "$prompt" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))'),\"stream\":false,\"options\":{\"num_predict\":256,\"temperature\":0.3}}" \
        2>/dev/null) || { warn "ollama timeout on ${model}"; continue; }

      # eval_count / eval_duration = real tok/s
      # load_duration + prompt_eval_duration = true TTFT
      tps=$(echo "$response" | python3 -c \
        "import sys,json; d=json.load(sys.stdin)
ec=d.get('eval_count',0); ed=d.get('eval_duration',1)
print(round(ec/(ed/1e9),1) if ec and ed else 0)" 2>/dev/null || echo 0)
      ttft=$(echo "$response" | python3 -c \
        "import sys,json; d=json.load(sys.stdin)
ns=d.get('load_duration',0)+d.get('prompt_eval_duration',0)
print(round(ns/1e9,3))" 2>/dev/null || echo 0)
    fi

    total_tps=$(echo "$total_tps + $tps" | bc)
    total_ttft=$(echo "$total_ttft + $ttft" | bc)
    ((runs++)) || true
  done

  [[ $runs -eq 0 ]] && { warn "No successful runs for ${backend_model}"; return; }

  local avg_tps avg_ttft ram_used ram_headroom
  avg_tps=$(echo "scale=1; $total_tps / $runs" | bc)
  avg_ttft=$(echo "scale=3; $total_ttft / $runs" | bc)
  ram_used=$(get_ram_used_gb)
  ram_headroom=$(echo "scale=1; $TOTAL_RAM_GB - $ram_used" | bc)

  # ── Scoring (0–100 each axis) ──────────────────────────────────────────────
  # tok/s:     40% weight  — cap ref at 120 tok/s (M5 Pro realistic ceiling)
  # TTFT:      30% weight  — 0.5s = 100, 10s = 0
  # RAM head:  30% weight  — 16GB headroom = 100
  local s_tps s_ttft s_ram score
  s_tps=$(python3 -c "print(min(100, round(float('$avg_tps')/120*100)))")
  s_ttft=$(python3 -c "
t=float('$avg_ttft')
score = max(0, min(100, round((1 - (t-0.5)/9.5)*100))) if t > 0.5 else 100
print(score)")
  s_ram=$(python3 -c "print(min(100, round(float('$ram_headroom')/16*100)))")
  score=$(python3 -c "print(round(0.4*$s_tps + 0.3*$s_ttft + 0.3*$s_ram))")

  SCORES["$backend_model"]=$score
  RESULTS["$backend_model"]="tps=${avg_tps} ttft=${avg_ttft}s ram_free=${ram_headroom}GB score=${score}"

  printf '{"ts":"%s","model":"%s","backend":"%s","avg_tps":%s,"avg_ttft_s":%s,"ram_free_gb":%s,"score":%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$model" "$backend" \
    "$avg_tps" "$avg_ttft" "$ram_headroom" "$score" >> "$LOG_FILE"
}

# ── Main ──────────────────────────────────────────────────────────────────────
log "═══════════════════════════════════════════════════"
log "  LLM Daily Bench  —  Node: ${NODE}  —  $(date '+%Y-%m-%d')"
log "═══════════════════════════════════════════════════"

mapfile -t MODELS < <({ discover_mlx; discover_ollama; } | sort -u)

if [[ ${#MODELS[@]} -eq 0 ]]; then
  log "No models found on ${NODE}. Check backends are running."
  exit 1
fi

log "Found ${#MODELS[@]} model(s): ${MODELS[*]}"
echo

for m in "${MODELS[@]}"; do
  bench_model "$m"
done

# ── Ranked report ─────────────────────────────────────────────────────────────
{
  echo "═══════════════════════════════════════════════════"
  echo "  DAILY LLM BENCHMARK REPORT  —  $(date '+%Y-%m-%d %H:%M')"
  echo "  Node: ${NODE}  |  Chip: M5 Pro  |  RAM: ${TOTAL_RAM_GB}GB"
  echo "  Scoring: tok/s 40% + TTFT 30% + RAM headroom 30%"
  echo "═══════════════════════════════════════════════════"
  echo

  IFS=$'\n' read -r -d '' -a SORTED < <(
    for k in "${!SCORES[@]}"; do
      echo "${SCORES[$k]} $k"
    done | sort -rn
    printf '\0'
  ) || true

  rank=1
  best_model=""
  for entry in "${SORTED[@]}"; do
    score="${entry%% *}"
    model="${entry#* }"
    detail="${RESULTS[$model]}"
    prefix="  ${rank}."
    [[ $rank -eq 1 ]] && { prefix="★ 1."; best_model="$model"; }
    printf "%-6s %-40s  %s\n" "$prefix" "$model" "$detail"
    ((rank++)) || true
  done

  echo
  echo "  RECOMMENDATION:  ${best_model}"
  echo "═══════════════════════════════════════════════════"
} | tee "$REPORT_FILE"

log "Log: ${LOG_FILE}"
log "Report: ${REPORT_FILE}"
