# Model stack migration — cutover checklist (2026-05)

Decisions locked: rotate-only history (no filter-repo), full merge, big-bang cutover.

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

## Stack reference

| Role | Model | Endpoint |
|------|-------|----------|
| Primary | Grok-3 | xAI API |
| Reasoning | DeepSeek-V4-Flash | OpenRouter |
| Overflow | Llama-3.3-70B-4bit | MLX `:52416` |
| Vision/GUI | Holo3-35B-A3B | `:8080` |
| Embeddings | nomic-embed-text | Ollama `:11435` |
| Images only | gemini-3.1-flash-image-preview | Gemini API |
