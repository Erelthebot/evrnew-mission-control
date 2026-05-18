"""
Google & Meta Ads Agent
Schedule: Every 6 hours
Generates ad copy for Google Search and Facebook/Instagram, A/B/C ready.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

# Allow running standalone or as a module
sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.utils import (
    call_llm,
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

AGENT_NAME = "ads"
logger = get_logger(AGENT_NAME)

AD_GROUPS = [
    {
        "name": "attic_insulation",
        "keywords": ["attic insulation", "attic insulation cost", "blow in attic insulation"],
        "intent": "homeowner wants attic insulated, cost-focused",
    },
    {
        "name": "crawl_space",
        "keywords": ["crawl space insulation", "crawl space encapsulation", "vapor barrier crawl space"],
        "intent": "moisture/pest concern in crawl space",
    },
    {
        "name": "spray_foam",
        "keywords": ["spray foam insulation", "spray foam contractor", "open cell closed cell foam"],
        "intent": "homeowner or contractor seeking spray foam",
    },
    {
        "name": "energy_rebates",
        "keywords": ["energy rebates WA state", "insulation tax credit", "Puget Sound Energy rebate insulation"],
        "intent": "cost-sensitive, wants to offset price with rebates",
    },
    {
        "name": "rodent_damage",
        "keywords": ["rodent damaged insulation", "mouse in attic insulation", "rat insulation replacement"],
        "intent": "urgent — rodent discovered, needs remediation",
    },
]

CITIES = [
    "Seattle", "Everett", "Marysville", "Arlington", "Bellingham",
    "Monroe", "Bothell", "Kirkland", "Edmonds", "Mount Vernon",
]

HOOKS = [
    "energy savings up to 40%",
    "rodent season is here",
    "10-year workmanship warranty",
    "free inspection — no pressure",
    "WA state rebates available",
    "same-week scheduling",
    "family-owned, PNW local",
]


# ---------------------------------------------------------------------------
# Google Search ad generation
# ---------------------------------------------------------------------------

def generate_google_ads(ad_group: dict, city: str) -> list[dict]:
    """Generate 3 Google Search ad variants for an ad group + city."""
    system = (
        "You are an expert Google Ads copywriter for Evrnew LLC, a local insulation company "
        "in Western Washington. Write compelling, high-CTR responsive search ad copy.\n\n"
        "Rules:\n"
        "- Headlines: max 30 characters each, write 3 unique variants per slot\n"
        "- Descriptions: max 90 characters each\n"
        "- Include the city name naturally\n"
        "- Never use em dashes — use ellipsis (...) instead\n"
        "- Focus on one primary benefit per variant to enable true A/B testing\n"
        "- Never make claims you cannot substantiate (no '100% guaranteed' etc)\n"
    )

    prompt = f"""Create 3 complete Google Search ad variants (A, B, C) for this ad group.

AD GROUP: {ad_group['name']}
TARGET CITY: {city}, WA
KEYWORDS: {', '.join(ad_group['keywords'])}
USER INTENT: {ad_group['intent']}
HOOKS TO DRAW FROM: {', '.join(HOOKS)}

Return ONLY valid JSON — an array of 3 objects, each with:
- variant: "A" / "B" / "C"
- headline_1: str (max 30 chars)
- headline_2: str (max 30 chars)
- headline_3: str (max 30 chars)
- description_1: str (max 90 chars)
- description_2: str (max 90 chars)
- final_url_path: str (e.g. "/attic-insulation/marysville")
- primary_hook: str (what differentiator this variant leads with)
- estimated_ctr_notes: str (1-sentence rationale)
"""

    try:
        text = call_llm(system, prompt, model="fast", max_tokens=1500).strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)
    except Exception as exc:
        log(AGENT_NAME, f"Google ad gen error for {ad_group['name']}/{city}: {exc}", "error")
        return []


# ---------------------------------------------------------------------------
# Facebook/Instagram ad generation
# ---------------------------------------------------------------------------

def generate_meta_ads(ad_group: dict) -> list[dict]:
    """Generate 3 Facebook/Instagram ad variants for an ad group."""
    system = (
        "You are a Facebook/Instagram ad copywriter for Evrnew LLC, a local insulation company "
        "in Western Washington (King, Snohomish, Skagit counties).\n\n"
        "Primary competitor is Attic Projects Company — they run 1,300+ ads with polished "
        "national-brand feel. Evrnew's edge: authentic local PNW operator, family-owned, "
        "community knowledge, same-week availability.\n\n"
        "Rules:\n"
        "- Hook must stop the scroll in first 3 words\n"
        "- Never use em dashes — use ellipsis (...) instead\n"
        "- Keep body copy conversational and local-feeling\n"
        "- CTA must create urgency without fake scarcity\n"
    )

    prompt = f"""Generate 3 Facebook/Instagram ad variants (A, B, C) for this ad group.

