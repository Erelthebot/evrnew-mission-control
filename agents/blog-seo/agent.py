"""
Blog & SEO Content Agent
Schedule: Every Monday and Thursday at 9am
Generates local SEO blog posts targeting PNW insulation keywords.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

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
)

AGENT_NAME = "blog-seo"
logger = get_logger(AGENT_NAME)

sys.path.insert(0, str(Path(__file__).parent.parent))
from shared import ghl_tool


def publish_to_ghl(post: dict) -> str | None:
    """Publish blog post to GHL as DRAFT via ghl_tool. Returns post ID or None."""
    import re
    content = post.get("content", "")

    def fm(key):
        m = re.search(rf'^{key}:\s*"([^"]+)"', content, re.MULTILINE)
        return m.group(1) if m else ""

    title    = fm("title") or post.get("title", "Untitled")
    meta_desc = fm("meta_description")
    slug     = fm("slug") or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

    parts   = content.split("---\n")
    body_md = parts[2].strip() if len(parts) >= 3 else content

    # Markdown → HTML
    text = body_md
    text = re.sub(r"^## (.+)$",  r"<h2>\1</h2>", text, flags=re.MULTILINE)
    text = re.sub(r"^### (.+)$", r"<h3>\1</h3>", text, flags=re.MULTILINE)
    text = re.sub(r"^# (.+)$",   r"<h1>\1</h1>", text, flags=re.MULTILINE)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    lines = text.split("\n")
    out, in_list = [], False
    for line in lines:
        if line.startswith("- "):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{line[2:]}</li>")
        else:
            if in_list:
                out.append("</ul>")
                in_list = False
            if line.strip() and not line.startswith("<"):
                out.append(f"<p>{line}</p>")
            else:
                out.append(line)
    if in_list:
        out.append("</ul>")
    html_body = "\n".join(out)

    result = ghl_tool.create_blog_post(
        title=title,
        html_body=html_body,
        slug=slug,
        meta_description=meta_desc,
        status="DRAFT",
    )
    if result:
        post_id = result.get("id", "")
        log(AGENT_NAME, f"GHL draft created: {post_id} | {title}")
        return post_id
    log(AGENT_NAME, f"GHL publish failed for: {title}", "error")
    return None

BLOG_TOPICS = [
    {
        "title_template": "Best Insulation for {city} Homes: What Actually Works in the PNW",
        "target_keyword": "best insulation {city} WA",
        "city": "Seattle",
        "intent": "informational, homeowner researching options",
        "word_count": 1200,
    },
    {
        "title_template": "Crawl Space Encapsulation in {city}: Cost, Benefits & What to Expect",
        "target_keyword": "crawl space encapsulation {city} WA",
        "city": "Everett",
        "intent": "commercial intent, homeowner ready to buy",
        "word_count": 1300,
    },
    {
        "title_template": "Attic Insulation Cost in {city}: 2026 Pricing Guide",
        "target_keyword": "attic insulation cost {city}",
        "city": "Marysville",
        "intent": "transactional, price-shopping",
        "word_count": 1100,
    },
    {
        "title_template": "WA State Energy Rebates for Insulation: How to Get Up to $2,400 Back in 2026",
        "target_keyword": "Washington state insulation rebate 2026",
        "city": None,
        "intent": "informational, cost-savings focused",
        "word_count": 1400,
    },
    {
        "title_template": "Spray Foam Insulation in {city}: Open Cell vs Closed Cell Explained",
        "target_keyword": "spray foam insulation {city}",
        "city": "Bellingham",
        "intent": "informational to commercial",
        "word_count": 1200,
    },
    {
        "title_template": "Rodent Damage to Attic Insulation: Signs, Risks & What to Do in {city}",
        "target_keyword": "rodent damaged insulation {city}",
        "city": "Snohomish",
        "intent": "urgent/problem-aware, looking for immediate help",
        "word_count": 1100,
    },
    {
        "title_template": "Crawl Space Insulation in {city}: Vapor Barriers, Encapsulation & Local Costs",
        "target_keyword": "crawl space insulation {city} WA",
        "city": "Arlington",
        "intent": "commercial intent",
        "word_count": 1200,
    },
    {
        "title_template": "Blown-In Insulation for {city} Attics: R-Value, Cost & Installation Guide",
        "target_keyword": "blown in insulation {city}",
        "city": "Bothell",
        "intent": "informational to commercial",
        "word_count": 1100,
    },
]


# ---------------------------------------------------------------------------
# DataForSEO keyword research
# ---------------------------------------------------------------------------

def research_keywords(seed_keyword: str, city: str | None) -> list[dict]:
    """Use DataForSEO to find related low-competition keywords."""
    login = os.environ.get("DATAFORSEO_LOGIN", "")
    password = os.environ.get("DATAFORSEO_PASSWORD", "")
    if not login or login == "REPLACE":
        log(AGENT_NAME, "DataForSEO not configured — using seed keyword only", "warning")
        return [{"keyword": seed_keyword, "search_volume": "unknown", "competition": "unknown"}]

    location = f"{city}, Washington, United States" if city else "Washington, United States"
    try:
        resp = httpx.post(
            "https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live",
            auth=(login, password),
            json=[{
                "keywords": [seed_keyword],
                "location_name": location,
                "language_name": "English",
                "include_adult_keywords": False,
            }],
            timeout=30,
        )
        data = resp.json()
        if data.get("status_code") == 20000:
            tasks = data.get("tasks", [])
            if tasks and tasks[0].get("result"):
                return tasks[0]["result"][:20]
    except Exception as exc:
        log(AGENT_NAME, f"DataForSEO keyword research error: {exc}", "error")
    return [{"keyword": seed_keyword}]


# ---------------------------------------------------------------------------
# Blog post generation
# ---------------------------------------------------------------------------

def generate_blog_post(topic: dict, keyword_data: list[dict]) -> dict:
    """Generate a full SEO blog post with frontmatter."""
    city = topic.get("city")
    title = topic["title_template"].format(city=city) if city else topic["title_template"].replace(" in {city}", "").replace(" {city}", "")
    target_kw = topic["target_keyword"].format(city=city) if city else topic["target_keyword"]
    word_count = topic["word_count"]

    related_kws = [kw.get("keyword", "") for kw in keyword_data[:10] if kw.get("keyword")]

    system = (
        "You are a senior SEO content strategist writing for Evrnew LLC, a local insulation "
        "contractor in Western Washington (King, Snohomish, Skagit counties).\n\n"
        "Writing standards:\n"
        "- Apply Google's E-E-A-T guidelines: demonstrate Experience, Expertise, "
        "Authoritativeness, Trustworthiness\n"
        "- Use the target keyword in the first 100 words, H1, and naturally throughout\n"
        "- Include local signals: city names, WA-specific rebate programs, PNW climate context\n"
        "- Structure with H2/H3 headings for featured snippet potential\n"
        "- Include a FAQ section with 3-5 questions targeting featured snippets\n"
        "- Add a clear CTA toward the end (free inspection offer)\n"
        "- Never use em dashes — use ellipsis (...) instead\n"
        "- Brand voice: professional but approachable, local expertise\n"
        "- Do NOT include schema markup JSON in the body; note it in recommendations\n"
    )

    prompt = f"""Write a complete SEO blog post with the following specs:

