"""
Competitive Intelligence Agent
Schedule: Daily at 6am
Monitors Facebook Ad Library, Google SERP rankings, and competitor ad spend.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

# Allow running standalone or as a module
sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.utils import (
    get_anthropic_client,
    get_logger,
    log,
    notify_telegram,
    save_output,
    today_str,
    now_str,
)

AGENT_NAME = "competitive"
logger = get_logger(AGENT_NAME)

TARGET_CITIES = [
    "Seattle", "Bellevue", "Everett", "Marysville", "Arlington",
    "Mount Vernon", "Bellingham", "Monroe", "Bothell", "Edmonds",
    "Lynnwood", "Shoreline", "Kenmore", "Kirkland", "Redmond",
    "Snohomish", "Lake Stevens", "Stanwood", "Burlington", "Anacortes",
]

COMPETITOR_NAMES = ["Attic Projects", "Attic Projects Company"]

INSULATION_KEYWORDS = [
    "insulation company",
    "attic insulation",
    "crawl space insulation",
    "spray foam insulation",
    "blown-in insulation",
    "crawl space encapsulation",
]


# ---------------------------------------------------------------------------
# DataForSEO SERP
# ---------------------------------------------------------------------------

def fetch_serp_rankings(keywords_cities: list[tuple[str, str]]) -> list[dict]:
    """Query DataForSEO SERP API for keyword+city combos. Returns list of results."""
    login = os.environ.get("DATAFORSEO_LOGIN", "")
    password = os.environ.get("DATAFORSEO_PASSWORD", "")
    if not login or login == "REPLACE":
        log(AGENT_NAME, "DataForSEO credentials not configured — skipping SERP", "warning")
        return [{"status": "skipped", "reason": "DataForSEO not configured"}]

    results: list[dict] = []
    tasks = [
        {
            "keyword": f"{kw} {city} WA",
            "location_name": f"{city}, Washington, United States",
            "language_name": "English",
            "device": "desktop",
            "depth": 10,
        }
        for kw, city in keywords_cities
    ]

    # Batch in groups of 100 (DataForSEO limit)
    for i in range(0, len(tasks), 100):
        batch = tasks[i : i + 100]
        try:
            resp = httpx.post(
                "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
                auth=(login, password),
                json=batch,
                timeout=60,
            )
            data = resp.json()
            if data.get("status_code") == 20000:
                results.extend(data.get("tasks", []))
            else:
                log(AGENT_NAME, f"DataForSEO error: {data.get('status_message')}", "warning")
        except Exception as exc:
            log(AGENT_NAME, f"DataForSEO SERP fetch error: {exc}", "error")

    return results


# ---------------------------------------------------------------------------
# SpyFu competitor intel
# ---------------------------------------------------------------------------

def fetch_spyfu_competitor(domain: str = "atticprojectscompany.com") -> dict:
    """Pull SpyFu keyword/ad spend data for a competitor domain."""
    api_key = os.environ.get("SPYFU_API_KEY", "")
    if not api_key or api_key == "REPLACE":
        log(AGENT_NAME, "SpyFu API key not configured — skipping", "warning")
        return {"status": "skipped", "reason": "SpyFu not configured"}

    try:
        url = "https://www.spyfu.com/apis/domain_stats_api/v2/getDomainStatsForExactDate"
        resp = httpx.get(
            url,
            params={"domain": domain, "api_key": api_key},
            timeout=30,
        )
        return resp.json()
    except Exception as exc:
        log(AGENT_NAME, f"SpyFu error: {exc}", "error")
        return {"status": "error", "error": str(exc)}


# ---------------------------------------------------------------------------
# BrowserBase — Facebook Ad Library scrape
# ---------------------------------------------------------------------------

def scrape_facebook_ad_library() -> list[dict]:
    """Use BrowserBase to scrape Facebook Ad Library for WA insulation ads."""
    api_key = os.environ.get("BROWSERBASE_API_KEY", "")
    project_id = os.environ.get("BROWSERBASE_PROJECT_ID", "")
    if not api_key:
        log(AGENT_NAME, "BROWSERBASE_API_KEY not set — skipping FB Ad Library scrape", "warning")
        return [{"status": "skipped", "reason": "BrowserBase not configured"}]

    ads: list[dict] = []
    search_terms = ["insulation Washington", "attic insulation Seattle", "crawl space insulation Everett"]

    try:
        # Create a BrowserBase session
        session_resp = httpx.post(
            "https://www.browserbase.com/v1/sessions",
            headers={"x-bb-api-key": api_key, "Content-Type": "application/json"},
            json={"projectId": project_id, "browserSettings": {"viewport": {"width": 1280, "height": 800}}},
            timeout=30,
        )
        if session_resp.status_code != 201:
            log(AGENT_NAME, f"BrowserBase session create failed: {session_resp.status_code}", "warning")
            return [{"status": "error", "reason": f"session create {session_resp.status_code}"}]

        session_id = session_resp.json().get("id")
        connect_url = session_resp.json().get("connectUrl", "")

        for term in search_terms:
            fb_url = (
                f"https://www.facebook.com/ads/library/?active_status=active"
                f"&ad_type=all&country=US&q={term.replace(' ', '+')}&search_type=keyword_unordered"
            )
            try:
                page_resp = httpx.get(
                    "https://www.browserbase.com/v1/sessions/" + session_id + "/navigate",
                    headers={"x-bb-api-key": api_key},
                    params={"url": fb_url},
                    timeout=30,
                )
                log(AGENT_NAME, f"FB Ad Library fetch for '{term}': {page_resp.status_code}")
                # In production, parse the returned HTML/DOM for ad cards
                ads.append({
                    "search_term": term,
                    "url": fb_url,
                    "status": "fetched",
                    "timestamp": now_str(),
                })
            except Exception as exc:
                log(AGENT_NAME, f"FB Ad Library scrape error for '{term}': {exc}", "warning")

        # Close session
        httpx.delete(
            f"https://www.browserbase.com/v1/sessions/{session_id}",
            headers={"x-bb-api-key": api_key},
            timeout=10,
        )

    except Exception as exc:
        log(AGENT_NAME, f"BrowserBase error: {exc}", "error")
        return [{"status": "error", "error": str(exc)}]

    return ads


# ---------------------------------------------------------------------------
# Claude synthesis
# ---------------------------------------------------------------------------

def generate_competitive_brief(
    serp_data: list[dict],
    spyfu_data: dict,
    fb_ads: list[dict],
) -> str:
    """Use Claude Sonnet to synthesize all competitive data into a brief."""
    client = get_anthropic_client()

    context = json.dumps(
        {
            "serp_sample": serp_data[:5],
            "spyfu": spyfu_data,
            "fb_ads": fb_ads[:10],
            "date": today_str(),
        },
        indent=2,
        default=str,
    )

    system_prompt = (
        "You are an expert competitive intelligence analyst for Evrnew LLC, "
        "a residential and commercial insulation company serving King, Snohomish, "
        "and Skagit counties in Washington State.\n\n"
        "Primary competitor: Attic Projects Company — runs 1,300+ Facebook ads, "
        "currently the only active paid advertiser in the PNW insulation space.\n\n"
        "Strategic opportunity: Snohomish County mid-cities and all of Skagit County "
        "have ZERO paid digital competition. Evrnew should dominate before competitors arrive.\n\n"
        "Write in a direct, executive-brief style. Never use em dashes. Use ellipsis (...) instead."
    )

    user_prompt = f"""Analyze this competitive intelligence data and produce a structured daily brief:

