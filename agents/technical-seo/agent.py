"""
Technical SEO Agent
Schedule: Weekly Wednesday at 10am
Generates technical SEO audit checklist and schema markup for evrnew.com.
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
)

AGENT_NAME = "technical-seo"
logger = get_logger(AGENT_NAME)

SERVICE_AREA_CITIES = [
    "Seattle", "Bellevue", "Everett", "Marysville", "Arlington",
    "Mount Vernon", "Bellingham", "Monroe", "Bothell", "Edmonds",
    "Lynnwood", "Shoreline", "Kenmore", "Kirkland", "Redmond",
    "Snohomish", "Lake Stevens", "Stanwood", "Burlington", "Anacortes",
]

SITE_PAGES = [
    {"url": "/", "title_target": "Insulation Contractor Seattle WA | Evrnew LLC", "type": "homepage"},
    {"url": "/attic-insulation", "title_target": "Attic Insulation Seattle & Snohomish County | Evrnew", "type": "service"},
    {"url": "/crawl-space-insulation", "title_target": "Crawl Space Insulation & Encapsulation | Evrnew LLC", "type": "service"},
    {"url": "/spray-foam-insulation", "title_target": "Spray Foam Insulation Contractor WA | Evrnew LLC", "type": "service"},
    {"url": "/blown-in-insulation", "title_target": "Blown-In Insulation Bellevue Everett WA | Evrnew", "type": "service"},
    {"url": "/commercial-insulation", "title_target": "Commercial Insulation Contractor PNW | Evrnew LLC", "type": "service"},
    {"url": "/service-area", "title_target": "Insulation Service Area | King Snohomish Skagit County", "type": "area"},
    {"url": "/contact", "title_target": "Contact Evrnew LLC | Free Insulation Quote", "type": "contact"},
    {"url": "/about", "title_target": "About Evrnew LLC | Local Insulation Experts", "type": "about"},
    {"url": "/blog", "title_target": "Insulation Tips & Resources | Evrnew LLC Blog", "type": "blog"},
]


def generate_local_business_schema() -> dict:
    """Generate LocalBusiness JSON-LD schema for Evrnew LLC."""
    schema = {
        "@context": "https://schema.org",
        "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
        "name": "Evrnew LLC",
        "alternateName": "Evrnew Insulation",
        "description": (
            "Professional insulation contractor serving King, Snohomish, and Skagit counties "
            "in Washington State. Specializing in spray foam, blown-in, batt insulation, "
            "crawl space encapsulation, and attic insulation for residential and commercial properties."
        ),
        "url": "https://evrnew.com",
        "telephone": "+1-XXX-XXX-XXXX",
        "email": "info@evrnew.com",
        "priceRange": "$$",
        "currenciesAccepted": "USD",
        "paymentAccepted": "Cash, Check, Credit Card, Financing",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Everett",
            "addressRegion": "WA",
            "addressCountry": "US",
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": 47.9790,
            "longitude": -122.2021,
        },
        "areaServed": [
            {
                "@type": "AdministrativeArea",
                "name": "King County, Washington",
            },
            {
                "@type": "AdministrativeArea",
                "name": "Snohomish County, Washington",
            },
            {
                "@type": "AdministrativeArea",
                "name": "Skagit County, Washington",
            },
        ] + [
            {"@type": "City", "name": f"{city}, Washington"} for city in SERVICE_AREA_CITIES
        ],
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Insulation Services",
            "itemListElement": [
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Spray Foam Insulation"}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Blown-In Insulation"}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Batt Insulation"}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Attic Insulation"}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Crawl Space Insulation"}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Crawl Space Encapsulation"}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Commercial Insulation"}},
            ],
        },
        "openingHoursSpecification": [
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "opens": "07:00",
                "closes": "18:00",
            },
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "Saturday",
                "opens": "08:00",
                "closes": "14:00",
            },
        ],
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "47",
            "bestRating": "5",
            "worstRating": "1",
        },
        "sameAs": [
            "https://www.facebook.com/evrnew",
            "https://www.instagram.com/evrnew",
        ],
    }
    return schema


def generate_page_seo_checklist(pages: list[dict]) -> list[dict]:
    """Generate page-by-page SEO checklist using Grok."""
    system_prompt = (
        "You are a technical SEO expert specializing in local service businesses. "
        "Generate detailed, actionable SEO checklists for a home services contractor website.\n\n"
        "Company: Evrnew LLC — insulation contractor, King/Snohomish/Skagit County WA.\n"
        "Never use em dashes ... use ellipsis (...) instead."
    )

    user_prompt = f"""Generate a technical SEO checklist for each of these pages on evrnew.com.

PAGES:
{json.dumps(pages, indent=2)}

