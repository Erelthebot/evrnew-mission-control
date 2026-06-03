#!/usr/bin/env bash
# Start 2-node MLX cluster: Metal GPU + JACCL (RDMA over TB5). NO exo.
set -euo pipefail

REPO="${HOME}/evrnew-marketing"
HOSTFILE="${MLX_HOSTFILE:-${REPO}/hostfiles/erel-tb5.json}"
MODEL="${MLX_CLUSTER_MODEL:-mlx-community/Llama-3.3-70B-Instruct-8bit}"
PORT="${MLX_CLUSTER_PORT:-52415}"
WORKER_SSH="${MLX_WORKER_SSH:-erel_worker}"
LOG="${MLX_CLUSTER_LOG:-/tmp/mlx-jaccl-cluster.log}"

MLX_LAUNCH="${MLX_LAUNCH:-/opt/homebrew/bin/mlx.launch}"
MLX_SERVER="${MLX_SERVER:-/opt/homebrew/bin/mlx_lm.server}"

echo "=== MLX JACCL cluster (no exo) ==="
echo "Model: ${MODEL}"
echo "Port:  ${PORT} (rank 0 HTTP)"

if ! rdma_ctl status 2>/dev/null | grep -qi enabled; then
  echo "ERROR: RDMA not enabled. Enable in Recovery: rdma_ctl enable, then reboot." >&2
  exit 1
fi

if ! ping -c 1 -W 2 192.168.100.2 >/dev/null 2>&1; then
  echo "ERROR: Cannot ping worker at 192.168.100.2 on TB5." >&2
  echo "Fix: assign 192.168.100.2 to worker en1 (see scripts/fix-tb5-jaccl-network.sh)" >&2
  exit 1
fi

if pgrep -f 'uv run.*exo|/cluster/exo.*exo|exo-explore/exo' >/dev/null 2>&1; then
  echo "ERROR: exo is running. Stop it — this stack uses mlx.launch jaccl only." >&2
  exit 1
fi

launchctl bootout "gui/$(id -u)/com.erel.mlx-cluster-proxy" 2>/dev/null || true
pkill -f mlx-cluster-proxy.py 2>/dev/null || true

mkdir -p "${REPO}/hostfiles"
if [[ ! -f "${HOSTFILE}" ]]; then
  echo "Hostfile missing. Generate with:"
  echo "  mlx.distributed_config --over thunderbolt --backend jaccl \\"
  echo "    --hosts localhost,${WORKER_SSH} \\"
  echo "    --output-hostfile ${HOSTFILE} --auto-setup"
  exit 1
fi

# Ensure worker can run mlx (Metal toolchain must be fixed on worker first).
if ! ssh -o ConnectTimeout=5 "${WORKER_SSH}" "test -x ${MLX_SERVER}" 2>/dev/null; then
  echo "WARN: Cannot reach worker or mlx_lm.server missing. Fix worker Metal/Xcode first." >&2
fi

export MLX_METAL_FAST_SYNCH=1
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"

echo "Starting mlx.launch --backend jaccl (logs: ${LOG})"
nohup "${MLX_LAUNCH}" --backend jaccl --hostfile "${HOSTFILE}" \
  --python "${MLX_PYTHON:-/opt/homebrew/bin/python3.13}" \
  --env "MLX_METAL_FAST_SYNCH=1" \
  --env "DEVELOPER_DIR=${DEVELOPER_DIR}" \
  -- \
  "${MLX_SERVER}" \
  --model "${MODEL}" \
  --host 0.0.0.0 \
  --port "${PORT}" \
  >> "${LOG}" 2>&1 &

echo "PID $! — wait for load, then:"
echo "  curl -s http://127.0.0.1:${PORT}/v1/models | jq"
echo "  tail -f ${LOG}"
