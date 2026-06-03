# MLX cluster cutover — MLX Metal + JACCL RDMA (no exo)

See `docs/CLUSTER-ARCHITECTURE.md`.

---

## Stage 1 — Per-node

| Step | What | Status |
|------|------|--------|
| 1 | Worker Metal / Xcode (GPU MLX on worker) | Toolchain downloaded; `xcrun metal` remount still flaky |
| 2 | Master Qwen3.6 on `:52416` | **Done** |
| 3 | xAI `grok-4.3` + billing at console.x.ai | Config **done**; API needs credits at console.x.ai |
| — | 70B **8-bit** in HF cache (~75 GB) | **Done** |

---

## Stage 2 — RDMA cluster via mlx.launch (no exo)

### Step 4a — RDMA network (both nodes, sudo) ← **current gate**

TB L3 must work before JACCL: `ping 192.168.100.2` from master must succeed.

```bash
~/evrnew-marketing/scripts/fix-tb5-jaccl-network.sh   # prints exact commands

# Interactive (press Enter at each prompt):
mlx.distributed_config --over thunderbolt --backend jaccl \
  --hosts localhost,erel_worker \
  --output-hostfile ~/evrnew-marketing/hostfiles/erel-tb5.json --auto-setup

# Or destructive network-only script on EACH node (still no exo):
sudo ~/cluster/exo/tmp/set_rdma_network_config.sh
```

**Found:** master `192.168.100.1` on **en1**; worker had `.2` only on **bridge0** (ping failed). Assigned `.2` to worker **en1** — if ping still fails, fix TB cable/port or run `mlx.distributed_config --auto-setup`.

Verify: `rdma_ctl status` → enabled; `ibv_devinfo` shows **PORT_ACTIVE** on `rdma_en1` both sides.

**Align macOS build** on master and worker before 2-node JACCL (currently **26.5** vs **26.4.1**).

**Hostfile:** rank 0 `ssh` must be `127.0.0.1` (not `localhost` — mlx.launch would SSH locally and fail). Worker `ssh` must match `~/.ssh/config` (e.g. `erel_worker` on Wi‑Fi if `192.168.100.2:22` is closed).

**JACCL `Couldn't connect (error: 60)`:** wrong `rdma_en*` in hostfile, OS mismatch, or TB link not on the chosen port — regenerate with `mlx.distributed_config` when SSH is stable.

### Step 4b — Free :52415

```bash
launchctl bootout gui/$(id -u)/com.erel.mlx-cluster-proxy 2>/dev/null || true
pkill -f mlx-cluster-proxy.py 2>/dev/null || true
```

### Step 4c — Start JACCL mlx_lm.server (not exo)

```bash
~/evrnew-marketing/scripts/start-mlx-rdma-cluster.sh
```

Uses `mlx.launch --backend jaccl` + `MLX_METAL_FAST_SYNCH=1`. **Never** `uv run exo`.

| Benchmark | Pass |
|-----------|------|
| B4.1 | `lsof -i :52415` shows mlx_lm / Python from mlx.launch, not exo or proxy |
| B4.2 | `rdma_ctl status` enabled; logs show jaccl init, not ring-only TCP shard |
| B4.3 | `curl :52415/v1/chat/completions` with 70B model returns text |
| B4.4 | `pgrep -f exo` empty |

### Step 5 — Routing

- Reasoning / overflow → `http://127.0.0.1:52415/v1` (JACCL cluster)
- Coding → `http://127.0.0.1:52416/v1` (Qwen)
- Do **not** re-enable mlx-cluster-proxy on 52415
- **Verify (after B4 passes):** `scripts/verify-cluster-stage4-5.sh`

### Parallel gates (not blocking JACCL load)

| Item | Action |
|------|--------|
| Worker macOS 26.5 | `scripts/upgrade-worker-macos-26.5.sh` after cluster load or stop JACCL first; en1 IP persists via `com.erel.tb5-en1` on worker |
| xAI Stage 1 step 3 | Add credits / raise spend limit at [console.x.ai](https://console.x.ai) — API still returns credit-limit error |
| Master optional patch | Software Update offers **26.5.1 (25F80)** on both nodes (master currently **26.5 / 25F71**) |

---

## Stage 3 — Optimize

Four-role router, HF cache dedup, compare 70B 4-bit vs 8-bit tok/s on JACCL.

---

## Ports

| Port | Owner |
|------|--------|
| **52415** | **mlx_lm.server via mlx.launch jaccl** |
| 52416 | master mlx_lm (Qwen3.6) |
| 11435 | Ollama embeddings |
| 8080 | Holo3 |
