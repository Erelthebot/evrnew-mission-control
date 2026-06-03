# Local LLM cluster — MLX Metal + RDMA (no exo)

**Policy (locked):**

| Allowed | Forbidden |
|---------|-----------|
| **MLX** on Apple GPU (`mlx`, `mlx_lm`, Metal) | **exo** (`uv run exo`, exo app, `place_instance`) |
| Inter-node comm: **`mlx.launch --backend jaccl`** (RDMA over TB5) | **`mlx-cluster-proxy`** on `:52415` for sharded models |
| `MLX_METAL_FAST_SYNCH=1` on JACCL jobs | **`MlxRing` / ring TCP** for multi-node 70B |
| Network: `rdma_ctl` enabled, TB Bridge off, per-port DHCP | Thunderbolt Bridge as the shard data path |

RDMA is enabled on both nodes. Multi-node inference uses **MLX distributed JACCL** only — the same Metal/RDMA stack exo wraps, but **this repo does not run exo**.

## Topology

```
Clients (router, consensus, site)
        │
        ├─► :52416  mlx_lm.server  Qwen3.6-27B-4bit     (master, single-node Metal)
        │
        └─► :52415  mlx_lm.server  Llama-70B-*          (mlx.launch --backend jaccl)
                    └── RDMA (JACCL) between master ↔ worker

:8080  llama-server  Holo3
:11435 Ollama         nomic-embed-text
```

`mlx_lm.server` participates in distributed groups when started via `mlx.launch` (tensor parallel by default; `--pipeline` for pipeline parallel).

## Network (RDMA-only)

1. `rdma_ctl status` → **enabled** (both nodes).
2. Configure TB ports (sudo), e.g. `mlx.distributed_config --over thunderbolt --backend jaccl --hosts …` or the network script at `~/cluster/exo/tmp/set_rdma_network_config.sh` (**network only** — do not start exo).
3. **Matching macOS builds** on both nodes (RDMA discovery breaks across mismatched betas; currently master 26.5 / worker 26.4.1 — align before 2-node JACCL).
4. Unload `com.erel.mlx-cluster-proxy` — **:52415 is for JACCL mlx_lm.server only**.

## Role → model → how

| Role | Model | How |
|------|-------|-----|
| Coding | `mlx-community/Qwen3.6-27B-4bit` | master `:52416` |
| Reasoning / overflow (cluster) | `mlx-community/Llama-3.3-70B-Instruct-4bit` or `-8bit` | `scripts/start-mlx-rdma-cluster.sh` (jaccl, 2 nodes) |
| Frontier | `grok-4.3` | xAI |
| Images | `gemini-3.1-flash-image-preview` | Gemini |

**8-bit 70B** needs both nodes (~75 GB weights split via tensor parallel). **4-bit** can run 2-node JACCL or single-node on one Mac when worker Metal is down.

## Operator start

```bash
~/evrnew-marketing/scripts/start-mlx-rdma-cluster.sh
```

## References

- [MLX distributed — JACCL](https://ml-explore.github.io/mlx/build/html/usage/distributed.html)
- Apple TN3205 (RDMA over Thunderbolt)
