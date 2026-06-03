#!/usr/bin/env bash
# Legacy entrypoint kept for compatibility with existing cron jobs.
# Delegates to unified Hermes/OpenClaw supervisor.

set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPERVISOR="${SCRIPT_DIR}/hermes-openclaw-supervisor.sh"

if [ ! -x "$SUPERVISOR" ]; then
  echo "autoheal-hermes: supervisor missing or not executable: $SUPERVISOR" >&2
  exit 1
fi

exec "$SUPERVISOR" --component both --source openclaw-hermes-autoheal "$@"
