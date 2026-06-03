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
# Brave Search SERP fallback (used when DataForSEO is not configured)
# ---------------------------------------------------------------------------

def fetch_serp_brave(keywords_cities: list[tuple[str, str]]) -> list[dict]:
    """Fallback SERP using Brave Search API. Free and already configured."""
    api_key = os.environ.get("BRAVE_API_KEY", "")
    if not api_key:
        log(AGENT_NAME, "BRAVE_API_KEY not set — SERP data unavailable", "warning")
        return [{"status": "skipped", "reason": "No SERP API available"}]

    results: list[dict] = []
    import time
    for kw, city in keywords_cities[:10]:  # cap at 10 to avoid rate limits
        query = f"{kw} {city} WA"
        try:
            resp = httpx.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={"Accept": "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": api_key},
                params={"q": query, "count": 10, "country": "us"},
                timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                web_results = data.get("web", {}).get("results", [])
                results.append({
                    "keyword": query,
                    "source": "brave",
                    "results": [{"url": r.get("url"), "title": r.get("title"), "position": i+1}
                                 for i, r in enumerate(web_results)],
                })
            else:
                log(AGENT_NAME, f"Brave SERP error {resp.status_code} for '{query}'", "warning")
            time.sleep(1)  # polite rate limiting
        except Exception as exc:
            log(AGENT_NAME, f"Brave SERP exception for '{query}': {exc}", "warning")

    log(AGENT_NAME, f"Brave SERP: {len(results)} queries completed")
    return results


# ---------------------------------------------------------------------------
# DataForSEO SERP
# ---------------------------------------------------------------------------

CITY_LOCATION_CODES = {
    "Seattle": 1027744,
    "Bellevue": 1027509,
    "Everett": 1027583,
    "Marysville": 1027654,
    "Arlington": 1027503,
    "Mount Vernon": 1027669,
    "Bellingham": 1027510,
    "Monroe": 1027664,
    "Bothell": 1027517,
    "Edmonds": 1027576,
    "Lynnwood": 1027647,
    "Shoreline": 9052842,
    "Kenmore": 1027621,
    "Kirkland": 1027627,
    "Redmond": 1027725,
    "Snohomish": 1027753,
    "Lake Stevens": 1027634,
    "Stanwood": 1027764,
    "Burlington": 1027527,
    "Anacortes": 1027501,
}

def fetch_serp_rankings(keywords_cities: list[tuple[str, str]]) -> list[dict]:
    """Query DataForSEO SERP API for keyword+city combos. Returns list of results.
    
    Fixes:
    - Uses location_code (int) instead of location_name (not supported on live/advanced)
    - Sends one task per request (live/advanced does not support batching)
    """
    login = os.environ.get("DATAFORSEO_LOGIN", "")
    password = os.environ.get("DATAFORSEO_PASSWORD", "")
    if not login or login == "REPLACE":
        log(AGENT_NAME, "DataForSEO credentials not configured — falling back to Brave Search SERP", "warning")
        return fetch_serp_brave(keywords_cities)

    results: list[dict] = []

    for kw, city in keywords_cities:
        location_code = CITY_LOCATION_CODES.get(city)
        if not location_code:
            log(AGENT_NAME, f"No location code for '{city}' — skipping", "warning")
            continue
        task = [{
            "keyword": f"{kw} {city} WA",
            "location_code": location_code,
            "language_code": "en",
            "device": "desktop",
            "depth": 10,
        }]
        try:
            resp = httpx.post(
                "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
                auth=(login, password),
                json=task,
                timeout=30,
            )
            data = resp.json()
            if data.get("status_code") == 20000:
                results.extend(data.get("tasks", []))
            else:
                log(AGENT_NAME, f"DataForSEO error for '{kw}/{city}': {data.get('status_message')}", "warning")
        except Exception as exc:
            log(AGENT_NAME, f"DataForSEO SERP fetch error for '{kw}/{city}': {exc}", "error")

    return results


# ---------------------------------------------------------------------------
# SpyFu competitor intel
# ---------------------------------------------------------------------------

SPYFU_COMPETITORS = [
    "pacificpartnersinsulationnorth.com",
    "cleancrawls.com",
    "truteam.com",
    "specialtyinsulation.com",
    "insulationco.com",
    "316insulationservices.com",
    "sprayfoamforyou.com",
    "goarrowinc.com",
]

def fetch_spyfu_competitor(domain: str = "retrofoamofmichigan.com") -> dict:
    """Pull SpyFu domain stats for a competitor. Uses HTTP Basic Auth (api_id:secret)."""
    api_id = os.environ.get("SPYFU_API_ID", "")
    secret = os.environ.get("SPYFU_SECRET_KEY", "")
    if not api_id or not secret:
        log(AGENT_NAME, "SpyFu credentials not configured — skipping", "warning")
        return {"status": "skipped", "reason": "SpyFu not configured"}

    try:
        url = "https://www.spyfu.com/apis/domain_stats_api/v2/getLatestDomainStats"
        resp = httpx.get(
            url,
            params={"domain": domain, "countryCode": "US", "pastNMonths": 3},
            auth=(api_id, secret),
            timeout=30,
        )
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results", [])
            latest = results[-1] if results else {}
            return {
                "status": "ok",
                "domain": domain,
                "source": "spyfu_domain_stats",
                "organic_keywords": latest.get("totalOrganicResults", 0),
                "monthly_organic_clicks": latest.get("monthlyOrganicClicks", 0),
                "monthly_organic_value": latest.get("monthlyOrganicValue", 0),
                "monthly_ppc_budget": latest.get("monthlyBudget", 0),
                "strength": latest.get("strength", 0),
                "avg_organic_rank": latest.get("averageOrganicRank", 0),
            }
        else:
            log(AGENT_NAME, f"SpyFu {resp.status_code} for {domain}", "warning")
            return {"status": "error", "domain": domain, "code": resp.status_code}
    except Exception as exc:
        log(AGENT_NAME, f"SpyFu exception for {domain}: {exc}", "warning")
        return {"status": "error", "error": str(exc)}

