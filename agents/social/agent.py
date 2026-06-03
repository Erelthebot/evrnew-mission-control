"""
Social Media Agent
Schedule: Daily at 8am
Generates social media posts for Facebook, Instagram, and Google Business Profile.
"""
from __future__ import annotations

import json
import os
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
    save_json,
    today_str,
    now_str,
    upsert_agent_output,
    log_activity,
)

AGENT_NAME = "social"
logger = get_logger(AGENT_NAME)

PLATFORMS = ["facebook", "instagram", "google_business"]

FACEBOOK_TOPICS = [
    "attic insulation energy savings",
    "crawl space moisture problems",
    "spray foam insulation benefits",
    "blown-in insulation for older homes",
    "insulation rebates and incentives WA",
    "crawl space encapsulation",
    "home comfort and insulation",
    "winter energy bills reduction",
]

INSTAGRAM_TOPICS = [
    "before and after attic insulation",
    "spray foam insulation transformation",
    "cozy home insulation tip",
    "crawl space clean and sealed",
    "energy efficient PNW home",
    "insulation crew at work",
]

GOOGLE_BUSINESS_TOPICS = [
    "attic insulation special offer",
    "crawl space inspection available",
    "free energy audit",
    "spray foam quote",
    "serving Seattle Everett Bellingham",
    "insulation rebate assistance",
]

SERVICE_AREAS = [
    "Seattle", "Bellevue", "Everett", "Marysville", "Arlington",
    "Mount Vernon", "Bellingham", "Snohomish County", "Skagit County",
]


def generate_posts(platform: str, topics: list[str], count: int = 3) -> list[dict]:
    """Generate posts for a given platform using Grok."""
    import random
    selected_topics = random.sample(topics, min(count, len(topics)))
    areas = random.sample(SERVICE_AREAS, 3)

    platform_instructions = {
        "facebook": (
            "Write educational, trust-building Facebook posts (150-300 words each). "
            "Focus on home improvement pain points, energy savings, and local expertise. "
            "Include a soft call-to-action. Use a warm, knowledgeable tone. "
            "No hashtags needed. End with a question to drive engagement."
        ),
        "instagram": (
            "Write visually-evocative Instagram captions (50-150 words each). "
            "Start with a hook line. Describe an aspirational outcome. "
            "Include 10-15 relevant hashtags at the end (mix of broad and niche: "
            "#InsulationContractor #AtticInsulation #SeattleHome #PNWHome #EnergyEfficiency etc). "
            "Use line breaks for readability."
        ),
        "google_business": (
            "Write short Google Business Profile update posts (75-150 words each). "
            "Be direct about services and offers. Include service area cities. "
            "Add a clear call-to-action with phone or website reference. "
            "Professional and concise tone."
        ),
    }

    system_prompt = (
        "You are a social media copywriter for Evrnew LLC, a residential and commercial "
        "insulation contractor serving King, Snohomish, and Skagit counties in Washington State.\n\n"
        "Services: spray foam, blown-in, batt insulation, crawl space encapsulation, attic insulation.\n"
        "Brand voice: Professional but approachable. Emphasize energy savings, comfort, home value, "
        "local expertise. Target: PNW homeowners. Never use em dashes ... use ellipsis (...) instead.\n\n"
        f"Platform: {platform.upper().replace('_', ' ')}\n"
        f"{platform_instructions[platform]}"
    )

    user_prompt = f"""Generate {count} unique social media posts for {platform.upper().replace('_', ' ')}.

Topics to cover (one per post):
{chr(10).join(f'- {t}' for t in selected_topics)}

Service areas to naturally mention where relevant: {', '.join(areas)}

Today's date: {today_str()}

Return a JSON array with {count} objects, each with:
- "topic": the topic covered
- "caption": the full post text
- "platform": "{platform}"
- "suggested_image": brief description of ideal image/photo to pair with this post

Return ONLY valid JSON, no markdown code blocks.
"""

    raw = call_llm(system_prompt, user_prompt, model="fast", max_tokens=2000).strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0].strip()

    try:
        posts = json.loads(raw)
        if not isinstance(posts, list):
            posts = [posts]
        return posts
    except json.JSONDecodeError:
        log(AGENT_NAME, f"JSON parse error for {platform}, saving raw text", "warning")
        return [{"platform": platform, "topic": t, "caption": raw, "suggested_image": ""} for t in selected_topics]


def run() -> dict:
    """Run the Social Media Agent. Returns dict of all generated posts."""
    log(AGENT_NAME, "=== Social Media Agent starting ===")

    all_posts: dict[str, list] = {}

    # Generate posts for each platform
    platform_configs = [
        ("facebook", FACEBOOK_TOPICS, 3),
        ("instagram", INSTAGRAM_TOPICS, 3),
        ("google_business", GOOGLE_BUSINESS_TOPICS, 3),
    ]

    for platform, topics, count in platform_configs:
        log(AGENT_NAME, f"Generating {count} posts for {platform}...")
        posts = generate_posts(platform, topics, count)
        all_posts[platform] = posts
        log(AGENT_NAME, f"Generated {len(posts)} posts for {platform}")

    # Build output
    output = {
        "date": today_str(),
        "generated_at": now_str(),
        "agent": AGENT_NAME,
        "posts": all_posts,
        "total_posts": sum(len(v) for v in all_posts.values()),
    }

    # Save
    filename = f"{today_str()}-posts.json"
    path = save_json(AGENT_NAME, filename, output)
    log(AGENT_NAME, f"Saved posts to {path}")

    # Write to Supabase
    upsert_agent_output(AGENT_NAME, "social_posts", data=output)
    log_activity("Agent run", "agent", AGENT_NAME, f"Social posts generated — {output['total_posts']} posts across {len(all_posts)} platforms")

    # Telegram notification
    total = output["total_posts"]
    platform_summary = ", ".join(f"{k.replace('_', ' ')}: {len(v)}" for k, v in all_posts.items())
    tg_msg = (
        f"*Social Media Posts Generated* ... {today_str()}\n\n"
        f"Total: {total} posts\n"
        f"{platform_summary}\n\n"
        f"_File: data/social/{filename}_"
    )
    notify_telegram(tg_msg)

    print(f"\n[social] {total} posts saved to {path}")
    for platform, posts in all_posts.items():
        print(f"\n--- {platform.upper()} ---")
        for p in posts[:1]:
            preview = p.get("caption", "")[:200]
            print(f"  {preview}...")

    return output


if __name__ == "__main__":
    run()
