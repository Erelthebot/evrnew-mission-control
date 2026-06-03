#!/bin/bash
# LLM Router — MLX Metal cluster (no exo)
# Default → Grok-4.3 | Reasoning/overflow → :52415 mlx JACCL (RDMA) | Coding → :52416 Qwen | Vision → Holo3 :8080

set -euo pipefail

XAI_API_KEY="${XAI_API_KEY:-}"
XAI_MODEL="${XAI_MODEL:-grok-4.3}"
CLUSTER_URL="${CLUSTER_URL:-${EXO_URL:-http://127.0.0.1:52415/v1/chat/completions}}"
CLUSTER_MODEL="${CLUSTER_MODEL:-${EXO_MODEL:-mlx-community/Llama-3.3-70B-Instruct-8bit}}"
CODING_URL="${CODING_URL:-http://127.0.0.1:52416/v1/chat/completions}"
CODING_MODEL="${CODING_MODEL:-mlx-community/Qwen3.6-27B-4bit}"
HOLO_URL="${HOLO_URL:-http://127.0.0.1:8080/v1/chat/completions}"
HOLO_MODEL="${HOLO_MODEL:-Holo3-35B-A3B}"
ROUTER_MAX_TOKENS="${ROUTER_MAX_TOKENS:-256}"

PROMPT="${1:-}"
TASK_TYPE="${2:-default}"

if [ -z "$PROMPT" ]; then
    echo "Usage: $0 <prompt> [task_type]"
    echo "  task_type: conversational | coding | reasoning | vision | overflow | default"
    exit 1
fi

query_cluster_at() {
    local url="$1" model="$2" prompt="$3"
    local response
    response=$(curl -sf "$url" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":$(echo "$prompt" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}],\"max_tokens\":${ROUTER_MAX_TOKENS}}" \
        | jq -r '.choices[0].message.content // .choices[0].message.reasoning // empty')
    [ -n "$response" ] && echo "$response" && return 0
    return 1
}

query_cluster() {
    query_cluster_at "$CLUSTER_URL" "$CLUSTER_MODEL" "$1"
}

query_coding() {
    query_cluster_at "$CODING_URL" "$CODING_MODEL" "$1"
}

query_grok() {
    local prompt="$1"
    [ -z "$XAI_API_KEY" ] && return 1

    local response
    response=$(curl -sf https://api.x.ai/v1/chat/completions \
        -H "Authorization: Bearer $XAI_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$XAI_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":$(echo "$prompt" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}]}" \
        | jq -r '.choices[0].message.content // empty')

    [ -n "$response" ] && echo "$response" && return 0
    return 1
}

query_holo() {
    local prompt="$1"
    local response
    response=$(curl -sf "$HOLO_URL" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$HOLO_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":$(echo "$prompt" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}],\"max_tokens\":${ROUTER_MAX_TOKENS}}" \
        | jq -r '.choices[0].message.content // empty')

    [ -n "$response" ] && echo "$response" && return 0
    return 1
}

case "$TASK_TYPE" in
    conversational)
        query_grok "$PROMPT" 2>/dev/null \
        || query_cluster "$PROMPT" 2>/dev/null \
        || { echo "ERROR: All providers failed for conversational task" >&2; exit 1; }
        ;;

    coding)
        query_coding "$PROMPT" 2>/dev/null \
        || query_grok "$PROMPT" 2>/dev/null \
        || { echo "ERROR: Coding path failed" >&2; exit 1; }
        ;;

    reasoning)
        query_cluster "$PROMPT" 2>/dev/null \
        || query_grok "$PROMPT" 2>/dev/null \
        || { echo "ERROR: All providers failed for reasoning task" >&2; exit 1; }
        ;;

    vision)
        query_holo "$PROMPT" 2>/dev/null \
        || query_grok "$PROMPT" 2>/dev/null \
        || { echo "ERROR: Vision path failed" >&2; exit 1; }
        ;;

    overflow)
        query_cluster "$PROMPT" 2>/dev/null \
        || query_grok "$PROMPT" 2>/dev/null \
        || { echo "ERROR: Overflow path failed" >&2; exit 1; }
        ;;

    *)
        query_grok "$PROMPT" 2>/dev/null \
        || query_cluster "$PROMPT" 2>/dev/null \
        || query_holo "$PROMPT" 2>/dev/null \
        || { echo "ERROR: All providers failed" >&2; exit 1; }
        ;;
esac
