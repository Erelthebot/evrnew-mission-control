#!/bin/bash
# LLM Router — Erel cluster stack (2026-05-18)
# Default → Grok-3 | Reasoning/consensus → DeepSeek-V4-Flash | Overflow → Llama-70B-4bit MLX | Vision → Holo3 :8080

set -euo pipefail

OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"
OPENROUTER_MODEL="${OPENROUTER_MODEL:-deepseek/deepseek-v4-flash}"
XAI_API_KEY="${XAI_API_KEY:-}"
XAI_MODEL="${XAI_MODEL:-grok-3}"
MLX_URL="${MLX_URL:-http://127.0.0.1:52416/v1/chat/completions}"
MLX_MODEL="${MLX_MODEL:-Llama-3.3-70B-Instruct-4bit}"
HOLO_URL="${HOLO_URL:-http://127.0.0.1:8080/v1/chat/completions}"
HOLO_MODEL="${HOLO_MODEL:-Holo3-35B-A3B}"

PROMPT="${1:-}"
TASK_TYPE="${2:-default}"

if [ -z "$PROMPT" ]; then
    echo "Usage: $0 <prompt> [task_type]"
    echo "  task_type: conversational | reasoning | vision | overflow | default"
    exit 1
fi

query_openrouter() {
    local prompt="$1"
    local thinking="${2:-false}"
    [ -z "$OPENROUTER_API_KEY" ] && return 1

    local extra=""
    [ "$thinking" = "true" ] && extra=',"reasoning":{"enabled":true}'

    local response
    response=$(curl -sf https://openrouter.ai/api/v1/chat/completions \
        -H "Authorization: Bearer $OPENROUTER_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$OPENROUTER_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":$(echo "$prompt" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}],\"max_tokens\":2048$extra}" \
        | jq -r '.choices[0].message.content // empty')

    [ -n "$response" ] && echo "$response" && return 0
    return 1
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

query_mlx_overflow() {
    local prompt="$1"
    local response
    response=$(curl -sf "$MLX_URL" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$MLX_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":$(echo "$prompt" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}],\"max_tokens\":2048}" \
        | jq -r '.choices[0].message.content // empty')

    [ -n "$response" ] && echo "$response" && return 0
    return 1
}

query_holo() {
    local prompt="$1"
    local response
    response=$(curl -sf "$HOLO_URL" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$HOLO_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":$(echo "$prompt" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}],\"max_tokens\":2048}" \
        | jq -r '.choices[0].message.content // empty')

    [ -n "$response" ] && echo "$response" && return 0
    return 1
}

case "$TASK_TYPE" in
    conversational)
        query_grok "$PROMPT" 2>/dev/null \
        || query_openrouter "$PROMPT" false 2>/dev/null \
        || query_mlx_overflow "$PROMPT" 2>/dev/null \
        || { echo "ERROR: All providers failed for conversational task" >&2; exit 1; }
        ;;

    reasoning)
        query_openrouter "$PROMPT" false 2>/dev/null \
        || query_grok "$PROMPT" 2>/dev/null \
        || query_mlx_overflow "$PROMPT" 2>/dev/null \
        || { echo "ERROR: All providers failed for reasoning task" >&2; exit 1; }
        ;;

    vision)
        query_holo "$PROMPT" 2>/dev/null \
        || query_grok "$PROMPT" 2>/dev/null \
        || { echo "ERROR: Vision path failed" >&2; exit 1; }
        ;;

    overflow)
        query_mlx_overflow "$PROMPT" 2>/dev/null \
        || query_grok "$PROMPT" 2>/dev/null \
        || { echo "ERROR: Overflow path failed" >&2; exit 1; }
        ;;

    *)
        query_grok "$PROMPT" 2>/dev/null \
        || query_openrouter "$PROMPT" false 2>/dev/null \
        || query_mlx_overflow "$PROMPT" 2>/dev/null \
        || query_holo "$PROMPT" 2>/dev/null \
        || { echo "ERROR: All providers failed" >&2; exit 1; }
        ;;
esac
