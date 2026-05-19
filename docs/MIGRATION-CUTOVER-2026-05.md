# Model stack migration — cutover checklist (2026-05)

Decisions locked: rotate-only history (no filter-repo), full merge, big-bang cutover,
**reasoning + overflow served by local cluster** (exo target; mlx-cluster-proxy interim).

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
| Primary | Grok-3 | xAI API | — |
| Reasoning / Synthesis | Llama-3.3-70B-Instruct-4bit | `127.0.0.1:52415/v1` | Local cluster (exo target / mlx-cluster-proxy interim) |
| Overflow | Llama-3.3-70B-Instruct-4bit | `127.0.0.1:52415/v1` | Same local cluster |
| Vision/GUI | Holo3-35B-A3B | `127.0.0.1:8080/v1` | llama-server |
| Embeddings | nomic-embed-text | Ollama `:11435` | — |
| Images only | gemini-3.1-flash-image-preview | Gemini API | — |

## 6. Cluster runtime: exo target vs. mlx-cluster-proxy interim

Goal: collapse the 2 × M5 Pro 48 GB nodes into a **single unified inference endpoint**
at `127.0.0.1:52415` (OpenAI-compatible), with topology-aware sharding over TB5 RDMA.

### Why exo, not the old proxy

The legacy `scripts/mlx-cluster-proxy.py` round-robins independent `mlx_lm.server`
processes on master + worker; it does **not** pool memory. exo (https://github.com/exo-explore/exo)
does true pipeline / tensor-parallel sharding via MLX-distributed with native TB5 RDMA
support, giving us up to 1.8× speedup on 2 devices and pooled VRAM for larger models.

### Why DeepSeek-V4-Flash was not used as the reasoning model

The reasoning role originally targeted `deepseek/deepseek-v4-flash` via OpenRouter
(paid) or `mlx-community/DeepSeek-V4-Flash` locally. The local route is blocked by
hardware: the 4-bit-equivalent MLX build is **148 GB**, exceeding the 96 GB pooled
RAM on the current 2-node cluster. Cutover ships with `Llama-3.3-70B-Instruct-4bit`
(38 GB) as the in-cluster substitute — same endpoint and OpenAI shape, so swap-in
of V4-Flash is config-only once the hardware path below is unblocked.

### Exo install status (paused at 2026-05-18 cutover)

Installed cleanly on both nodes:

- Master: `~/cluster/exo` (cloned), `uv`, `cargo`, `rustup` stable + nightly, `macmon`
  pinned fork, dashboard built with node 22, exo binary runs as coordinator (`--no-worker`).
- Worker (`erel_worker@192.168.100.2` over TB5 `bridge0`): same toolchain, dashboard built.

Three blockers prevent serving inference through exo today (each requires manual
action with sudo or interactive flows that cannot be automated by the agent):

1. **Master has no Xcode** — only Command Line Tools. MLX Metal compilation needs
   the full Xcode app. Action: install Xcode (App Store, ~15 GB, Apple ID required),
   then `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
2. **Worker Xcode is missing the Metal Toolchain component.** Action (on worker):
   ```bash
   sudo xcodebuild -runFirstLaunch
   sudo xcodebuild -downloadComponent MetalToolchain
   ```
   First command also recovers an `IDESimulatorFoundation` plug-in load failure
   currently emitted by `xcodebuild` on `26.4.1`.
3. **RDMA over Thunderbolt 5 requires a reboot** to enable the kernel extension
   per the exo README (RDMA section). Without RDMA the cluster falls back to TCP
   over `bridge0` (still functional, lower throughput).

After all three are cleared:

```bash
# stop the interim proxy + per-node mlx_lm.server
launchctl unload ~/Library/LaunchAgents/com.erel.mlx-cluster-proxy.plist
launchctl unload ~/Library/LaunchAgents/com.erel.mlx-server.plist

# start exo cluster
cd ~/cluster/exo
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  nohup uv run --extra mlx exo > /tmp/exo-master.log 2>&1 &

ssh erel_worker 'cd ~/cluster/exo && DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  nohup ~/.local/bin/uv run --extra mlx exo > /tmp/exo-worker.log 2>&1 &'

# place the model (RDMA tensor-parallel placement)
curl -X POST http://127.0.0.1:52415/place_instance \
  -H 'Content-Type: application/json' \
  -d '{"model_id":"mlx-community/Llama-3.3-70B-Instruct-4bit",
       "sharding":"Tensor","instance_meta":"MlxJaccl","min_nodes":2}'
```

No application change is required at that point — `llm-config.json`, `consensus.py`,
the site chat route, `llm-router.sh`, and `llm-api-wrappers.js` all already target
`http://127.0.0.1:52415/v1` with model `mlx-community/Llama-3.3-70B-Instruct-4bit`.

### Loading DeepSeek-V4-Flash (after exo is live, future hardware)

Once cluster pooled RAM exceeds ~152 GB (third 48 GB node added, or M5 Ultra
upgrade), swap the placement above to:

```bash
curl -X POST http://127.0.0.1:52415/place_instance \
  -H 'Content-Type: application/json' \
  -d '{"model_id":"mlx-community/DeepSeek-V4-Flash",
       "sharding":"Tensor","instance_meta":"MlxJaccl","min_nodes":3}'
```

Then update `config/llm-config.json` `reasoning.model` and `overflow.model` to
`mlx-community/DeepSeek-V4-Flash`. No code changes elsewhere.
