"""
Email Drip Agent
Schedule: Weekly Tuesday at 9am
Generates 5-email nurture sequences for different lead types.
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

AGENT_NAME = "email-drip"
logger = get_logger(AGENT_NAME)

LEAD_TYPES = [
    {
        "id": "attic_insulation",
        "name": "Attic Insulation Inquiry",
        "description": "Homeowner inquired about attic insulation. Likely aware of high energy bills or comfort issues.",
        "pain_points": ["high heating/cooling bills", "uneven temperatures", "ice dams", "hot upstairs rooms"],
        "primary_service": "attic insulation",
        "rebate_eligible": True,
    },
    {
        "id": "crawl_space",
        "name": "Crawl Space Inquiry",
        "description": "Homeowner inquired about crawl space issues. Often concerned about moisture, odors, or pest entry.",
        "pain_points": ["moisture/mold smell", "cold floors", "pest problems", "high humidity"],
        "primary_service": "crawl space insulation and encapsulation",
        "rebate_eligible": False,
    },
    {
        "id": "commercial_spray_foam",
        "name": "Commercial / Spray Foam Inquiry",
        "description": "Business owner or property manager asking about commercial insulation or spray foam.",
        "pain_points": ["high commercial energy costs", "building code compliance", "noise reduction", "moisture control"],
        "primary_service": "commercial spray foam insulation",
        "rebate_eligible": False,
    },
    {
        "id": "post_estimate",
        "name": "Post-Estimate Follow-Up",
        "description": "Lead received an estimate but hasn't booked yet. Needs to be nurtured past objections.",
        "pain_points": ["price hesitation", "comparing quotes", "timing uncertainty", "financing concern"],
        "primary_service": "insulation (estimate provided)",
        "rebate_eligible": True,
    },
    {
        "id": "rebate_education",
        "name": "Rebate Education Series",
        "description": "Lead interested in energy rebates and incentives available in Washington State.",
        "pain_points": ["upfront cost concern", "unsure what rebates apply", "complex application process"],
        "primary_service": "insulation with rebate assistance",
        "rebate_eligible": True,
    },
]

EMAIL_COUNT = 5


def generate_drip_sequence(lead_type: dict) -> list[dict]:
    """Generate a 5-email drip sequence for a specific lead type using Grok."""
    system_prompt = (
        "You are an expert email copywriter for Evrnew LLC, a residential and commercial "
        "insulation contractor serving King, Snohomish, and Skagit counties in Washington State.\n\n"
        "Brand voice: Professional but approachable. Warm, knowledgeable. Local. "
        "Emphasize energy savings, comfort, home value. Build trust before selling.\n\n"
        "Email guidelines:\n"
        "- Subject lines: 40-60 characters, curiosity-driven or benefit-focused\n"
        "- Preview text: 80-100 characters, complements subject line\n"
        "- Body: conversational, 150-250 words, plain text format (minimal HTML)\n"
        "- CTA: one clear call-to-action per email, not too pushy in early emails\n"
        "- Signature: From Erel @ Evrnew LLC\n"
        "- Never use em dashes ... use ellipsis (...) instead\n"
        "- CAN-SPAM compliant: include unsubscribe note in each email\n"
        "- GDPR-aware: respectful, opt-out friendly tone\n"
        "- Sequence timing: Day 0, Day 2, Day 5, Day 10, Day 21"
    )

    user_prompt = f"""Generate a {EMAIL_COUNT}-email nurture sequence for this lead type:

LEAD TYPE: {lead_type['name']}
Description: {lead_type['description']}
Primary service: {lead_type['primary_service']}
Pain points: {', '.join(lead_type['pain_points'])}
Rebate eligible: {lead_type['rebate_eligible']}

Sequence structure:
1. Day 0 (immediate) — Welcome + acknowledge their interest, no hard sell
2. Day 2 — Educational content about their specific problem/service
3. Day 5 — Social proof (customer story / results) + soft CTA
4. Day 10 — Address common objections / rebates if applicable
5. Day 21 — Final gentle follow-up, make it easy to book or ask questions

For each email provide:
- send_day: number (0, 2, 5, 10, 21)
- subject: email subject line
- preview_text: preview/preheader text
- body: full email body text (plain text, use line breaks for paragraphs)
- cta_text: the call-to-action button/link text
- cta_action: what the CTA does (e.g., "Schedule free inspection", "Get rebate guide", "Call now")
- purpose: one-line summary of this email's goal

Return as JSON array of {EMAIL_COUNT} email objects. ONLY valid JSON, no markdown code blocks.
"""

    raw = call_llm(system_prompt, user_prompt, model="fast", max_tokens=3000).strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0].strip()

    try:
        emails = json.loads(raw)
        if not isinstance(emails, list):
            emails = [emails]
        return emails
    except json.JSONDecodeError:
        log(AGENT_NAME, f"JSON parse error for lead type {lead_type['id']}", "warning")
        return [{"send_day": i * 2, "raw": raw, "parse_error": True} for i in range(EMAIL_COUNT)]


def run() -> dict:
    """Run the Email Drip Agent. Returns all generated sequences."""
    log(AGENT_NAME, "=== Email Drip Agent starting ===")

    all_sequences: dict[str, list] = {}

    for lead_type in LEAD_TYPES:
        log(AGENT_NAME, f"Generating sequence for: {lead_type['name']}...")
        sequence = generate_drip_sequence(lead_type)
        all_sequences[lead_type["id"]] = sequence
        log(AGENT_NAME, f"Generated {len(sequence)} emails for {lead_type['id']}")

    output = {
        "date": today_str(),
        "generated_at": now_str(),
        "agent": AGENT_NAME,
        "sequences": all_sequences,
        "summary": {
            "total_sequences": len(all_sequences),
            "total_emails": sum(len(v) for v in all_sequences.values()),
            "lead_types": [lt["id"] for lt in LEAD_TYPES],
        },
    }

    # Save
    filename = f"{today_str()}-sequences.json"
    path = save_json(AGENT_NAME, filename, output)
    log(AGENT_NAME, f"Saved sequences to {path}")

    # Write to Supabase
    upsert_agent_output(AGENT_NAME, "email_drip", data=output)
    log_activity("Agent run", "agent", AGENT_NAME, f"Email drip sequences generated — {output['summary']['total_emails']} emails across {output['summary']['total_sequences']} sequences")

    # Telegram
    total_emails = output["summary"]["total_emails"]
    sequence_list = "\n".join(f"- {lt['name']}: {len(all_sequences.get(lt['id'], []))} emails" for lt in LEAD_TYPES)
    tg_msg = (
        f"*Email Drip Sequences Generated* ... {today_str()}\n\n"
        f"Total: {total_emails} emails across {len(LEAD_TYPES)} sequences\n\n"
        f"{sequence_list}\n\n"
        f"_File: data/email-drip/{filename}_"
    )
    notify_telegram(tg_msg)

    print(f"\n[email-drip] {total_emails} emails across {len(LEAD_TYPES)} sequences saved to {path}")
    for lt in LEAD_TYPES:
        seq = all_sequences.get(lt["id"], [])
        if seq and isinstance(seq[0], dict) and "subject" in seq[0]:
            print(f"  {lt['id']}: Email 1 subject: {seq[0].get('subject', 'N/A')}")

    return output


if __name__ == "__main__":
    run()
