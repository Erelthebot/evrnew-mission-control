#!/usr/bin/env bash
# Stage 2 B4 + Stage 5 routing checks (no exo, JACCL on :52415).
set -euo pipefail

REPO="${HOME}/evrnew-marketing"
PORT="${MLX_CLUSTER_PORT:-52415}"
MODEL="${CLUSTER_MODEL:-mlx-community/Llama-3.3-70B-Instruct-8bit}"
FAIL=0

pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*"; FAIL=1; }

echo "=== Stage 4 (JACCL cluster) ==="

if lsof -i ":${PORT}" 2>/dev/null | grep -qE 'mlx|Python'; then
  pass "B4.1 :${PORT} listener (mlx_lm / Python)"
else
  fail "B4.1 nothing listening on :${PORT}"
fi

if pgrep -f 'uv run.*exo|/cluster/exo.*exo|exo-explore/exo' >/dev/null 2>&1; then
  fail "B4.4 exo process running"
else
  pass "B4.4 no exo"
fi

if ping -c 1 -W 2 192.168.100.2 >/dev/null 2>&1; then
  pass "TB5 ping 192.168.100.2"
else
  fail "TB5 ping worker"
fi

MODELS_JSON="$(curl -sf -m 10 "http://127.0.0.1:${PORT}/v1/models" 2>/dev/null || true)"
if [[ -n "${MODELS_JSON}" ]] && echo "${MODELS_JSON}" | grep -q '"data"'; then
  pass "B4.2/3 GET /v1/models"
else
  fail "B4.3 /v1/models (cluster still loading? tail -f /tmp/mlx-jaccl-cluster.log)"
fi

# Avoid concurrent Metal load with :52416 Qwen on the same master GPU.
CHAT="$(curl -sf -m 300 "http://127.0.0.1:${PORT}/v1/chat/completions" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg m "${MODEL}" --arg p 'Reply with exactly: ok' '{model:$m,messages:[{role:"user",content:$p}],max_tokens:16,temperature:0}')" 2>/dev/null || true)"
if echo "${CHAT}" | jq -e '.choices[0].message.content' >/dev/null 2>&1; then
  pass "B4.3 chat completion"
else
  fail "B4.3 chat completion"
fi

echo ""
echo "=== Stage 5 (routing) ==="

if [[ -z "${XAI_API_KEY:-}" ]] && [[ -f "${REPO}/.env" ]]; then
  XAI_API_KEY="$(
    python3 - <<'PY'
import pathlib
env_path = pathlib.Path.home() / "evrnew-marketing" / ".env"
for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
    if line.startswith("XAI_API_KEY="):
        print(line.split("=", 1)[1].strip())
        break
PY
  )"
  export XAI_API_KEY
fi

ROUTER_OUT="$("${REPO}/scripts/llm-router.sh" "Reply with exactly: ok" reasoning 2>/dev/null || true)"
if [[ -n "${ROUTER_OUT}" ]]; then
  pass "llm-router.sh reasoning returned content"
  echo "  sample: ${ROUTER_OUT:0:80}"
else
  fail "llm-router.sh reasoning (cluster down or Grok fallback also failed)"
fi

CODING_OUT="$("${REPO}/scripts/llm-router.sh" "Reply with exactly: ok" coding 2>/dev/null || true)"
if [[ -n "${CODING_OUT}" ]]; then
  pass "llm-router.sh coding → :52416"
else
  fail "llm-router.sh coding"
fi

echo ""
if [[ "${FAIL}" -eq 0 ]]; then
  echo "All checks passed."
  exit 0
fi
echo "Some checks failed."
exit 1