DATA:
{context}

Format your response as a Markdown document with these sections:
1. **Executive Summary** (3-5 bullet points, most important findings)
2. **Competitor Activity** (Attic Projects + others — new ads, copy changes, spend signals)
3. **SERP Changes** (who moved up/down for key terms, any new entrants)
4. **Immediate Opportunities** (gaps to exploit TODAY — especially Snohomish/Skagit)
5. **Threats** (anything requiring urgent defensive action)
6. **Recommended Actions** (prioritized, specific, actionable — max 5 items)

Today's date: {today_str()}
"""

    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return msg.content[0].text


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run() -> str:
    """Run the Competitive Intelligence Agent. Returns the brief text."""
    log(AGENT_NAME, "=== Competitive Intelligence Agent starting ===")

    # 1. Facebook Ad Library
    log(AGENT_NAME, "Scraping Facebook Ad Library...")
    fb_ads = scrape_facebook_ad_library()
    log(AGENT_NAME, f"FB ads fetched: {len(fb_ads)} results")

    # 2. SERP rankings — sample 3 keywords x 5 cities for speed
    log(AGENT_NAME, "Fetching SERP rankings...")
    kw_city_pairs = [
        (kw, city)
        for kw in INSULATION_KEYWORDS[:3]
        for city in TARGET_CITIES[:5]
    ]
    serp_data = fetch_serp_rankings(kw_city_pairs)
    log(AGENT_NAME, f"SERP tasks returned: {len(serp_data)}")

    # 3. SpyFu
    log(AGENT_NAME, "Fetching SpyFu competitor data...")
    spyfu_data = fetch_spyfu_competitor()

    # 4. Generate brief
    log(AGENT_NAME, "Generating competitive brief with Claude...")
    brief = generate_competitive_brief(serp_data, spyfu_data, fb_ads)

    # 5. Save
    filename = f"competitive-intel-{today_str()}.md"
    path = save_output(AGENT_NAME, filename, brief)
    log(AGENT_NAME, f"Saved brief to {path}")

    # 6. Save raw data
    raw = {"fb_ads": fb_ads, "serp_data": serp_data, "spyfu": spyfu_data, "generated": now_str()}
    save_output(AGENT_NAME, f"raw-data-{today_str()}.json", json.dumps(raw, indent=2, default=str))

    # 7. Telegram
    summary_lines = [l for l in brief.split("\n") if l.startswith("- ") or l.startswith("* ")][:5]
    tg_msg = (
        f"*Competitive Intel Brief* — {today_str()}\n\n"
        + "\n".join(summary_lines[:5])
        + f"\n\n_Full report: data/competitive/{filename}_"
    )
    notify_telegram(tg_msg)

    print(f"\n[competitive] Brief saved to {path}")
    print(brief[:500] + "..." if len(brief) > 500 else brief)
    return brief


if __name__ == "__main__":
    run()
