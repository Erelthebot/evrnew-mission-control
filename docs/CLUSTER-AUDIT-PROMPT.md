# Cluster audit prompt (Cursor agent)

Copy everything below the `---` line into a **new Cursor chat** with workspace `~/evrnew-marketing`.

---

## Mission

Audit the two-node M5 Pro TB5 cluster per **`docs/CLUSTER-ARCHITECTURE.md`**.

**Policies:** **NO exo.** Inter-node inference = **MLX Metal + `mlx.launch --backend jaccl` (RDMA only)**. **NO `mlx-cluster-proxy` on :52415.**

## Hard constraints

| Constraint | Verify |
|------------|--------|
| No exo | `pgrep -f exo` empty; no `uv run exo` in launchd |
| RDMA transport | `rdma_ctl status` → enabled; cluster started with `--backend jaccl`, not `ring` |
| :52415 owner | `mlx_lm.server` from mlx.launch, not proxy/exo |
| :52416 coding | Qwen3.6-27B-4bit on master |
| Frontier | xAI `grok-4.3` + Gemini images only |

## Artifacts (a)–(g)

| ID | Focus |
|----|--------|
| a | `mlx-cluster-proxy.py` — must be **unloaded**, deprecated |
| b | master `:52416` mlx_lm (Qwen3.6) |
| c | **JACCL cluster** — `hostfiles/erel-tb5.json`, `start-mlx-rdma-cluster.sh`, `:52415` health, 2-node jaccl logs |
| d | `llm-router.sh`, `llm-config.json` — `query_cluster`, no exo |
| e | Ollama `:11435` embeddings |
| f | HF cache / `~/models` GGUF |
| g | Worker Metal toolchain (required for rank 1 GPU) |

## Commands

```bash
rdma_ctl status
pgrep -lf 'exo|mlx-cluster-proxy|mlx_lm|mlx.launch'
lsof -i :52415 -i :52416
curl -s http://127.0.0.1:52416/v1/models | jq -r '.data[].id'
curl -s http://127.0.0.1:52415/v1/models 2>&1 | head -c 500
ssh erel_worker 'rdma_ctl status; xcrun metal --version 2>&1 | head -1'
```

## Output

Findings table (a)–(g), model matrix, constraint pass/fail, next steps from `docs/CLUSTER-CUTOVER-STAGES.md`.
