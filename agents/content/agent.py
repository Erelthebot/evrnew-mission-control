"""
General Content Agent
Schedule: Daily at 7am
Generates landing pages, email sequences, service page copy, FAQ content.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

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

AGENT_NAME = "content"
logger = get_logger(AGENT_NAME)

TARGET_CITIES = [
    "Marysville", "Arlington", "Monroe", "Bothell", "Bellingham",
    "Lake Stevens", "Stanwood", "Burlington", "Anacortes", "Snohomish",
    "Edmonds", "Lynnwood", "Shoreline", "Kenmore", "Mountlake Terrace",
]

SERVICES = [
    "attic_insulation",
    "crawl_space_encapsulation",
    "spray_foam",
    "rodent_proofing",
    "blown_in_insulation",
]

EMAIL_SEQUENCES = {
    "welcome": {
        "subject": "Welcome to Evrnew — here's what happens next",
        "day": 0,
        "goal": "Set expectations, build trust, introduce the brand",
    },
    "followup_d2": {
        "subject": "Quick question about your insulation project",
        "day": 2,
        "goal": "Re-engage, ask about timeline, offer to answer questions",
    },
    "value_add_d5": {
        "subject": "How much are you losing to air leaks? (free calculator inside)",
        "day": 5,
        "goal": "Deliver value, educate on energy loss, soft CTA",
    },
    "rebate_info_d7": {
        "subject": "You may qualify for up to $2,400 in WA state rebates",
        "day": 7,
        "goal": "Reduce price objection with rebate info, drive consultation",
    },
    "urgency_d14": {
        "subject": "Last chance: rodent season + winter pricing",
        "day": 14,
        "goal": "Create genuine urgency (seasonal timing), final strong CTA",
    },
}

FAQ_TOPICS = [
    "How much does attic insulation cost in Washington state?",
    "What R-value do I need for my attic in Seattle?",
    "Is crawl space encapsulation worth it in the Pacific Northwest?",
    "How long does spray foam insulation last?",
    "Can I get rebates for insulation in Washington state?",
    "How do I know if my attic insulation has rodent damage?",
    "What is the difference between open cell and closed cell spray foam?",
    "How long does attic insulation installation take?",
]


# ---------------------------------------------------------------------------
# Landing page generation
# ---------------------------------------------------------------------------

def generate_landing_page(city: str, service: str) -> str:
    """Generate landing page copy for a city + service combo."""
    service_name = service.replace("_", " ").title()

    system = (
        "You are a direct-response copywriter for Evrnew LLC, a local insulation contractor "
        "in Western Washington. You write high-converting landing page copy.\n\n"
        "Company positioning: Family-owned local operator. PNW expertise. "
        "10-year workmanship warranty. Same-week scheduling. Free inspection.\n\n"
        "Copy rules:\n"
        "- Lead with the most compelling benefit for the specific city/region\n"
        "- Use 'you' language, not 'we' language in the hero section\n"
        "- Never use em dashes — use ellipsis (...) instead\n"
        "- Include trust signals: years in business, service area, warranty\n"
        "- CTA: 'Get My Free Inspection' or 'Schedule Free Inspection'\n"
        "- Sections: Hero, Problem/Pain, Solution/Benefits, How It Works, "
        "Social Proof (template), FAQ (3 questions), Final CTA\n"
    )

    prompt = f"""Write complete landing page copy for:

CITY: {city}, WA
SERVICE: {service_name}
TODAY: {today_str()}

Include ALL sections with copywriting in each. Output as Markdown.
Mark each section clearly with ## headings.
"""

    try:
        return call_llm(system, prompt, model="reasoning", max_tokens=2500)
    except Exception as exc:
        log(AGENT_NAME, f"Landing page error {city}/{service}: {exc}", "error")
        return f"# Error generating landing page for {city} / {service}\n\n{exc}"


# ---------------------------------------------------------------------------
# Email sequence generation
# ---------------------------------------------------------------------------

def generate_email_sequence(sequence_key: str, lead_source: str = "organic") -> dict:
    """Generate a single email in a drip sequence."""
    seq = EMAIL_SEQUENCES[sequence_key]

    system = (
        "You are an email copywriter for Evrnew LLC, a local insulation company in WA.\n"
        "Write warm, conversational emails that feel like they're from a real local business "
        "owner, not a faceless corporation.\n"
        "Never use em dashes. Use ellipsis (...) instead.\n"
        "Compliance: include unsubscribe line placeholder at bottom.\n"
    )

    prompt = f"""Write email #{seq['day']} for the {lead_source} lead nurture sequence.

SUBJECT LINE: {seq['subject']}
DAY IN SEQUENCE: Day {seq['day']}
GOAL: {seq['goal']}
LEAD SOURCE: {lead_source}

Return as JSON with keys:
- subject: str
- preheader: str (preview text, max 90 chars)
- body_html: str (HTML email body, with inline styles for compatibility)
- body_text: str (plain text version)
- cta_text: str
- cta_url_placeholder: str (e.g. "{{INSPECTION_BOOKING_URL}}")
"""

    try:
        text = call_llm(system, prompt, model="reasoning", max_tokens=2000).strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)
    except Exception as exc:
        log(AGENT_NAME, f"Email sequence error {sequence_key}: {exc}", "error")
        return {"sequence_key": sequence_key, "error": str(exc)}


# ---------------------------------------------------------------------------
# FAQ content generation
# ---------------------------------------------------------------------------

def generate_faq_content() -> list[dict]:
    """Generate FAQ entries targeting featured snippet opportunities."""
    system = (
        "You are an SEO content writer for Evrnew LLC. Write FAQ answers optimized for "
        "Google featured snippets (direct, concise answer in first 2 sentences, then detail).\n"
        "Target Answer Box / People Also Ask format.\n"
        "Never use em dashes. Use ellipsis (...) instead.\n"
    )

    faqs = []
    for question in FAQ_TOPICS:
        prompt = f"""Write an SEO-optimized FAQ entry for this question:

