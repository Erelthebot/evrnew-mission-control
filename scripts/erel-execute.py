#!/usr/bin/env python3
"""
erel-execute.py — Task execution engine for Erel.

Pipeline:
  Grok-3 (communications only, receives Telegram task)
    → this script
      → Local LLM (Holo3-35B port 8080) refines vague task into precise instruction
      → DeepSeek-V4-Flash (fallback / complex reasoning) if local LLM is down or task is multi-step
      → claude-task.sh (Claude Code) executes the instruction
    → result back to Grok-3 → Grok tells Spencer

Usage: erel-execute.py "task description in plain English"
"""

import os
import sys
import json
import subprocess
import requests
from pathlib import Path

HOME        = Path.home()
CLAUDE_TASK = HOME / "evrnew-marketing/scripts/claude-task.sh"
ENV_FILE    = HOME / "evrnew-marketing/.env"
CFG_FILE    = HOME / "evrnew-marketing/config/llm-config.json"

# Load .env so API keys are available
if ENV_FILE.exists():
    for raw in ENV_FILE.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

LOCAL_LLM_URL = "http://127.0.0.1:8080/v1/chat/completions"
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
REASONING_MODEL = "deepseek/deepseek-v4-flash"
if CFG_FILE.exists():
    import json as _json
    _cfg = _json.loads(CFG_FILE.read_text())
    REASONING_MODEL = _cfg.get("reasoning", {}).get("model", REASONING_MODEL)
REASONING_URL = "https://openrouter.ai/api/v1/chat/completions"

# ── Machine context injected into every planner call ──────────────────────
MACHINE_CONTEXT = """
You are the execution planner for Erel — an autonomous AI operations server
running on MacBook Pro M5 Pro (erel_master), macOS 26.

KEY PATHS AND COMMANDS:
- Mission Control (Next.js 15, localhost:3003):
    Source:  /Users/erel_master/evrnew-marketing/sites/openclaw-site/
    Sidebar: /Users/erel_master/evrnew-marketing/sites/openclaw-site/components/layout/Sidebar.tsx
    Build:   cd /Users/erel_master/evrnew-marketing/sites/openclaw-site && npm run build
    Restart: sudo launchctl kickstart -k gui/501/com.evrnew.mission-control

- Sidebar nav structure (Sidebar.tsx):
    const nav = [
      { group: 'GROUP_NAME', items: [
        { href: '/path', label: 'Label', icon: '◈' },
      ]},
      ...
    ]

- OpenClaw gateway (Telegram bot, port 18789):
    Config:       /Users/erel_master/.openclaw/openclaw.json
    Instructions: /Users/erel_master/.openclaw/agents/main/agent/instructions.md
    Restart:      sudo launchctl kickstart -k system/ai.openclaw.gateway

- Hermes agent:
    Config: /Users/erel_master/.hermes/config.yaml
    SOUL:   /Users/erel_master/.hermes/SOUL.md
    Restart: launchctl kickstart -k gui/501/ai.hermes.gateway

- Scripts:  /Users/erel_master/evrnew-marketing/scripts/
- Data:     /Users/erel_master/evrnew-marketing/data/
- QB tokens: /Users/erel_master/evrnew-marketing/scripts/quickbooks/qb-tokens.json
"""

PLANNER_PROMPT = f"""{MACHINE_CONTEXT}

Your job: translate the human task into ONE precise instruction for Claude Code.
Claude Code can read/edit any file, run shell commands, rebuild apps, restart services.

Rules:
- Be specific: include exact file paths, the exact change to make, exact commands to run after.
- If it is a Mission Control UI change: always end with "then run npm run build in the site directory and restart com.evrnew.mission-control".
- If it is an OpenClaw config change: always end with "then restart ai.openclaw.gateway".
- Never ask clarifying questions. Make a decision and give the instruction.

Output ONLY valid JSON, no markdown fences, no preamble:
{{
  "instruction": "<the full precise instruction for Claude Code>",
  "use_reasoning": false
}}

If the task is genuinely complex (3+ independent systems, unclear requirements): set use_reasoning to true
and leave instruction as an empty string — DeepSeek-V4-Flash will handle the planning instead.
"""


def strip_thinking(text: str) -> str:
    """Strip thinking blocks before the answer."""
    if "</think>" in text:
        text = text[text.rfind("</think>") + len("</think>"):].strip()
    return text


def extract_json(text: str) -> dict:
    text = strip_thinking(text)
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"No JSON found in: {text[:200]}")
    return json.loads(text[start:end])


# ── Planners ──────────────────────────────────────────────────────────────

def plan_with_local_llm(task: str) -> dict:
    payload = {
        "model": "Holo3-35B-A3B.Q4_K_M.gguf",
        "messages": [
            {"role": "system", "content": PLANNER_PROMPT},
            {"role": "user",   "content": task},
        ],
        "temperature": 0.1,
        "max_tokens": 1024,
    }
    r = requests.post(LOCAL_LLM_URL, json=payload, timeout=90)
    r.raise_for_status()
    content = r.json()["choices"][0]["message"]["content"]
    return extract_json(content)


def plan_with_reasoning(task: str) -> str:
    prompt = f"""{MACHINE_CONTEXT}

Task: {task}

Translate this into a precise step-by-step instruction for Claude Code (a tool that can
read/edit files, run shell commands, rebuild Next.js apps, restart launchd services).
Include exact file paths and exact commands. No preamble — just the instruction."""

    payload = {
        "model": REASONING_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1024,
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
    }
    r = requests.post(REASONING_URL, json=payload, headers=headers, timeout=60)
    r.raise_for_status()
    return (r.json()["choices"][0]["message"]["content"] or "").strip()


# ── Executor ──────────────────────────────────────────────────────────────

def run_claude_task(instruction: str) -> tuple[str, int]:
    result = subprocess.run(
        [str(CLAUDE_TASK), instruction],
        capture_output=True,
        text=True,
        timeout=300,
        env={**os.environ, "HOME": str(HOME)},
    )
    out = result.stdout.strip()
    err = result.stderr.strip()
    combined = out + ("\n" + err if err and result.returncode != 0 else "")
    return combined, result.returncode


# ── Main pipeline ─────────────────────────────────────────────────────────

def execute(task: str) -> str:
    instruction = None
    planner_used = None

    # 1. Try local LLM first (fast, free, on-device)
    try:
        plan = plan_with_local_llm(task)
        if plan.get("use_reasoning") or plan.get("use_gemini") or not plan.get("instruction", "").strip():
            raise ValueError("local LLM flagged task as needing reasoning tier")
        instruction = plan["instruction"]
        planner_used = "local"
    except Exception:
        pass

    # 2. DeepSeek-V4-Flash fallback — handles complex or ambiguous tasks
    if not instruction:
        try:
            instruction = plan_with_reasoning(task)
            planner_used = "reasoning"
        except Exception:
            instruction = task
            planner_used = "raw"

    # 3. Execute via Claude Code
    output, code = run_claude_task(instruction)

    if code != 0:
        return f"Execution failed (exit {code}):\n{output}"

    return output or "Done."


if __name__ == "__main__":
    task = " ".join(sys.argv[1:]).strip()
    if not task:
        task = sys.stdin.read().strip()
    if not task:
        print("Usage: erel-execute.py \"task description\"", file=sys.stderr)
        sys.exit(1)

    print(execute(task))
