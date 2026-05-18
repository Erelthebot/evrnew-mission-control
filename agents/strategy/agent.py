"""
Weekly Strategy Agent
Schedule: Weekly Monday at 8am
Reads competitive intel and market data, generates weekly marketing strategy brief.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Allow running standalone or as a module
sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.utils import (
    call_consensus,
    get_logger,
    log,
    notify_telegram,
    notify_sms,
    save_output,
    today_str,
    now_str,
    upsert_agent_output,
    log_activity,
)

AGENT_NAME = "strategy"
logger = get_logger(AGENT_NAME)

DATA_DIR = Path.home() / "evrnew-marketing/data"
COMPETITORS_DIR = DATA_DIR / "competitors"
COMPETITIVE_DIR = DATA_DIR / "competitive"


def load_recent_intel() -> dict[str, Any]:
    """Load the most recent competitive intel files."""
    intel: dict[str, Any] = {}

    # Load latest competitive brief
    if COMPETITIVE_DIR.exists():
        briefs = sorted(COMPETITIVE_DIR.glob("competitive-intel-*.md"), reverse=True)
        if briefs:
            intel["latest_brief"] = briefs[0].read_text(encoding="utf-8")[:3000]
            intel["brief_date"] = briefs[0].stem.replace("competitive-intel-", "")

        raw_files = sorted(COMPETITIVE_DIR.glob("raw-data-*.json"), reverse=True)
        if raw_files:
            try:
                raw = json.loads(raw_files[0].read_text(encoding="utf-8"))
                intel["raw_sample"] = {
                    "fb_ads": raw.get("fb_ads", [])[:5],
                    "spyfu": raw.get("spyfu", {}),
                }
            except Exception:
                pass

    # Load competitor data files
    if COMPETITORS_DIR.exists():
        for f in sorted(COMPETITORS_DIR.glob("*.json"), reverse=True)[:3]:
            try:
                intel[f"competitor_{f.stem}"] = json.loads(f.read_text(encoding="utf-8"))
            except Exception:
                pass

    return intel


def run_consensus_panel(intel: dict[str, Any]) -> dict:
    """Fire the multi-LLM consensus engine on this week's core strategic question."""
    brief_date = intel.get("brief_date", today_str())
    question = (
        f"For Evrnew LLC, a residential insulation contractor in Snohomish and King County WA, "
        f"what is the highest-priority marketing and lead generation strategy for the week of {brief_date}? "
        f"Consider rising material costs, Attic Projects Company running 1,300+ Facebook ads as primary competitor, "
        f"and the fact that Snohomish County mid-cities and all of Skagit County have zero paid digital competition."
    )
    log(AGENT_NAME, "Running multi-LLM consensus panel (Holo3 + Grok-3 + DeepSeek-V4-Flash)...")
    try:
        result = call_consensus(question)
        log(AGENT_NAME, "Consensus panel complete.")
        return result
    except Exception as exc:
        log(AGENT_NAME, f"Consensus panel failed: {exc}", "warning")
        return {"question": question, "panel": {}, "consensus": f"[Consensus unavailable: {exc}]"}


def generate_strategy_brief(intel: dict[str, Any], consensus: dict | None = None) -> str:
    """Generate the weekly brief entirely through the multi-LLM consensus protocol.

    Step 1 — already done by caller: consensus panel answers the strategic question.
    Step 2 — run a second consensus call asking all three LLMs to draft channel-level
             recommendations, then Sonnet assembles the final executive brief.
    """
    context = json.dumps(intel, indent=2, default=str)[:4000]

    # Build the panel summary from step 1
    panel_summary = ""
    if consensus and consensus.get("panel"):
        panel_summary = "\n\n".join(
            f"{name}: {text[:500]}" for name, text in consensus["panel"].items()
        )
        panel_summary = (
            f"STRATEGIC CONSENSUS (from parallel LLM consultation):\n"
            f"{consensus.get('consensus', '')}\n\n"
            f"Individual panel perspectives:\n{panel_summary}"
        )

    brief_question = (
        f"Based on the competitive intel and strategic consensus below, write a complete "
        f"weekly marketing strategy brief for Evrnew LLC (insulation contractor, King/Snohomish/Skagit WA) "
        f"for the week of {today_str()}. "
        f"Include specific channel recommendations (Google Ads, Facebook/Instagram, SEO, Google Business Profile), "
        f"geographic priorities, messaging themes, action items, and KPIs. "
        f"Be specific and actionable. Never use em dashes.\n\n"
        f"COMPETITIVE INTEL:\n{context}\n\n"
        f"{panel_summary}"
    )

    log(AGENT_NAME, "Running second consensus panel for brief generation...")
    try:
        brief_consensus = call_consensus(brief_question)
        # The synthesized output IS the brief
        return brief_consensus.get("consensus", "[Brief generation failed]")
    except Exception as exc:
        log(AGENT_NAME, f"Brief consensus failed: {exc}", "warning")
        # Fallback: use step-1 consensus summary as the brief
        return consensus.get("consensus", f"[Brief unavailable: {exc}]") if consensus else f"[Brief unavailable: {exc}]"


def run() -> str:
    """Run the Weekly Strategy Agent. Returns the brief text."""
    log(AGENT_NAME, "=== Weekly Strategy Agent starting ===")

    # 1. Load competitive intel
    log(AGENT_NAME, "Loading recent competitive intel...")
    intel = load_recent_intel()
    log(AGENT_NAME, f"Loaded intel keys: {list(intel.keys())}")

    # 2. Run multi-LLM consensus panel
    consensus = run_consensus_panel(intel)

    # 3. Generate brief
    log(AGENT_NAME, "Generating weekly strategy brief with Grok...")
    brief = generate_strategy_brief(intel, consensus=consensus)

    # 4. Save
    filename = f"{today_str()}-weekly-brief.md"
    strategy_dir = DATA_DIR / "strategy"
    strategy_dir.mkdir(parents=True, exist_ok=True)
    out_path = strategy_dir / filename
    out_path.write_text(brief, encoding="utf-8")
    log(AGENT_NAME, f"Saved brief to {out_path}")

    # 5. Write to Supabase
    upsert_agent_output(AGENT_NAME, "weekly_brief", content=brief)
    log_activity("Agent run", "agent", AGENT_NAME, f"Weekly strategy brief generated and saved — {today_str()}")

    # 6. Telegram notification
    preview_lines = [l for l in brief.split("\n") if l.startswith("- ") or l.startswith("* ")][:4]
    preview = "\n".join(preview_lines) if preview_lines else brief[:300]
    tg_msg = (
        f"*Weekly Strategy Brief* ... {today_str()}\n\n"
        f"{preview}\n\n"
        f"_Full brief: data/strategy/{filename}_"
    )
    notify_telegram(tg_msg)

    print(f"\n[strategy] Brief saved to {out_path}")
    print(brief[:500] + "..." if len(brief) > 500 else brief)
    return brief


if __name__ == "__main__":
    run()
