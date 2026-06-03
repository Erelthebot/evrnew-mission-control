"""
GoHighLevel CRM tool for Erel agents.
Central client for all GHL API operations.
All functions return plain dicts/lists ready for LLM consumption.

locationId: 4DKapRFZCHMehBPjCKKU
API version: 2021-07-28
Base URL: https://services.leadconnectorhq.com
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import httpx

# ── Constants ─────────────────────────────────────────────────────────────────

GHL_BASE_URL    = "https://services.leadconnectorhq.com"
GHL_LOCATION_ID = os.getenv("GHL_LOCATION_ID", "4DKapRFZCHMehBPjCKKU")
GHL_BLOG_ID     = "bAF1XPQC48WHgeoK6cIi"

_LOG_DIR = Path.home() / "evrnew-marketing/logs"
_LOG_DIR.mkdir(parents=True, exist_ok=True)


# ── Auth ─────────────────────────────────────────────────────────────────────

def _headers() -> dict:
    key = os.getenv("GHL_API_KEY", "pit-792fd642-3072-4dc8-8593-24f4593b0be8")
    return {
        "Authorization": f"Bearer {key}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; evrnew-ghl/1.0)",
    }


# ── Low-level HTTP ────────────────────────────────────────────────────────────

def _ghl(
    method: str,
    path: str,
    *,
    params: Optional[dict] = None,
    json_body: Optional[dict] = None,
    timeout: int = 20,
) -> Optional[dict]:
    """Single HTTP call to GHL API. Returns parsed JSON or None on error."""
    url = f"{GHL_BASE_URL}{path}"
    try:
        resp = httpx.request(
            method.upper(),
            url,
            headers=_headers(),
            params=params,
            json=json_body,
            timeout=timeout,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        _log(f"GHL {method} {path} → {resp.status_code}: {resp.text[:200]}", "error")
        return None
    except Exception as exc:
        _log(f"GHL {method} {path} exception: {exc}", "error")
        return None


def _log(msg: str, level: str = "info"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [{level.upper()}] {msg}\n"
    try:
        with open(_LOG_DIR / "ghl-tool.log", "a") as f:
            f.write(line)
    except Exception:
        pass
    if level == "error":
        print(f"ghl_tool: {msg}", file=sys.stderr)


# ── Utility ───────────────────────────────────────────────────────────────────

def is_connected() -> bool:
    """Ping GHL location endpoint to verify API key is valid."""
    r = _ghl("GET", f"/locations/{GHL_LOCATION_ID}")
    return r is not None


def get_location_info() -> Optional[dict]:
    """Return location name, timezone, and settings."""
    r = _ghl("GET", f"/locations/{GHL_LOCATION_ID}")
    if not r:
        return None
    loc = r.get("location", r)
    return {
        "id": loc.get("id"),
        "name": loc.get("name"),
        "email": loc.get("email"),
        "phone": loc.get("phone"),
        "timezone": loc.get("timezone"),
        "address": loc.get("address"),
        "city": loc.get("city"),
        "state": loc.get("state"),
    }


# ── Contacts ──────────────────────────────────────────────────────────────────

def list_contacts(limit: int = 100, start_after: Optional[int] = None) -> list[dict]:
    """
    List contacts in the location, newest first.
    start_after: Unix timestamp in milliseconds for pagination.
    """
    params: dict = {"locationId": GHL_LOCATION_ID, "limit": limit}
    if start_after:
        params["startAfter"] = start_after
    r = _ghl("GET", "/contacts/", params=params)
    if not r:
        return []
    contacts = r.get("contacts", [])
    return [_slim_contact(c) for c in contacts]


def get_contact(contact_id: str) -> Optional[dict]:
    """Fetch a single contact by ID."""
    r = _ghl("GET", f"/contacts/{contact_id}")
    if not r:
        return None
    return _slim_contact(r.get("contact", r))


def search_contacts(
    query: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    limit: int = 20,
) -> list[dict]:
    """Search contacts by free-text query, email, or phone."""
    params: dict = {"locationId": GHL_LOCATION_ID, "limit": limit}
    if query:
        params["query"] = query
    if email:
        params["email"] = email
    if phone:
        params["phone"] = phone
    r = _ghl("GET", "/contacts/search", params=params)
    if not r:
        return []
    contacts = r.get("contacts", [])
    return [_slim_contact(c) for c in contacts]


def create_contact(
    first_name: str = "",
    last_name: str = "",
    email: str = "",
    phone: str = "",
    source: str = "",
    tags: Optional[list[str]] = None,
    custom_fields: Optional[list[dict]] = None,
) -> Optional[dict]:
    """Create a new contact. Returns the created contact dict."""
    payload: dict = {"locationId": GHL_LOCATION_ID}
    if first_name:
        payload["firstName"] = first_name
    if last_name:
        payload["lastName"] = last_name
    if email:
        payload["email"] = email
    if phone:
        payload["phone"] = phone
    if source:
        payload["source"] = source
    if tags:
        payload["tags"] = tags
    if custom_fields:
        payload["customFields"] = custom_fields
    r = _ghl("POST", "/contacts/", json_body=payload)
    if not r:
        return None
    return _slim_contact(r.get("contact", r))


def update_contact(contact_id: str, **fields) -> Optional[dict]:
    """
    Update a contact. Pass any GHL contact fields as kwargs.
    e.g. update_contact(id, firstName="Jane", tags=["vip"])
    """
    if not fields:
        return get_contact(contact_id)
    r = _ghl("PUT", f"/contacts/{contact_id}", json_body=fields)
    if not r:
        return None
    return _slim_contact(r.get("contact", r))


def delete_contact(contact_id: str) -> bool:
    """Delete a contact. Returns True on success."""
    r = _ghl("DELETE", f"/contacts/{contact_id}")
    return r is not None


def add_contact_tags(contact_id: str, tags: list[str]) -> Optional[dict]:
    """Add tags to a contact."""
    r = _ghl("POST", f"/contacts/{contact_id}/tags", json_body={"tags": tags})
    return r


def remove_contact_tags(contact_id: str, tags: list[str]) -> Optional[dict]:
    """Remove tags from a contact."""
    r = _ghl("DELETE", f"/contacts/{contact_id}/tags", json_body={"tags": tags})
    return r


def _slim_contact(c: dict) -> dict:
    """Slim a raw GHL contact to the fields agents care about."""
    return {
        "id": c.get("id"),
        "name": c.get("contactName") or f"{c.get('firstName','')} {c.get('lastName','')}".strip(),
        "firstName": c.get("firstName"),
        "lastName": c.get("lastName"),
        "email": c.get("email"),
        "phone": c.get("phone"),
        "source": c.get("source"),
        "tags": c.get("tags", []),
        "dateAdded": c.get("dateAdded"),
        "type": c.get("type"),
        "assignedTo": c.get("assignedTo"),
    }


# ── Pipelines & Opportunities ─────────────────────────────────────────────────

def list_pipelines() -> list[dict]:
    """List all pipelines in the location."""
    r = _ghl("GET", "/opportunities/pipelines", params={"locationId": GHL_LOCATION_ID})
    if not r:
        return []
    pipelines = r.get("pipelines", [])
    return [
        {
            "id": p.get("id"),
            "name": p.get("name"),
            "stages": [
                {"id": s.get("id"), "name": s.get("name"), "position": s.get("position")}
                for s in p.get("stages", [])
            ],
        }
        for p in pipelines
    ]


def list_pipeline_stages(pipeline_id: str) -> list[dict]:
    """Return the stages for a specific pipeline."""
    pipelines = list_pipelines()
    for p in pipelines:
        if p["id"] == pipeline_id:
            return p["stages"]
    return []


def list_opportunities(
    pipeline_id: Optional[str] = None,
    stage_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
) -> list[dict]:
    """
    List opportunities. Optionally filter by pipeline, stage, or status.
    status: 'open' | 'won' | 'lost' | 'abandoned'
    """
    params: dict = {"location_id": GHL_LOCATION_ID, "limit": limit}
    if pipeline_id:
        params["pipeline_id"] = pipeline_id
    if stage_id:
        params["pipeline_stage_id"] = stage_id
    if status:
        params["status"] = status
    r = _ghl("GET", "/opportunities/search", params=params)
    if not r:
        return []
    opps = r.get("opportunities", [])
    return [_slim_opportunity(o) for o in opps]


def get_opportunity(opportunity_id: str) -> Optional[dict]:
    """Fetch a single opportunity by ID."""
    r = _ghl("GET", f"/opportunities/{opportunity_id}")
    if not r:
        return None
    return _slim_opportunity(r.get("opportunity", r))


def create_opportunity(
    name: str,
    pipeline_id: str,
    stage_id: str,
    contact_id: str,
    monetary_value: float = 0,
    status: str = "open",
) -> Optional[dict]:
    """Create a new opportunity and return it."""
    payload = {
        "locationId": GHL_LOCATION_ID,
        "name": name,
        "pipelineId": pipeline_id,
        "pipelineStageId": stage_id,
        "contactId": contact_id,
        "monetaryValue": monetary_value,
        "status": status,
    }
    r = _ghl("POST", "/opportunities/", json_body=payload)
    if not r:
        return None
    return _slim_opportunity(r.get("opportunity", r))


def update_opportunity(opportunity_id: str, **fields) -> Optional[dict]:
    """
    Update opportunity fields.
    e.g. update_opportunity(id, name="New Name", monetaryValue=5000)
    """
    r = _ghl("PUT", f"/opportunities/{opportunity_id}", json_body=fields)
    if not r:
        return None
    return _slim_opportunity(r.get("opportunity", r))


def move_opportunity_stage(opportunity_id: str, stage_id: str) -> Optional[dict]:
    """Move an opportunity to a different pipeline stage."""
    return update_opportunity(opportunity_id, pipelineStageId=stage_id)


def close_opportunity(opportunity_id: str, won: bool = True) -> Optional[dict]:
    """Mark an opportunity as won or lost."""
    status = "won" if won else "lost"
    return update_opportunity(opportunity_id, status=status)


def _slim_opportunity(o: dict) -> dict:
    return {
        "id": o.get("id"),
        "name": o.get("name"),
        "status": o.get("status"),
        "monetaryValue": o.get("monetaryValue", 0),
        "pipelineId": o.get("pipelineId"),
        "pipelineStageId": o.get("pipelineStageId"),
        "pipelineStageName": o.get("pipelineStageName"),
        "contactId": o.get("contactId"),
        "contact": o.get("contact", {}),
        "assignedTo": o.get("assignedTo"),
        "dateAdded": o.get("createdAt") or o.get("dateAdded"),
        "lastActivityDate": o.get("lastActivityDate") or o.get("updatedAt"),
        "lostReasonId": o.get("lostReasonId"),
    }


# ── Conversations & SMS ───────────────────────────────────────────────────────

def list_conversations(
    contact_id: Optional[str] = None,
    limit: int = 20,
) -> list[dict]:
    """List conversations. Optionally filter by contact."""
    params: dict = {"locationId": GHL_LOCATION_ID, "limit": limit}
    if contact_id:
        params["contactId"] = contact_id
    r = _ghl("GET", "/conversations/search", params=params)
    if not r:
        return []
    convos = r.get("conversations", [])
    return [
        {
            "id": c.get("id"),
            "contactId": c.get("contactId"),
            "contactName": c.get("fullName") or c.get("contactName"),
            "type": c.get("type"),
            "lastMessage": c.get("lastMessageBody") or c.get("lastMessage"),
            "lastMessageDate": c.get("lastMessageDate"),
            "unreadCount": c.get("unreadCount", 0),
        }
        for c in convos
    ]


def get_conversation(conversation_id: str) -> Optional[dict]:
    """Fetch a single conversation by ID."""
    r = _ghl("GET", f"/conversations/{conversation_id}")
    return r


def get_messages(conversation_id: str, limit: int = 20) -> list[dict]:
    """Fetch messages in a conversation."""
    r = _ghl("GET", f"/conversations/{conversation_id}/messages", params={"limit": limit})
    if not r:
        return []
    msgs = r.get("messages", {})
    if isinstance(msgs, dict):
        msgs = msgs.get("messages", [])
    return [
        {
            "id": m.get("id"),
            "type": m.get("type"),
            "direction": m.get("direction"),
            "body": m.get("body"),
            "dateAdded": m.get("dateAdded"),
            "status": m.get("status"),
        }
        for m in msgs
    ]


def send_sms(contact_id: str, message: str) -> Optional[dict]:
    """Send an SMS to a contact. Creates a conversation if needed."""
    payload = {
        "type": "SMS",
        "contactId": contact_id,
        "message": message,
        "locationId": GHL_LOCATION_ID,
    }
    r = _ghl("POST", "/conversations/messages", json_body=payload)
    if r:
        _log(f"SMS sent to contact {contact_id}")
    return r


def send_email(
    contact_id: str,
    subject: str,
    body_html: str,
    from_name: str = "Evrnew",
    from_email: str = "erel@evrnew.com",
) -> Optional[dict]:
    """Send an email to a contact."""
    payload = {
        "type": "Email",
        "contactId": contact_id,
        "subject": subject,
        "html": body_html,
        "from": from_email,
        "fromName": from_name,
        "locationId": GHL_LOCATION_ID,
    }
    r = _ghl("POST", "/conversations/messages", json_body=payload)
    if r:
        _log(f"Email sent to contact {contact_id}: {subject}")
    return r


# ── Calendar & Appointments ───────────────────────────────────────────────────

def list_calendars() -> list[dict]:
    """List all calendars in the location."""
    r = _ghl("GET", "/calendars/", params={"locationId": GHL_LOCATION_ID})
    if not r:
        return []
    cals = r.get("calendars", [])
    return [
        {
            "id": c.get("id"),
            "name": c.get("name"),
            "description": c.get("description"),
            "slug": c.get("slug"),
            "type": c.get("calendarType"),
        }
        for c in cals
    ]


def get_free_slots(
    calendar_id: str,
    start_date: str,
    end_date: str,
    timezone: str = "America/Los_Angeles",
) -> list[dict]:
    """
    Get available time slots for a calendar.
    start_date / end_date: ISO date strings e.g. '2026-04-15'
    Returns list of {date, slots: [start_time, ...]}
    """
    params = {
        "calendarId": calendar_id,
        "startDate": start_date,
        "endDate": end_date,
        "timezone": timezone,
    }
    r = _ghl("GET", "/calendars/free-slots", params=params)
    if not r:
        return []
    return r.get("_dates_", []) or r.get("slots", []) or []


def create_appointment(
    calendar_id: str,
    contact_id: str,
    start_time: str,
    end_time: str,
    title: str = "Insulation Estimate",
    timezone: str = "America/Los_Angeles",
) -> Optional[dict]:
    """
    Create an appointment.
    start_time / end_time: ISO datetime strings e.g. '2026-04-15T10:00:00'
    """
    payload = {
        "calendarId": calendar_id,
        "locationId": GHL_LOCATION_ID,
        "contactId": contact_id,
        "startTime": start_time,
        "endTime": end_time,
        "title": title,
        "appointmentStatus": "confirmed",
        "address": "On-site",
        "ignoreDateRange": False,
        "toNotify": True,
        "timezone": timezone,
    }
    r = _ghl("POST", "/calendars/events/appointments", json_body=payload)
    if r:
        _log(f"Appointment created for contact {contact_id}: {title} @ {start_time}")
    return r


def list_appointments(
    calendar_id: Optional[str] = None,
    contact_id: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
) -> list[dict]:
    """List appointments, optionally filtered by calendar or contact."""
    params: dict = {"locationId": GHL_LOCATION_ID}
    if calendar_id:
        params["calendarId"] = calendar_id
    if contact_id:
        params["contactId"] = contact_id
    if start_time:
        params["startTime"] = start_time
    if end_time:
        params["endTime"] = end_time
    r = _ghl("GET", "/calendars/events", params=params)
    if not r:
        return []
    events = r.get("events", [])
    return [
        {
            "id": e.get("id"),
            "title": e.get("title"),
            "contactId": e.get("contactId"),
            "calendarId": e.get("calendarId"),
            "startTime": e.get("startTime"),
            "endTime": e.get("endTime"),
            "status": e.get("appointmentStatus"),
            "address": e.get("address"),
        }
        for e in events
    ]


# ── Tasks ─────────────────────────────────────────────────────────────────────

def create_task(
    contact_id: str,
    title: str,
    due_date: str,
    assigned_to: Optional[str] = None,
    body: str = "",
) -> Optional[dict]:
    """
    Create a task linked to a contact.
    due_date: ISO datetime string e.g. '2026-04-20T09:00:00+00:00'
    """
    payload: dict = {
        "title": title,
        "dueDate": due_date,
        "completed": False,
    }
    if body:
        payload["body"] = body
    if assigned_to:
        payload["assignedTo"] = assigned_to
    r = _ghl("POST", f"/contacts/{contact_id}/tasks", json_body=payload)
    if r:
        _log(f"Task created for contact {contact_id}: {title}")
    return r


def list_tasks(contact_id: str) -> list[dict]:
    """List all tasks for a contact."""
    r = _ghl("GET", f"/contacts/{contact_id}/tasks")
    if not r:
        return []
    tasks = r.get("tasks", [])
    return [
        {
            "id": t.get("id"),
            "title": t.get("title"),
            "dueDate": t.get("dueDate"),
            "completed": t.get("completed", False),
            "assignedTo": t.get("assignedTo"),
            "body": t.get("body"),
        }
        for t in tasks
    ]


def complete_task(task_id: str, contact_id: str) -> bool:
    """Mark a task as completed."""
    r = _ghl("PUT", f"/contacts/{contact_id}/tasks/{task_id}", json_body={"completed": True})
    return r is not None


# ── Blog Posts ────────────────────────────────────────────────────────────────

def create_blog_post(
    title: str,
    html_body: str,
    slug: str,
    meta_description: str = "",
    blog_id: str = GHL_BLOG_ID,
    status: str = "DRAFT",
) -> Optional[dict]:
    """
    Publish a blog post to GHL. Returns the created post dict.
    status: 'DRAFT' | 'PUBLISHED'
    """
    import re
    if not slug:
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    payload = {
        "locationId": GHL_LOCATION_ID,
        "blogId": blog_id,
        "title": title,
        "description": meta_description,
        "rawHTML": html_body,
        "urlSlug": slug,
        "status": status,
    }
    r = _ghl("POST", "/blogs/posts", json_body=payload, timeout=15)
    if r:
        post = r.get("blogPost", r)
        post_id = post.get("_id") or post.get("id", "")
        _log(f"Blog post created: {post_id} — {title}")
        return {"id": post_id, "title": title, "slug": slug, "status": status}
    return None


# ── Webhooks ──────────────────────────────────────────────────────────────────

def list_webhooks() -> list[dict]:
    """List all webhooks registered for this location."""
    r = _ghl("GET", "/webhooks/", params={"locationId": GHL_LOCATION_ID})
    if not r:
        return []
    hooks = r.get("webhooks", r.get("webhook", []))
    if isinstance(hooks, dict):
        hooks = [hooks]
    return hooks if isinstance(hooks, list) else []


def create_webhook(
    name: str,
    url: str,
    events: list[str],
) -> Optional[dict]:
    """
    Register a webhook URL for a list of GHL events.
    Common events: ContactCreate, ContactUpdate, OpportunityCreate,
                   OpportunityStatusUpdate, InboundMessage, TaskCreate
    """
    payload = {
        "locationId": GHL_LOCATION_ID,
        "name": name,
        "url": url,
        "events": events,
        "isActive": True,
    }
    r = _ghl("POST", "/webhooks/", json_body=payload)
    if r:
        _log(f"Webhook registered: {name} → {url} ({len(events)} events)")
    return r


def delete_webhook(webhook_id: str) -> bool:
    """Delete a registered webhook by ID."""
    r = _ghl("DELETE", f"/webhooks/{webhook_id}", params={"locationId": GHL_LOCATION_ID})
    return r is not None


# ── Dashboard helpers ─────────────────────────────────────────────────────────

def get_pipeline_summary() -> dict:
    """
    Return a summary of pipeline health:
    total value, count by stage, recent activity.
    """
    pipelines = list_pipelines()
    opportunities = list_opportunities(limit=100)

    # Build stage-id → name lookup across all pipelines
    stage_names: dict[str, str] = {}
    pipeline_names: dict[str, str] = {}
    for p in pipelines:
        pipeline_names[p["id"]] = p["name"]
        for s in p.get("stages", []):
            stage_names[s["id"]] = s["name"]

    total_value = sum(o.get("monetaryValue", 0) or 0 for o in opportunities)
    open_opps = [o for o in opportunities if o.get("status") == "open"]
    won_opps  = [o for o in opportunities if o.get("status") == "won"]
    lost_opps = [o for o in opportunities if o.get("status") == "lost"]

    # Group open opps by resolved stage name
    by_stage: dict = {}
    for o in open_opps:
        stage_id = o.get("pipelineStageId") or ""
        stage = stage_names.get(stage_id) or o.get("pipelineStageName") or stage_id or "Unknown"
        pipeline = pipeline_names.get(o.get("pipelineId") or "") or ""
        key = f"{pipeline} › {stage}" if pipeline else stage
        if key not in by_stage:
            by_stage[key] = {"count": 0, "value": 0}
        by_stage[key]["count"] += 1
        by_stage[key]["value"] += o.get("monetaryValue", 0) or 0

    # Sort by_stage by value descending so dashboard displays high-value stages first
    sorted_by_stage = dict(
        sorted(by_stage.items(), key=lambda x: x[1]["value"], reverse=True)
    )

    return {
        "pipelines": [{"id": p["id"], "name": p["name"]} for p in pipelines],
        "total_opportunities": len(opportunities),
        "open": len(open_opps),
        "won": len(won_opps),
        "lost": len(lost_opps),
        "total_value": round(total_value, 2),
        "open_value": round(sum(o.get("monetaryValue", 0) or 0 for o in open_opps), 2),
        "won_value": round(sum(o.get("monetaryValue", 0) or 0 for o in won_opps), 2),
        "by_stage": sorted_by_stage,
        "win_rate": round(len(won_opps) / max(len(won_opps) + len(lost_opps), 1) * 100, 1),
    }


def get_recent_leads(days: int = 7) -> list[dict]:
    """Return contacts added in the last N days, newest first.
    Excludes auto-created missed-call phantom contacts (tagged 'missed call').
    """
    import time
    cutoff_ms = int((time.time() - days * 86400) * 1000)
    contacts = list_contacts(limit=100, start_after=cutoff_ms)
    return [c for c in contacts if "missed call" not in (c.get("tags") or [])]


# ── Source normalization ──────────────────────────────────────────────────────

_SOURCE_MAP: dict[str, str] = {
    # Thumbtack variants
    "thumbtack": "Thumbtack",
    "Thumbtack": "Thumbtack",
    # Door-to-door variants
    "d2d": "D2D",
    "D2D": "D2D",
    "duvall d2d": "D2D",
    "Clint d2d": "D2D",
    "clint d2d": "D2D",
    "d2d clint": "D2D",
    # Referral variants
    "clint referral": "Referral",
    "referral": "Referral",
    "Referral": "Referral",
    # Social
    "clint fb": "Social",
    "Clint FB": "Social",
    "facebook": "Social",
    "Facebook": "Social",
    "instagram": "Social",
    # Reddit
    "Clint Reddit Comment": "Reddit",
    "reddit": "Reddit",
    # Direct
    "Direct traffic": "Direct",
    "direct traffic": "Direct",
    "direct": "Direct",
    # CRM/manual
    "CRM UI": "Manual",
    "crm ui": "Manual",
    "Clint": "Manual",
    "clint": "Manual",
    "misty": "Manual",
    # QuickBooks
    "quickbooks": "QuickBooks",
    "QuickBooks": "QuickBooks",
    # Google
    "google": "Google",
    "Google": "Google",
    "google ads": "Google Ads",
    "ppc": "Google Ads",
    # Organic
    "organic": "Organic",
    "Organic": "Organic",
    # Other / Unknown
    "Other": "Other",
    "other": "Other",
}

def normalize_source(raw: Optional[str]) -> str:
    """Normalize a raw GHL contact source string to a canonical label."""
    if not raw:
        return "Unknown"
    s = raw.strip()
    # Exact match first, then case-insensitive fallback
    if s in _SOURCE_MAP:
        return _SOURCE_MAP[s]
    lower = s.lower()
    for k, v in _SOURCE_MAP.items():
        if k.lower() == lower:
            return v
    return s


def get_lead_source_breakdown(days: int = 30) -> dict[str, int]:
    """
    Return a dict of {normalized_source: count} for contacts added in the last N days.
    Sources are normalized via normalize_source() to collapse variants.
    Sorted by count descending.
    """
    import time
    cutoff_ms = int((time.time() - days * 86400) * 1000)
    contacts = list_contacts(limit=100, start_after=cutoff_ms)
    breakdown: dict[str, int] = {}
    for c in contacts:
        src = normalize_source(c.get("source"))
        breakdown[src] = breakdown.get(src, 0) + 1
    return dict(sorted(breakdown.items(), key=lambda x: x[1], reverse=True))


def get_upcoming_appointments(days: int = 7) -> list[dict]:
    """
    Return upcoming appointments across ALL calendars for the next N days.
    Requires calendarId per GHL API constraint.
    Returns list of appointment dicts with calendarName added.
    """
    now = datetime.now(timezone.utc)
    start_iso = now.strftime("%Y-%m-%dT%H:%M:%S+00:00")
    end_iso = (now + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S+00:00")

    calendars = list_calendars()
    all_appts: list[dict] = []
    for cal in calendars:
        params: dict = {
            "locationId": GHL_LOCATION_ID,
            "calendarId": cal["id"],
            "startTime": start_iso,
            "endTime": end_iso,
        }
        r = _ghl("GET", "/calendars/events", params=params)
        if not r:
            continue
        for e in r.get("events", []):
            all_appts.append({
                "id": e.get("id"),
                "title": e.get("title"),
                "contactId": e.get("contactId"),
                "contactName": e.get("contactName") or e.get("fullName"),
                "calendarId": cal["id"],
                "calendarName": cal["name"],
                "startTime": e.get("startTime"),
                "endTime": e.get("endTime"),
                "status": e.get("appointmentStatus"),
                "address": e.get("address"),
            })

    # Sort by startTime ascending
    all_appts.sort(key=lambda a: a.get("startTime") or "")
    return all_appts


def get_recent_conversations(limit: int = 20) -> list[dict]:
    """
    Return recent conversations sorted by lastMessageDate desc.
    Excludes internal contacts (evrnew.com emails) and phantom 'call' contacts.
    """
    convs = list_conversations(limit=limit)
    return [
        c for c in convs
        if c.get("lastMessage")
        and (c.get("contactName") or "").lower() not in ("call", "")
        and "@evrnew.com" not in (c.get("contactName") or "")
    ]


def find_pipeline_by_name(name_fragment: str) -> Optional[dict]:
    """Find a pipeline whose name contains name_fragment (case-insensitive)."""
    pipelines = list_pipelines()
    frag = name_fragment.lower()
    for p in pipelines:
        if frag in p["name"].lower():
            return p
    return None


def get_open_opportunities_for_contact(contact_id: str) -> list[dict]:
    """Return all open opportunities linked to a contact."""
    params = {
        "location_id": GHL_LOCATION_ID,
        "contact_id": contact_id,
        "status": "open",
        "limit": 20,
    }
    r = _ghl("GET", "/opportunities/search", params=params)
    if not r:
        return []
    opps = r.get("opportunities", [])
    return [_slim_opportunity(o) for o in opps if o.get("status") == "open"]


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Load .env from evrnew-marketing
    env_file = Path.home() / "evrnew-marketing/.env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

    cmd = sys.argv[1] if len(sys.argv) > 1 else "connected"
    try:
        if cmd == "connected":
            ok = is_connected()
            print(f"GHL connected: {ok}")
            if ok:
                info = get_location_info()
                print(f"  Location: {info.get('name')}  ({info.get('timezone')})")

        elif cmd == "contacts":
            contacts = list_contacts(limit=10)
            print(f"Recent {len(contacts)} contacts:")
            for c in contacts:
                print(f"  {c['name']:30s}  {(c.get('email') or ''):35s}  {c.get('phone') or ''}")

        elif cmd == "pipelines":
            pipelines = list_pipelines()
            print(f"{len(pipelines)} pipeline(s):")
            for p in pipelines:
                print(f"  [{p['id']}] {p['name']}  ({len(p['stages'])} stages)")
                for s in p["stages"]:
                    print(f"      stage: {s['name']:30s}  id={s['id']}")

        elif cmd == "opportunities":
            opps = list_opportunities(limit=20)
            print(f"Recent {len(opps)} opportunities:")
            for o in opps:
                print(f"  {o['name']:35s}  ${o.get('monetaryValue',0):>8,.0f}  {o.get('status'):8s}  {o.get('pipelineStageName','')}")

        elif cmd == "calendars":
            cals = list_calendars()
            print(f"{len(cals)} calendar(s):")
            for c in cals:
                print(f"  [{c['id']}] {c['name']}")

        elif cmd == "summary":
            summary = get_pipeline_summary()
            print(f"Pipeline: {summary['open']} open  ${summary['open_value']:,.0f} | "
                  f"{summary['won']} won  ${summary['won_value']:,.0f} | "
                  f"Win rate: {summary['win_rate']}%")
            print("By stage:")
            for stage, data in summary["by_stage"].items():
                print(f"  {stage:30s}: {data['count']} deals  ${data['value']:,.0f}")

        elif cmd == "webhooks":
            hooks = list_webhooks()
            print(f"{len(hooks)} webhook(s) registered:")
            for h in hooks:
                print(f"  {h.get('name','')}: {h.get('url','')}  active={h.get('isActive')}")

        elif cmd == "leads":
            days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
            leads = get_recent_leads(days)
            print(f"Leads in last {days} days: {len(leads)}")
            for c in leads:
                print(f"  {c['name']:30s}  {c.get('email',''):35s}  added={c.get('dateAdded','')[:10]}")

        else:
            print("Usage: python ghl_tool.py [connected|contacts|pipelines|opportunities|calendars|summary|webhooks|leads [days]]")
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()
        sys.exit(1)