For each page, provide:
1. Recommended meta title (60 chars max, include primary keyword + location)
2. Recommended meta description (155 chars max, include CTA)
3. Primary H1 recommendation
4. Secondary H2 recommendations (3-4)
5. Primary keyword target
6. Secondary keywords (3-5)
7. Internal linking opportunities (which pages should link to/from this page)
8. Content gap: what content is likely missing that competitors have
9. Local SEO notes: geo-specific optimizations for this page type
10. Schema type: which additional schema to add beyond LocalBusiness

Return as a JSON array where each object has: url, meta_title, meta_description, h1, h2s, primary_keyword, secondary_keywords, internal_links, content_gap, local_seo_notes, schema_type.

Return ONLY valid JSON, no markdown code blocks.
"""

    raw = call_llm(system_prompt, user_prompt, model="fast", max_tokens=3000).strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0].strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        log(AGENT_NAME, "JSON parse error for page checklist", "warning")
        return [{"raw": raw}]


def identify_keyword_opportunities() -> list[dict]:
    """Use Grok to identify top local keyword opportunities."""
    system_prompt = (
        "You are a local SEO keyword research specialist for home services contractors in Washington State. "
        "Identify high-value, achievable keyword opportunities with local commercial intent.\n"
        "Never use em dashes ... use ellipsis (...) instead."
    )

    user_prompt = f"""Identify the top 25 local keyword opportunities for Evrnew LLC, an insulation contractor.

Service area: King, Snohomish, Skagit County WA
Key cities: Seattle, Bellevue, Everett, Marysville, Arlington, Mount Vernon, Bellingham
Services: spray foam, blown-in, batt, attic insulation, crawl space insulation/encapsulation, commercial

Focus on:
1. High commercial intent (ready-to-buy searches)
2. Local modifier keywords (city + service)
3. Problem-aware keywords (drafty home, high energy bills, moisture in crawl space)
4. Competitor gap keywords (where Evrnew has no content but competitors rank)
5. Long-tail gems with lower competition

For each keyword provide:
- keyword: the exact search phrase
- estimated_monthly_searches: rough estimate (low/medium/high)
- competition: low/medium/high
- intent: informational/commercial/transactional
- target_page: which site page should rank (existing or suggest new)
- priority: 1-5 (5 = highest)
- rationale: why this keyword is valuable

Return as JSON array. ONLY valid JSON, no markdown.
"""

    raw = call_llm(system_prompt, user_prompt, model="fast", max_tokens=2500).strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0].strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        log(AGENT_NAME, "JSON parse error for keyword opportunities", "warning")
        return [{"raw": raw}]


def run() -> dict:
    """Run the Technical SEO Agent. Returns full audit output."""
    log(AGENT_NAME, "=== Technical SEO Agent starting ===")

    # 1. Generate LocalBusiness schema
    log(AGENT_NAME, "Generating LocalBusiness JSON-LD schema...")
    schema = generate_local_business_schema()
    log(AGENT_NAME, "Schema generated")

    # 2. Page-by-page checklist
    log(AGENT_NAME, "Generating page SEO checklist with Grok-3...")
    page_checklist = generate_page_seo_checklist(SITE_PAGES)
    log(AGENT_NAME, f"Page checklist: {len(page_checklist)} pages")

    # 3. Keyword opportunities
    log(AGENT_NAME, "Identifying keyword opportunities with Grok-3...")
    keywords = identify_keyword_opportunities()
    log(AGENT_NAME, f"Keywords identified: {len(keywords)}")

    # 4. Build output
    output = {
        "date": today_str(),
        "generated_at": now_str(),
        "agent": AGENT_NAME,
        "local_business_schema": schema,
        "page_seo_checklist": page_checklist,
        "keyword_opportunities": keywords,
        "summary": {
            "pages_audited": len(page_checklist),
            "keywords_identified": len(keywords),
            "schema_types_generated": ["LocalBusiness", "HomeAndConstructionBusiness"],
        },
    }

    # 5. Save
    filename = f"{today_str()}-technical-seo.json"
    path = save_json(AGENT_NAME, filename, output)
    log(AGENT_NAME, f"Saved to {path}")

    # Also save schema as standalone file for easy copy-paste
    schema_path = path.parent / f"{today_str()}-local-business-schema.json"
    schema_path.write_text(json.dumps(schema, indent=2), encoding="utf-8")
    log(AGENT_NAME, f"Schema also saved to {schema_path}")

    # 6. Telegram
    top_kw = sorted(
        [k for k in keywords if isinstance(k, dict) and "priority" in k],
        key=lambda x: x.get("priority", 0), reverse=True
    )[:3]
    kw_preview = "\n".join(f"- {k.get('keyword', '')}" for k in top_kw)
    tg_msg = (
        f"*Technical SEO Audit* ... {today_str()}\n\n"
        f"Pages audited: {len(page_checklist)}\n"
        f"Keywords identified: {len(keywords)}\n\n"
        f"Top keywords:\n{kw_preview}\n\n"
        f"_File: data/technical-seo/{filename}_"
    )
    notify_telegram(tg_msg)

    print(f"\n[technical-seo] Audit saved to {path}")
    return output


if __name__ == "__main__":
    run()
