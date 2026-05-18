"""
GEO-SEO Agent
Schedule: Weekly on Monday at 9am
Runs AI search optimization audits on evrnew.com using Grok-3 for recommendations.
Checks citability, AI crawler access, schema, technical SEO, and E-E-A-T.
Saves results to data/geo-seo/ and reports summary to Telegram.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.utils import (
    call_llm,
    log,
    notify_telegram,
    save_output,
    today_str,
    now_str,
    load_env,
)

load_env()

AGENT_NAME = "geo-seo"

TARGET_URL = "https://evrnew.com"
DATA_DIR = Path.home() / "evrnew-marketing/data/geo-seo"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Helpers ──────────────────────────────────────────────────────────────────

def fetch_page(url: str) -> str:
    """Fetch raw HTML from a URL."""
    import urllib.request
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; EvrnewGeoBot/1.0)"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.read().decode("utf-8", errors="replace")
    except Exception as e:
        log(AGENT_NAME, f"fetch_page failed for {url}: {e}", "warning")
        return ""

def fetch_robots(base_url: str) -> str:
    return fetch_page(base_url.rstrip("/") + "/robots.txt")

def fetch_llms_txt(base_url: str) -> str:
    # Try primary location first (evrnew.com/llms.txt)
    content = fetch_page(base_url.rstrip("/") + "/llms.txt")
    if content and len(content) > 50 and "404" not in content[:200]:
        return content
    # Fallback: erel.evrnew.com/llms.txt (served directly from erel-master nginx)
    fallback = fetch_page("https://erel.evrnew.com/llms.txt")
    if fallback and len(fallback) > 50:
        return fallback
    return content or ""

def check_ai_crawler_access(robots_txt: str) -> dict:
    """Check if major AI crawlers are blocked in robots.txt."""
    AI_CRAWLERS = {
        "GPTBot": "OpenAI / ChatGPT",
        "ClaudeBot": "Anthropic / Claude",
        "PerplexityBot": "Perplexity AI",
        "Googlebot": "Google (AI Overviews)",
        "bingbot": "Bing / Copilot",
        "anthropic-ai": "Anthropic",
        "CCBot": "Common Crawl (training data)",
        "Google-Extended": "Google AI training",
        "FacebookBot": "Meta AI",
    }
    results = {}
    robots_lower = robots_txt.lower()
    # Simple heuristic: check if crawler is explicitly disallowed
    for bot, label in AI_CRAWLERS.items():
        blocked = False
        lines = robots_txt.splitlines()
        current_ua_matches = False
        for line in lines:
            stripped = line.strip()
            if stripped.lower().startswith("user-agent:"):
                ua = stripped[len("user-agent:"):].strip()
                current_ua_matches = (ua == "*" or ua.lower() == bot.lower())
            elif stripped.lower().startswith("disallow:") and current_ua_matches:
                path = stripped[len("disallow:"):].strip()
                if path == "/" or path == "/*":
                    blocked = True
        results[bot] = {"label": label, "blocked": blocked}
    return results

def extract_schema_types(html: str) -> list[str]:
    """Extract @type values from JSON-LD in the page."""
    import re, json as _json
    types = []
    for match in re.finditer(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
        try:
            data = _json.loads(match.group(1))
            if isinstance(data, dict):
                t = data.get("@type")
                if t:
                    types.append(t if isinstance(t, str) else str(t))
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        t = item.get("@type")
                        if t:
                            types.append(t if isinstance(t, str) else str(t))
        except Exception:
            pass
    return list(set(types))

def score_citability(html: str, url: str) -> dict:
    """Quick citability heuristics."""
    import re
    score = 0
    notes = []

    # Has structured headings
    if re.search(r'<h[1-3][^>]*>', html, re.I):
        score += 15
        notes.append("Has H1-H3 headings")
    else:
        notes.append("Missing structured headings")

    # Has FAQ or Q&A patterns
    if re.search(r'(frequently asked|faq|question)', html, re.I):
        score += 15
        notes.append("FAQ content detected")
    else:
        notes.append("No FAQ content found")

    # Has author/about signals
    if re.search(r'(author|written by|about us|our team)', html, re.I):
        score += 10
        notes.append("Author/E-E-A-T signals present")
    else:
        notes.append("No author/E-E-A-T signals")

    # Has local business signals
    if re.search(r'(washington|western wa|snohomish|marysville|bellingham)', html, re.I):
        score += 15
        notes.append("Local geo signals present")
    else:
        notes.append("Weak local geo signals")

    # Has statistics or data
    if re.search(r'\d+%|\$[\d,]+|\d+\s+(year|month|customer|project)', html, re.I):
        score += 10
        notes.append("Statistics/data present")
    else:
        notes.append("No statistics or data found")

    # JSON-LD schema present
    if re.search(r'application/ld\+json', html, re.I):
        score += 15
        notes.append("JSON-LD schema present")
    else:
        notes.append("No JSON-LD schema")

    # Has clear service descriptions
    if re.search(r'(attic insulation|crawl space|spray foam|blown.in)', html, re.I):
        score += 10
        notes.append("Clear service descriptions")
    else:
        notes.append("Service descriptions weak/missing")

    # Has contact info
    if re.search(r'(\(\d{3}\)|\d{3}[-.\s]\d{3}[-.\s]\d{4}|tel:|mailto:)', html, re.I):
        score += 10
        notes.append("Contact info present")
    else:
        notes.append("No contact info found")

    return {"score": min(score, 100), "notes": notes}

# ── Main audit ────────────────────────────────────────────────────────────────

def run_audit() -> dict:
    log(AGENT_NAME, f"Starting GEO-SEO audit for {TARGET_URL}")

    html = fetch_page(TARGET_URL)
    robots = fetch_robots(TARGET_URL)
    llms_txt = fetch_llms_txt(TARGET_URL)

    crawler_access = check_ai_crawler_access(robots)
    schema_types = extract_schema_types(html)
    citability = score_citability(html, TARGET_URL)

    blocked_crawlers = [f"{v['label']} ({k})" for k, v in crawler_access.items() if v["blocked"]]
    allowed_crawlers = [f"{v['label']} ({k})" for k, v in crawler_access.items() if not v["blocked"]]

    has_llms_txt = bool(llms_txt and len(llms_txt) > 50 and "404" not in llms_txt[:200])

    audit = {
        "date": today_str(),
        "url": TARGET_URL,
        "citability_score": citability["score"],
        "citability_notes": citability["notes"],
        "schema_types": schema_types,
        "has_llms_txt": has_llms_txt,
        "llms_txt_preview": llms_txt[:300] if has_llms_txt else None,
        "ai_crawlers": {
            "blocked": blocked_crawlers,
            "allowed": allowed_crawlers,
        },
        "robots_txt_found": bool(robots and "User-agent" in robots),
    }

    return audit

def generate_recommendations(audit: dict) -> str:
    """Use Grok-3 to generate actionable recommendations from audit data."""
    prompt = f"""You are an AI search optimization expert. Analyze this GEO-SEO audit for evrnew.com (insulation contractor in Western WA) and give 3-5 specific, actionable recommendations to improve AI search visibility (ChatGPT, Perplexity, Google AI Overviews).