TITLE: {title}
TARGET KEYWORD: {target_kw}
RELATED KEYWORDS TO WEAVE IN: {', '.join(related_kws[:8])}
WORD COUNT TARGET: {word_count} words
USER INTENT: {topic['intent']}
CITY/REGION: {city or 'Washington State'}
TODAY'S DATE: {today_str()}

Return the response as a Markdown document with YAML frontmatter block at the top:

---
title: "..."
slug: "..."
meta_title: "..." (max 60 chars)
meta_description: "..." (max 160 chars)
target_keyword: "..."
secondary_keywords: ["...", "..."]
city: "..."
date: "{today_str()}"
schema_recommendations: "..."
---

[Full blog post body in Markdown follows]
"""

    try:
        content = call_llm(system, prompt, model="reasoning", max_tokens=3000)
        return {
            "title": title,
            "target_keyword": target_kw,
            "city": city,
            "content": content,
            "word_count_target": word_count,
            "generated": now_str(),
        }
    except Exception as exc:
        log(AGENT_NAME, f"Blog post generation error for '{title}': {exc}", "error")
        return {"title": title, "error": str(exc)}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run() -> list[dict]:
    """Run the Blog & SEO Agent. Returns list of generated post metadata."""
    log(AGENT_NAME, "=== Blog & SEO Agent starting ===")

    # Run 2 posts per execution (Mon/Thu cadence = ~8/month)
    topics_to_run = BLOG_TOPICS[:2]
    results: list[dict] = []

    for topic in topics_to_run:
        city = topic.get("city")
        seed_kw = topic["target_keyword"].format(city=city) if city else topic["target_keyword"]
        log(AGENT_NAME, f"Researching keywords for: {seed_kw}")
        keyword_data = research_keywords(seed_kw, city)

        log(AGENT_NAME, f"Generating blog post: {topic['title_template']}")
        post = generate_blog_post(topic, keyword_data)

        if "content" in post:
            city_slug = city.lower().replace(" ", "-") if city else "washington"
            filename = f"{today_str()}-{city_slug}-{topic['target_keyword'].split()[0]}.md"
            path = save_output(AGENT_NAME, filename, post["content"])
            post["file_path"] = str(path)
            log(AGENT_NAME, f"Saved: {path}")
            # Auto-publish to GHL as draft
            ghl_id = publish_to_ghl(post)
            post["ghl_post_id"] = ghl_id
            results.append(post)

    # Save metadata index
    meta_file = f"index-{today_str()}.json"
    meta_data = [
        {k: v for k, v in r.items() if k != "content"}
        for r in results
    ]
    save_output(AGENT_NAME, meta_file, json.dumps(meta_data, indent=2))

    # Telegram
    titles = [r["title"] for r in results]
    notify_telegram(
        f"*Blog & SEO Agent* — {today_str()}\n"
        f"Published {len(results)} posts:\n"
        + "\n".join(f"- {t}" for t in titles)
    )

    print(f"\n[blog-seo] Done. {len(results)} posts generated.")
    for r in results:
        print(f"  - {r['title']} => {r.get('file_path', 'error')}")
    return results


if __name__ == "__main__":
    run()
