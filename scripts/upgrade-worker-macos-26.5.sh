#!/usr/bin/env bash
# Upgrade erel_worker to macOS 26.5.x (Software Update label may be 26.5.1).
# Master reference: sw_vers → 26.5 (25F71). Worker target: Tahoe 26.5.1-25F80 or newer 26.5.
#
# Run AFTER JACCL cluster load finishes, or stop the cluster first — install reboots the worker.
set -euo pipefail

WORKER="${MLX_WORKER_SSH:-erel_worker}"
UPDATE_LABEL="${MACOS_UPDATE_LABEL:-macOS Tahoe 26.5.1-25F80}"
REPO="${HOME}/evrnew-marketing"
PLIST="${REPO}/scripts/com.erel.tb5-en1-worker.plist"

echo "=== Worker macOS align (26.5 family) ==="
echo "Worker before:"
ssh -o BatchMode=yes "${WORKER}" sw_vers

if pgrep -f 'mlx.launch --backend jaccl' >/dev/null 2>&1; then
  echo ""
  echo "WARN: mlx.launch JACCL is running on master. Stop it before rebooting worker:"
  echo "  pkill -f 'mlx.launch --backend jaccl' || true"
  read -r -p "Continue anyway? [y/N] " ans
  [[ "${ans:-}" == [yY] ]] || exit 1
fi

echo ""
echo "Installing TB5 en1 persistence on worker (survives reboot)..."
scp -q "${PLIST}" "${WORKER}:/tmp/com.erel.tb5-en1.plist"
ssh -o BatchMode=yes "${WORKER}" "sudo cp /tmp/com.erel.tb5-en1.plist /Library/LaunchDaemons/com.erel.tb5-en1.plist && sudo chown root:wheel /Library/LaunchDaemons/com.erel.tb5-en1.plist && sudo launchctl bootstrap system /Library/LaunchDaemons/com.erel.tb5-en1.plist 2>/dev/null || sudo launchctl load -w /Library/LaunchDaemons/com.erel.tb5-en1.plist"

echo ""
echo "Downloading + installing: ${UPDATE_LABEL}"
echo "(Worker will reboot when install completes.)"
ssh -o BatchMode=yes -t "${WORKER}" "sudo softwareupdate --install '${UPDATE_LABEL}' --agree-to-license --restart"

echo ""
echo "After worker is back: ping 192.168.100.2, then:"
echo "  ${REPO}/scripts/start-mlx-rdma-cluster.sh"
