#!/usr/bin/env bash
# Configure Thunderbolt for MLX JACCL (RDMA). Does NOT install or run exo.
# Requires sudo on master and worker. Reboot may be required after first RDMA enable.
set -euo pipefail

echo "=== TB5 / JACCL network fix ==="
echo "RDMA status (local):"
rdma_ctl status

if ! rdma_ctl status 2>/dev/null | grep -qi enabled; then
  echo "Enable RDMA in Recovery: rdma_ctl enable, then reboot." >&2
  exit 1
fi

# Apple/MLX: disable Thunderbolt Bridge; assign IPs per TB port (not bridge0).
# Option A — MLX-guided (interactive — press Enter when prompted):
if command -v mlx.distributed_config >/dev/null; then
  echo ""
  echo "Run on MASTER (interactive):"
  echo "  mlx.distributed_config --over thunderbolt --backend jaccl \\"
  echo "    --hosts localhost,erel_worker --output-hostfile ~/evrnew-marketing/hostfiles/erel-tb5.json --auto-setup"
  echo ""
  echo "Requires: ssh localhost and ssh erel_worker (passwordless)."
fi

# Option B — exo network script (destructive to bridge-based LAN):
EXO_NET="${HOME}/cluster/exo/tmp/set_rdma_network_config.sh"
if [[ -f "${EXO_NET}" ]]; then
  echo ""
  echo "Option B on EACH node (sudo):"
  echo "  sudo ${EXO_NET}"
fi

echo ""
echo "Quick fix if master has .1 on en1 but worker only had .2 on bridge0:"
echo "  ssh erel_worker 'sudo ifconfig en1 inet 192.168.100.2 netmask 255.255.255.252'"
echo "  ping -c 2 192.168.100.2   # from master — must succeed before JACCL"
echo ""
echo "Verify after setup:"
echo "  ping -c 2 192.168.100.2          # from master (or new subnet from mlx.distributed_config)"
echo "  ssh erel_worker ibv_devinfo | rg PORT_ACTIVE"
echo "  mlx.distributed_config ... --dot   # should list mesh without SSH errors"