def fetch_spyfu_all_competitors() -> list:
    """Fetch SpyFu stats for all configured competitor domains."""
    return [fetch_spyfu_competitor(d) for d in SPYFU_COMPETITORS]


# ---------------------------------------------------------------------------
# BrowserBase — Facebook Ad Library scrape
# ---------------------------------------------------------------------------

def scrape_facebook_ad_library() -> list[dict]:
    """Monitor competitor ads via BrowserBase (primary) or Brave Search fallback (if BrowserBase quota exceeded)."""
    api_key = os.environ.get("BROWSERBASE_API_KEY", "")
    project_id = os.environ.get("BROWSERBASE_PROJECT_ID", "")
    brave_key = os.environ.get("BRAVE_API_KEY", "")

    if api_key and project_id:
        try:
            import time
            session_resp = httpx.post(
                "https://www.browserbase.com/v1/sessions",
                headers={"x-bb-api-key": api_key, "Content-Type": "application/json"},
                json={"projectId": project_id},
                timeout=30,
            )
            if session_resp.status_code == 402:
                log(AGENT_NAME, "BrowserBase quota exceeded (402) — falling back to Brave competitor ad search", "warning")
                return _brave_competitor_ad_fallback(brave_key)
            elif session_resp.status_code != 201:
                log(AGENT_NAME, f"BrowserBase session failed: {session_resp.status_code} — using Brave fallback", "warning")
                return _brave_competitor_ad_fallback(brave_key)
            # BrowserBase session created successfully
            session_id = session_resp.json().get("id")
            log(AGENT_NAME, f"BrowserBase session created: {session_id}", "info")
            # For now return placeholder — full CDP implementation can be added later
            return [{"status": "ok", "source": "browserbase", "session_id": session_id, "note": "Session created, CDP scrape pending"}]
        except Exception as exc:
            log(AGENT_NAME, f"BrowserBase exception: {exc} — using Brave fallback", "warning")
            return _brave_competitor_ad_fallback(brave_key)
    else:
        log(AGENT_NAME, "BrowserBase not configured — using Brave competitor search fallback", "warning")
        return _brave_competitor_ad_fallback(brave_key)


def _brave_competitor_ad_fallback(brave_key: str) -> list[dict]:
    """Use Brave Search to find competitor advertising activity as FB Ad Library fallback."""
    if not brave_key:
        return [{"status": "skipped", "reason": "No Brave API key for fallback"}]

    queries = [
        "insulation contractor Seattle WA sponsored ads",
        "attic insulation Everett WA Google Ads",
        "spray foam insulation Washington state advertising",
    ]
    results = []
    import time
    for q in queries:
        try:
            resp = httpx.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={"Accept": "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": brave_key},
                params={"q": q, "count": 5, "country": "us"},
                timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                web = data.get("web", {}).get("results", [])
                results.append({
                    "status": "ok",
                    "source": "brave_fallback",
                    "query": q,
                    "results": [{"url": r.get("url"), "title": r.get("title")} for r in web],
                })
            time.sleep(1)
        except Exception as exc:
            results.append({"status": "error", "query": q, "error": str(exc)})
    return results

def generate_competitive_brief(
    serp_data: list[dict],
    spyfu_data: dict,
    fb_ads: list[dict],
) -> str:
    """Use Grok to synthesize all competitive data into a brief."""
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

    return call_llm(system_prompt, user_prompt, model="fast", max_tokens=2000)


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
    log(AGENT_NAME, "Generating competitive brief with Grok-3...")
    brief = generate_competitive_brief(serp_data, spyfu_data, fb_ads)

    # 5. Save
    filename = f"competitive-intel-{today_str()}.md"
    path = save_output(AGENT_NAME, filename, brief)
    log(AGENT_NAME, f"Saved brief to {path}")

    # 6. Save raw data
    raw = {"fb_ads": fb_ads, "serp_data": serp_data, "spyfu": spyfu_data, "generated": now_str()}
    save_output(AGENT_NAME, f"raw-data-{today_str()}.json", json.dumps(raw, indent=2, default=str))

    # 7. Write to Supabase
    upsert_agent_output(AGENT_NAME, "competitive_intel", content=brief)
    log_activity("Agent run", "agent", AGENT_NAME, f"Competitive intel brief generated — {today_str()}")

    # 8. Telegram
    summary_lines = [l for l in brief.split("\n") if l.startswith("- ") or l.startswith("* ")][:5]
    tg_msg = (
        f"*Competitive Intel Brief* — {today_str()}\n\n"
        + "\n".join(summary_lines[:5])
        + f"\n\n_Full report: data/competitive/{filename}_"
    )
    notify_telegram(tg_msg)
    # SMS alert for urgent competitive threats
    threat_lines = [l for l in brief.split("\n") if any(w in l.lower() for w in ("threat", "urgent", "immediate", "new competitor"))][:2]
    if threat_lines:
        notify_sms(f"[Evrnew] Competitive alert {today_str()}: {threat_lines[0][:120]}")

    print(f"\n[competitive] Brief saved to {path}")
    print(brief[:500] + "..." if len(brief) > 500 else brief)
    return brief


if __name__ == "__main__":
    run()
