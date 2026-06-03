# Model stack migration — cutover checklist (2026-05)

Decisions locked: rotate-only history (no filter-repo), full merge, big-bang cutover,
**reasoning + overflow served by MLX JACCL cluster** (`mlx.launch --backend jaccl` on `:52415`; **no exo**, **no mlx-cluster-proxy**).

## 1. Rotate keys (before push)

Rotate anything ever in git history or `~/erel-memory-backup-DO-NOT-COMMIT.md`:

- `OPENROUTER_API_KEY`, `XAI_API_KEY`, `GEMINI_API_KEY` (image agent only)
- Keys removed from `~/.hermes/config.yaml` (was inline; now empty — use env)

Then delete `~/erel-memory-backup-DO-NOT-COMMIT.md`.

## 2. `.env`

```bash
cp ~/evrnew-marketing/.env.example ~/evrnew-marketing/.env
# fill all required keys
```

Hermes reads: `XAI_API_KEY`, `OPENROUTER_API_KEY` (and optional `GEMINI_API_KEY` for image workflows).

## 3. Big-bang cutover

```bash
cd ~/evrnew-marketing
./scripts/cutover-model-stack-2026-05.sh
```

Restart any remaining agents manually if needed:

```bash
launchctl kickstart -k gui/$(id -u)/com.evrnew.watchdog
# agent plists: com.evrnew.agent-*
```

## 4. Verify

```bash
rg '(sk-or-v1-|xai-[A-Za-z0-9]{20,}|AIzaSy)' . \
  --glob '!node_modules/**' --glob '!.venv/**' --glob '!data/**' \
  --glob '!.next/**' --glob '!out/**'

scripts/check-credentials.py
scripts/llm-router.sh "Reply: ok" conversational
scripts/llm-router.sh "Reply: ok" reasoning   # exercises local cluster :52415
```

## 5. Git remote + push

Create GitHub repo (if missing), then:

```bash
cd ~/evrnew-marketing
git remote add origin git@github.com:YOUR_ORG/evrnew-marketing.git
git push -u origin migrate/model-stack-2026-05
```

OpenClaw (separate repo):

```bash
cd ~/Projects/OpenClaw
git push -u origin migrate/model-stack-2026-05
```

## Stack reference (effective after cutover)

| Role | Model | Endpoint | Backend |
|------|-------|----------|---------|
| Primary | grok-4.3 | xAI API | — |
| Coding | Qwen3.6-27B-4bit | `127.0.0.1:52416/v1` | master mlx_lm.server |
| Reasoning / Synthesis | Llama-3.3-70B-Instruct-4bit | `127.0.0.1:52415/v1` | mlx.launch **jaccl** (RDMA) |
| Overflow | Llama-3.3-70B-Instruct-4bit | `127.0.0.1:52415/v1` | Same JACCL cluster |
| Vision/GUI | Holo3-35B-A3B | `127.0.0.1:8080/v1` | llama-server |
| Embeddings | nomic-embed-text | Ollama `:11435` | — |
| Images only | gemini-3.1-flash-image-preview | Gemini API | — |

## 6. Cluster runtime: MLX Metal + JACCL RDMA (no exo)

**Authoritative doc:** `docs/CLUSTER-ARCHITECTURE.md` · **Cutover:** `docs/CLUSTER-CUTOVER-STAGES.md`

- **:52415** — `mlx_lm.server` launched with `mlx.launch --backend jaccl` and `MLX_METAL_FAST_SYNCH=1` (RDMA only).
- **:52416** — master `mlx_lm.server` for Qwen3.6 (single-node; not on the JACCL job).
- **exo** — not used. `~/cluster/exo` may remain on disk for reference scripts only.
- **mlx-cluster-proxy** — deprecated; do not bind :52415.

```bash
~/evrnew-marketing/scripts/start-mlx-rdma-cluster.sh
```

Prerequisites: `rdma_ctl status` → enabled; TB network configured (`mlx.distributed_config` or `set_rdma_network_config.sh`); matching macOS builds on both nodes; worker Metal toolchain fixed.

DeepSeek-V4-Flash (148 GB MLX) stays deferred until a third 48 GB node or larger unified RAM — swap `MLX_CLUSTER_MODEL` in the start script when hardware allows.