AD GROUP: {ad_group['name']}
KEYWORDS / THEMES: {', '.join(ad_group['keywords'])}
USER INTENT: {ad_group['intent']}
AVAILABLE HOOKS: {', '.join(HOOKS)}

Return ONLY valid JSON — an array of 3 objects, each with:
- variant: "A" / "B" / "C"
- hook: str (first line, scroll-stopper, max 10 words)
- primary_text: str (ad body, 2-3 sentences, conversational)
- headline: str (below image, benefit-focused, max 40 chars)
- description: str (newsfeed link description, max 30 chars)
- cta_button: str (e.g. "Get Free Quote", "Learn More", "Call Now")
- creative_brief: str (describe ideal image/video for this ad in 2 sentences)
- target_audience: str (age, interests, behaviors to target)
- primary_hook_strategy: str (1-sentence rationale)
"""

    try:
        text = call_llm(system, prompt, model="fast", max_tokens=2000).strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)
    except Exception as exc:
        log(AGENT_NAME, f"Meta ad gen error for {ad_group['name']}: {exc}", "error")
        return []


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run() -> dict:
    """Run the Ads Agent. Returns summary dict."""
    log(AGENT_NAME, "=== Ads Agent starting ===")

    timestamp = datetime.now().strftime("%Y-%m-%d-%H%M")
    all_google_ads: list[dict] = []
    all_meta_ads: list[dict] = []

    # Google ads: all ad groups x top 3 cities
    log(AGENT_NAME, "Generating Google Search ads...")
    for ag in AD_GROUPS:
        for city in CITIES[:3]:  # Limit per run to manage API costs
            variants = generate_google_ads(ag, city)
            if variants:
                all_google_ads.append({
                    "ad_group": ag["name"],
                    "city": city,
                    "variants": variants,
                    "generated": now_str(),
                })
                log(AGENT_NAME, f"  Google ads OK: {ag['name']} / {city} ({len(variants)} variants)")

    # Meta ads: all ad groups
    log(AGENT_NAME, "Generating Meta (Facebook/Instagram) ads...")
    for ag in AD_GROUPS:
        variants = generate_meta_ads(ag)
        if variants:
            all_meta_ads.append({
                "ad_group": ag["name"],
                "platform": "facebook_instagram",
                "variants": variants,
                "generated": now_str(),
            })
            log(AGENT_NAME, f"  Meta ads OK: {ag['name']} ({len(variants)} variants)")

    # Save
    google_path = save_output(
        AGENT_NAME,
        f"google-ads-{timestamp}.json",
        json.dumps(all_google_ads, indent=2),
    )
    meta_path = save_output(
        AGENT_NAME,
        f"meta-ads-{timestamp}.json",
        json.dumps(all_meta_ads, indent=2),
    )
    log(AGENT_NAME, f"Saved Google ads to {google_path}")
    log(AGENT_NAME, f"Saved Meta ads to {meta_path}")

    # Write to Supabase
    ads_data = {"google": all_google_ads, "meta": all_meta_ads, "timestamp": timestamp}
    upsert_agent_output(AGENT_NAME, "ad_copy", data=ads_data)
    log_activity("Agent run", "agent", AGENT_NAME, f"Ad copy generated — Google: {len(all_google_ads)} groups, Meta: {len(all_meta_ads)} groups")

    # Telegram
    notify_telegram(
        f"*Ads Agent* complete — {timestamp}\n"
        f"Google: {len(all_google_ads)} ad groups x 3 variants\n"
        f"Meta: {len(all_meta_ads)} ad groups x 3 variants\n"
        f"_Files: data/ads/google-ads-{timestamp}.json_"
    )

    summary = {
        "google_ad_groups": len(all_google_ads),
        "meta_ad_groups": len(all_meta_ads),
        "google_file": str(google_path),
        "meta_file": str(meta_path),
        "timestamp": timestamp,
    }
    print(f"\n[ads] Done. Google: {len(all_google_ads)} groups, Meta: {len(all_meta_ads)} groups")
    return summary


if __name__ == "__main__":
    run()
