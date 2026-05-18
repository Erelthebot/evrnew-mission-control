#!/Users/erel_master/evrnew-venv/bin/python3
"""
Generates facts.yaml from memory markdown files.
Extracts ports, paths, IDs, model names, and service URLs into machine-readable YAML.
Run manually or via cron after memory files change.
"""
import re
import yaml
from pathlib import Path

MEMORY = Path.home() / "evrnew-marketing" / "memory"
OUTPUT = Path.home() / "evrnew-marketing" / "facts.yaml"

facts = {
    "services": {},
    "models": {},
    "credentials_status": {},
    "people": {},
    "ports": {},
    "paths": {},
}

# --- Parse infrastructure.md ---
infra = (MEMORY / "infrastructure.md").read_text()

# Extract service blocks: ## ServiceName + last-verified
for m in re.finditer(r"## (.+?)\n\*\*last-verified: (.+?)\*\*", infra):
    name = m.group(1).strip()
    verified = m.group(2).strip()
    facts["services"][name.lower().replace(" ", "_")] = {"last_verified": verified}

# Extract port numbers
for m in re.finditer(r"port[:\s]+(\d{4,5})", infra, re.IGNORECASE):
    port = int(m.group(1))
    # Find context (what comes before on the line)
    line = infra[max(0, m.start()-80):m.end()]
    label = re.sub(r"port[:\s]+\d+", "", line).strip().rstrip(":,-").strip().split("\n")[-1].strip()
    if label and len(label) < 60:
        facts["ports"][label] = port

# Explicit known ports
port_map = {
    "mission_control": 3003,
    "openclaw_gateway": 18789,
    "browser_relay": 18792,
    "ollama_embeddings": 11435,
    "mlx_overflow": 52416,
    "holo3_local": 8080,
    "n8n": 5678,
}
facts["ports"].update(port_map)

# Extract URLs
for m in re.finditer(r"(https?://[^\s\)\"]+)", infra):
    url = m.group(1).rstrip(".,")
    if "evrnew.com" in url or "supabase.co" in url:
        key = re.sub(r"https?://", "", url).split("/")[0].replace(".", "_")
        facts["services"].setdefault(key, {})["url"] = url

# Extract paths
for m in re.finditer(r"(`|~/)([~/][^\s`]+)", infra):
    path = m.group(2)
    if len(path) > 5 and "/" in path:
        facts["paths"][Path(path).name] = path

# --- Parse standing-instructions.md for model info ---
instructions = (MEMORY / "standing-instructions.md").read_text()
for m in re.finditer(r"(?:model|LLM)[^\n:]*:\s*([^\n]+)", instructions, re.IGNORECASE):
    val = m.group(1).strip()
    if any(x in val.lower() for x in ["qwen", "claude", "grok", "mistral", "sonnet", "opus"]):
        facts["models"]["local"] = val if "qwen" in val.lower() else facts["models"].get("local")
        facts["models"]["primary"] = val if "claude" in val.lower() else facts["models"].get("primary")

facts["models"].setdefault("local", "qwen3.5:27b")
facts["models"].setdefault("primary", "claude-sonnet-4-6")
facts["models"].setdefault("fast", "grok-fast (xAI)")

# --- Parse people.md ---
people_md = (MEMORY / "people.md").read_text()
for m in re.finditer(r"## (.+?)\n.*?Telegram ID.*?`(\d+)`", people_md, re.DOTALL):
    name = m.group(1).strip()
    tid = m.group(2).strip()
    facts["people"][name.lower().replace(" ", "_")] = {"name": name, "telegram_id": tid}

# --- Parse credentials.md for status ---
creds_md = (MEMORY / "credentials.md").read_text()
if "## Credential Status" in creds_md:
    status_block = creds_md.split("## Credential Status")[1]
    for m in re.finditer(r"\| (.+?) \| [✅⚠️❌]+ (\w+) \| (.+?) \|", status_block):
        service = m.group(1).strip()
        status = m.group(2).strip()
        facts["credentials_status"][service] = status

# --- Parse issues.md for open P1/P2 ---
issues_md = (MEMORY / "issues.md").read_text()
open_issues = []
for m in re.finditer(r"### (P[12]) — (.+?)\n", issues_md):
    open_issues.append({"priority": m.group(1), "title": m.group(2).strip()})
facts["open_issues"] = open_issues

# Write YAML
OUTPUT.write_text(yaml.dump(facts, default_flow_style=False, sort_keys=True, allow_unicode=True))
print(f"facts.yaml written to {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
