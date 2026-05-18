#!/usr/bin/env python3
"""
Erel Consensus Engine
Fires Holo3 (local) + Grok-3 analytical + DeepSeek-V4-Flash reasoning in parallel.
DeepSeek-V4-Flash synthesizes the final recommendation (thinking mode on hard cases).

Usage:
    python3 consensus.py "Your strategic question here"
    python3 consensus.py  # uses default Evrnew question
"""

import asyncio
import json
import os
import sys
from pathlib import Path

import httpx
import openai
from openai import AsyncOpenAI

XAI_API_KEY = os.environ.get("XAI_API_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
LOCAL_URL = os.environ.get("LOCAL_URL", "http://127.0.0.1:8080")

XAI_MODEL = os.environ.get("XAI_MODEL", "grok-3")
REASONING_MODEL = os.environ.get("REASONING_MODEL", "deepseek/deepseek-v4-flash")

_CFG_PATH = Path(__file__).parent / "config" / "llm-config.json"
if _CFG_PATH.exists():
    with open(_CFG_PATH) as f:
        _cfg = json.load(f)
    XAI_MODEL = _cfg.get("fast", {}).get("model", XAI_MODEL)
    REASONING_MODEL = _cfg.get("reasoning", {}).get("model", REASONING_MODEL)

_model_cache: dict = {}

# ── Clients ────────────────────────────────────────────────────────────────────
xai_client = AsyncOpenAI(
    api_key=XAI_API_KEY,
    base_url="https://api.x.ai/v1",
)

openrouter_client = AsyncOpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)


async def resolve_local_model() -> tuple[str, str, str]:
    """Returns (base_url, model_id, label). Queries llama-server on port 8080."""
    if "local" in _model_cache:
        return _model_cache["local"]

    async with httpx.AsyncClient(timeout=5) as client:
        try:
            resp = await client.get(f"{LOCAL_URL}/v1/models")
            resp.raise_for_status()
            models = resp.json().get("data", [])
            if models:
                model_id = models[0]["id"]
                result = (f"{LOCAL_URL}/v1", model_id, f"{model_id} via llama-server")
                _model_cache["local"] = result
                return result
        except Exception:
            pass

    raise RuntimeError("No local LLM available (llama-server port 8080 unreachable)")


# ── Individual callers ─────────────────────────────────────────────────────────
SYSTEM_CONTEXT = (
    "Company: Evrnew LLC — residential and commercial insulation contractor. "
    "Service area: King, Snohomish, Skagit counties, Washington State. "
    "Services: spray foam, blown-in, batt, crawl space, attic insulation. "
    "CRM: GoHighLevel. Primary channels: LSAs, Google Ads, Meta, D2D, Thumbtack."
)