Audit results:
- Citability score: {audit['citability_score']}/100
- Citability issues: {', '.join(audit['citability_notes'])}
- Schema types found: {', '.join(audit['schema_types']) if audit['schema_types'] else 'None'}
- llms.txt exists: {audit['has_llms_txt']}
- AI crawlers blocked: {', '.join(audit['ai_crawlers']['blocked']) if audit['ai_crawlers']['blocked'] else 'None'}
- AI crawlers allowed: {len(audit['ai_crawlers']['allowed'])} crawlers

Be specific to an insulation contractor. Focus on the highest-impact fixes first. Keep recommendations concise."""

    system = "You are an AI search optimization expert specializing in local service businesses."
    return call_llm(system, prompt, model="fast", max_tokens=600)

def format_telegram_report(audit: dict, recommendations: str) -> str:
    score = audit["citability_score"]
    score_emoji = "🟢" if score >= 70 else "🟡" if score >= 40 else "🔴"

    blocked = audit["ai_crawlers"]["blocked"]
    crawler_line = "None blocked" if not blocked else f"BLOCKED: {', '.join(blocked)}"

    schema = ', '.join(audit['schema_types']) if audit['schema_types'] else 'None found'
    llms = "Yes" if audit['has_llms_txt'] else "No - needs to be created"

    msg = f"""GEO-SEO Weekly Audit - {audit['date']}

{score_emoji} Citability Score: {score}/100

AI Crawler Access: {crawler_line}
Schema Markup: {schema}
llms.txt: {llms}

Recommendations:
{recommendations}

Full report saved to data/geo-seo/"""

    return msg

# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    start = time.time()
    log(AGENT_NAME, "GEO-SEO agent starting")

    try:
        audit = run_audit()
        recommendations = generate_recommendations(audit)

        # Save full audit JSON
        out_path = DATA_DIR / f"audit_{today_str()}.json"
        audit["recommendations"] = recommendations
        out_path.write_text(json.dumps(audit, indent=2))
        log(AGENT_NAME, f"Audit saved to {out_path}")

        # Report to Telegram
        msg = format_telegram_report(audit, recommendations)

        # Nag about pending GHL actions if schema still missing
        if not audit["schema_types"]:
            msg += "\n\nACTION NEEDED: JSON-LD schema still not in GHL head code. Snippet at data/geo-seo/ghl-head-snippet.html — paste into GHL Sites > evrnew.com > Settings > Custom Code > Head."

        notify_telegram(msg)

        elapsed = round(time.time() - start, 1)
        log(AGENT_NAME, f"GEO-SEO agent done in {elapsed}s")

    except Exception as e:
        log(AGENT_NAME, f"GEO-SEO agent failed: {e}", "error")
        notify_telegram(f"GEO-SEO audit failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