QUESTION: {question}

Return JSON with:
- question: str
- answer_short: str (40-60 words, direct answer optimized for featured snippet)
- answer_full: str (150-200 words, comprehensive with local WA context)
- schema_faq_entry: str (JSON-LD FAQPage schema for this single Q&A)
"""
        try:
            text = call_llm(system, prompt, model="fast", max_tokens=600).strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            faqs.append(json.loads(text))
        except Exception as exc:
            log(AGENT_NAME, f"FAQ error for '{question}': {exc}", "warning")
            faqs.append({"question": question, "error": str(exc)})
    return faqs


# ---------------------------------------------------------------------------
# Service page copy
# ---------------------------------------------------------------------------

def generate_service_page(service: str) -> str:
    """Generate full service page copy for the website."""
    service_name = service.replace("_", " ").title()
    system = (
        "You are a website copywriter for Evrnew LLC. Write compelling service page copy "
        "that converts visitors and ranks in local SEO.\n"
        "Include: service description, benefits, process steps, service area mention, "
        "trust signals, and FAQ section.\n"
        "Never use em dashes. Use ellipsis (...) instead.\n"
    )
    prompt = f"""Write a complete service page for: {service_name}

Target region: King, Snohomish, Skagit counties, Western Washington
Output: Markdown with clear section headings
Include: H1, intro paragraph, 3-4 H2 sections, FAQ (3 questions), CTA
"""
    try:
        return call_llm(system, prompt, model="reasoning", max_tokens=2000)
    except Exception as exc:
        log(AGENT_NAME, f"Service page error {service}: {exc}", "error")
        return f"# Error: {service}\n{exc}"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run() -> dict:
    """Run the Content Agent. Returns summary of content generated."""
    log(AGENT_NAME, "=== Content Agent starting ===")
    summary: dict = {"landing_pages": [], "emails": [], "faqs": 0, "service_pages": []}

    # 1. Landing pages: 2 cities per run, rotating through services
    day_of_week = __import__("datetime").datetime.now().weekday()
    cities_today = TARGET_CITIES[day_of_week * 2 : day_of_week * 2 + 2]
    service_today = SERVICES[day_of_week % len(SERVICES)]

    for city in cities_today:
        log(AGENT_NAME, f"Generating landing page: {city} / {service_today}")
        copy = generate_landing_page(city, service_today)
        slug = f"{city.lower().replace(' ', '-')}-{service_today.replace('_', '-')}"
        filename = f"landing-{slug}-{today_str()}.md"
        path = save_output(AGENT_NAME, filename, copy)
        summary["landing_pages"].append({"city": city, "service": service_today, "file": str(path)})
        log(AGENT_NAME, f"  Saved: {path}")

    # 2. Email sequences: generate all 5 emails for 'google_ads' source
    log(AGENT_NAME, "Generating email sequences...")
    email_data: dict = {}
    for seq_key in list(EMAIL_SEQUENCES.keys())[:2]:  # 2 per day
        log(AGENT_NAME, f"  Email: {seq_key}")
        email = generate_email_sequence(seq_key, "google_ads")
        email_data[seq_key] = email
        summary["emails"].append(seq_key)

    email_path = save_output(AGENT_NAME, f"email-sequences-{today_str()}.json", json.dumps(email_data, indent=2))
    log(AGENT_NAME, f"  Saved emails to {email_path}")

    # 3. FAQ content (once per week — check if today's file exists)
    faq_file = Path.home() / f"evrnew-marketing/data/content/faq-{today_str()}.json"
    if not faq_file.exists() and day_of_week == 0:  # Mondays only
        log(AGENT_NAME, "Generating FAQ content...")
        faqs = generate_faq_content()
        save_output(AGENT_NAME, f"faq-{today_str()}.json", json.dumps(faqs, indent=2))
        summary["faqs"] = len(faqs)
        log(AGENT_NAME, f"  Generated {len(faqs)} FAQ entries")

    # 4. Service pages (one per day, rotating)
    log(AGENT_NAME, f"Generating service page: {service_today}")
    service_copy = generate_service_page(service_today)
    service_filename = f"service-{service_today.replace('_', '-')}-{today_str()}.md"
    service_path = save_output(AGENT_NAME, service_filename, service_copy)
    summary["service_pages"].append({"service": service_today, "file": str(service_path)})
    log(AGENT_NAME, f"  Saved: {service_path}")

    # Telegram
    notify_telegram(
        f"*Content Agent* — {today_str()}\n"
        f"Landing pages: {len(summary['landing_pages'])} ({', '.join(c['city'] for c in summary['landing_pages'])})\n"
        f"Emails: {len(summary['emails'])} sequences drafted\n"
        f"Service pages: {len(summary['service_pages'])}"
    )

    print(f"\n[content] Done.")
    print(f"  Landing pages: {len(summary['landing_pages'])}")
    print(f"  Emails: {len(summary['emails'])}")
    print(f"  Service pages: {len(summary['service_pages'])}")
    return summary


if __name__ == "__main__":
    run()