async def ask_local(prompt: str) -> tuple[str, str]:
    base_url, model_id, label = await resolve_local_model()
    async with httpx.AsyncClient(timeout=600) as client:
        resp = await client.post(f"{base_url}/chat/completions", json={
            "model": model_id,
            "messages": [
                {"role": "system", "content": SYSTEM_CONTEXT},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "temperature": 0.3,
        })
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"].get("content") or ""
        return content.strip(), label


async def ask_xai_analytical(prompt: str) -> str:
    """Grok-3 — low temperature, structured/analytical."""
    resp = await xai_client.chat.completions.create(
        model=XAI_MODEL,
        messages=[
            {"role": "system", "content": f"You are a precise, data-driven strategic analyst. Be structured and thorough. {SYSTEM_CONTEXT}"},
            {"role": "user", "content": prompt},
        ],
        max_tokens=1024,
        temperature=0.2,
    )
    return (resp.choices[0].message.content or "").strip()


def _reasoning_extra(thinking: bool) -> dict:
    if not thinking:
        return {}
    return {"extra_body": {"reasoning": {"enabled": True}}}


async def ask_reasoning(prompt: str, thinking: bool = False) -> str:
    """DeepSeek-V4-Flash via OpenRouter. Default non-thinking; thinking on hard cases."""
    last_exc: Exception | None = None
    for attempt in range(3):
        if attempt > 0:
            await asyncio.sleep(2 ** attempt)
        try:
            resp = await openrouter_client.chat.completions.create(
                model=REASONING_MODEL,
                messages=[
                    {"role": "system", "content": f"You are a deep strategic reasoner. Apply multi-step analysis, challenge assumptions, and produce well-structured, actionable conclusions. {SYSTEM_CONTEXT}"},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=1024,
                temperature=0.4,
                **_reasoning_extra(thinking),
            )
            content = (resp.choices[0].message.content or "").strip()
            if content:
                return content
            resp2 = await openrouter_client.chat.completions.create(
                model=REASONING_MODEL,
                messages=[{"role": "user", "content": f"{SYSTEM_CONTEXT}\n\n{prompt}"}],
                max_tokens=1024,
                temperature=0.4,
                **_reasoning_extra(thinking),
            )
            return (resp2.choices[0].message.content or "").strip()
        except openai.APIStatusError as exc:
            last_exc = exc
            if exc.status_code != 503:
                raise
    raise last_exc or RuntimeError("DeepSeek reasoning failed after retries")


# ── Consensus synthesizer ──────────────────────────────────────────────────────
async def synthesize(question: str, responses: dict) -> str:
    panel = "\n\n".join(
        f"### {name}\n{text}" for name, text in responses.items()
    )

    synthesis_prompt = f"""You are a strategic advisor reviewing three independent AI opinions on the same question.

QUESTION:
{question}

PANEL RESPONSES:
{panel}

Your job:
1. Identify points of AGREEMENT (consensus)
2. Identify key DISAGREEMENTS or unique angles
3. Produce a final RECOMMENDED STRATEGY that synthesizes the best reasoning

Format your response exactly like this:

CONSENSUS POINTS:
- [bullet each agreed-upon point]

DIVERGENT ANGLES:
- [bullet each unique or conflicting perspective worth noting]

FINAL RECOMMENDATION:
[2-4 paragraphs of direct, actionable strategic advice synthesized from all three]"""

    last_exc: Exception | None = None
    for attempt in range(3):
        if attempt > 0:
            await asyncio.sleep(2 ** attempt)
        try:
            resp = await openrouter_client.chat.completions.create(
                model=REASONING_MODEL,
                messages=[{"role": "user", "content": synthesis_prompt}],
                max_tokens=2048,
                temperature=0.3,
                **_reasoning_extra(thinking=True),
            )
            return (resp.choices[0].message.content or "").strip()
        except openai.APIStatusError as exc:
            last_exc = exc
            if exc.status_code != 503:
                raise
    raise last_exc or RuntimeError("DeepSeek synthesis failed after retries")


# ── Pretty printer ─────────────────────────────────────────────────────────────
DIVIDER = "=" * 65
THIN    = "-" * 65

def print_panel(name: str, text: str):
    print(f"\n{THIN}")
    print(f"  {name}")
    print(THIN)
    print(text)


# ── Main orchestrator ──────────────────────────────────────────────────────────
async def run_consensus(question: str):
    print(f"\n{DIVIDER}")
    print("  EREL CONSENSUS ENGINE")
    print(DIVIDER)
    print(f"\nQuery: {question}\n")
    print("Firing all three in parallel...")

    results = await asyncio.gather(
        ask_local(question),
        ask_xai_analytical(question),
        ask_reasoning(question),
        return_exceptions=True,
    )

    panel = {}

    local_result = results[0]
    if isinstance(local_result, Exception):
        panel["LOCAL"] = f"[ERROR: {local_result}]"
    else:
        text, label = local_result
        panel[f"LOCAL ({label})"] = text

    for name, result in [("XAI ANALYTICAL (Grok-3)", results[1]), ("DEEPSEEK REASONING", results[2])]:
        if isinstance(result, Exception):
            panel[name] = f"[ERROR: {result}]"
        else:
            panel[name] = result

    for name, text in panel.items():
        print_panel(name, text)

    print(f"\n{DIVIDER}")
    print("  SYNTHESIZING... (DeepSeek-V4-Flash, thinking mode)")
    print(DIVIDER)

    verdict = await synthesize(question, panel)

    print(f"\n{DIVIDER}")
    print("  FINAL RECOMMENDATION")
    print(DIVIDER)
    print(f"\n{verdict}\n")

    return {"question": question, "panel": panel, "consensus": verdict}


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) > 1:
        q = " ".join(sys.argv[1:])
    else:
        q = (
            "For Evrnew LLC, a residential insulation contractor in Snohomish "
            "and King County WA, what is the best strategy to expand lead "
            "generation in Q2 2026 given rising material costs and increased competition?"
        )

    asyncio.run(run_consensus(q))
