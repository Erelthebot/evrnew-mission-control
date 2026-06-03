#!/usr/bin/env python3
"""
erel_inbox_monitor.py - Erel's 24/7 email daemon
Checks erel@evrnew.com via Gmail API (OAuth2), routes to agents.
"""
import os
import json
import time
import logging
import base64
from datetime import datetime
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

CHECK_INTERVAL = 300  # 5 minutes
LOG_FILE = Path.home() / 'evrnew-marketing' / 'logs' / 'erel-inbox.log'
TOKEN_FILE = Path.home() / 'evrnew-marketing' / 'config' / 'gmail' / 'token.json'
CREDENTIALS_FILE = Path.home() / 'evrnew-marketing' / 'config' / 'gmail' / 'credentials.json'
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
]

LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [EREL] %(levelname)s: %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()]
)
logger = logging.getLogger("erel")

ROUTING_RULES = {
    "google_alerts": {
        "from_contains": ["googlealerts-noreply@google.com"],
        "route_to": "competitive_intelligence",
        "priority": "normal"
    },
    "ghl_notifications": {
        "from_contains": ["notifications@gohighlevel.com", "noreply@msgsndr.com"],
        "route_to": "email_drip",
        "priority": "high"
    },
    "review_alerts": {
        "from_contains": ["noreply@google.com"],
        "subject_contains": ["review", "rating"],
        "route_to": "competitive_intelligence",
        "priority": "high"
    },
    "competitor_news": {
        "subject_contains": ["insulation", "energy efficiency", "home improvement"],
        "route_to": "competitive_intelligence",
        "priority": "low"
    },
    "seo_reports": {
        "from_contains": ["noreply@dataforseo.com", "alerts@searchconsole"],
        "route_to": "technical_seo",
        "priority": "normal"
    },
    "ad_alerts": {
        "from_contains": ["ads-noreply@google.com", "notification@facebookmail.com"],
        "route_to": "ads_agent",
        "priority": "high"
    },
}


def get_credentials() -> Credentials:
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_FILE, 'w') as f:
                f.write(creds.to_json())
        else:
            raise RuntimeError(
                f"No valid token. Run: python3 {Path(__file__).parent}/gmail_auth.py"
            )
    return creds


def route(from_addr: str, subject: str) -> tuple[str, str, str]:
    fl, sl = from_addr.lower(), subject.lower()
    for name, rule in ROUTING_RULES.items():
        fm = any(f in fl for f in rule.get("from_contains", []))
        sm = any(s in sl for s in rule.get("subject_contains", []))
        if rule.get("from_contains") and rule.get("subject_contains"):
            if fm and sm:
                return rule["route_to"], rule["priority"], name
        elif fm or sm:
            return rule["route_to"], rule["priority"], name
    return "general_inbox", "low", "unmatched"


def get_message_body(payload: dict) -> str:
    body = ""
    if payload.get("mimeType") == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            body = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    elif "parts" in payload:
        for part in payload["parts"]:
            if part.get("mimeType") == "text/plain":
                data = part.get("body", {}).get("data", "")
                if data:
                    body = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
                    break
    return body[:5000]


def process_message(service, msg_id: str) -> dict | None:
    try:
        msg = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
    except HttpError as e:
        logger.error(f"Failed to fetch message {msg_id}: {e}")
        return None

    headers = {h["name"]: h["value"] for h in msg["payload"].get("headers", [])}
    from_addr = headers.get("From", "")
    subject = headers.get("Subject", "")
    date = headers.get("Date", "")
    body = get_message_body(msg["payload"])

    agent, pri, rule = route(from_addr, subject)
    data = {
        "id": msg_id,
        "from": from_addr,
        "subject": subject,
        "date": date,
        "body": body,
        "routed_to": agent,
        "priority": pri,
        "rule": rule,
        "processed_at": datetime.now().isoformat(),
    }

    inbox_dir = Path.home() / f"evrnew-marketing/data/inbox/{agent}"
    inbox_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{datetime.now():%Y%m%d_%H%M%S}_{msg_id}.json"
    with open(inbox_dir / filename, "w") as f:
        json.dump(data, f, indent=2)

    # Mark as read
    service.users().messages().modify(
        userId='me', id=msg_id, body={"removeLabelIds": ["UNREAD"]}
    ).execute()

    logger.info(f"[{pri.upper()}] {subject[:60]} -> {agent}")
    return data


def check_inbox(service) -> list:
    results = service.users().messages().list(
        userId='me', labelIds=['INBOX'], q='is:unread'
    ).execute()
    messages = results.get('messages', [])
    if not messages:
        return []
    logger.info(f"{len(messages)} unread message(s)")
    return [process_message(service, m['id']) for m in messages]


def send_email(service, to: str, subject: str, body: str) -> bool:
    import email.mime.text
    import email.mime.multipart
    msg = email.mime.multipart.MIMEMultipart()
    msg["From"] = "Erel - Evrnew Marketing <erel@evrnew.com>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(email.mime.text.MIMEText(body, "plain"))
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    try:
        service.users().messages().send(userId='me', body={"raw": raw}).execute()
        logger.info(f"Sent to {to}: {subject[:50]}")
        return True
    except HttpError as e:
        logger.error(f"Send failed: {e}")
        return False


def run():
    logger.info("=" * 50)
    logger.info("EREL INBOX MONITOR STARTED (OAuth2)")
    logger.info(f"Check interval: {CHECK_INTERVAL}s")
    logger.info("=" * 50)

    fails = 0
    while True:
        try:
            creds = get_credentials()
            service = build('gmail', 'v1', credentials=creds)
            check_inbox(service)
            fails = 0
        except RuntimeError as e:
            logger.error(str(e))
            break  # Can't recover without re-auth
        except Exception as e:
            fails += 1
            logger.error(f"Error ({fails}): {e}")
            time.sleep(min(300, 30 * fails))
            continue
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    run()
