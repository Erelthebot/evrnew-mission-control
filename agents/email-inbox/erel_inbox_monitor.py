#!/usr/bin/env python3
"""
erel_inbox_monitor.py - Erel's 24/7 email daemon
Checks erel@evrnew.com via IMAP, routes to agents.
"""
import imaplib
import email
import os
import time
import json
import logging
from datetime import datetime
from email.header import decode_header

IMAP_SERVER = "imap.gmail.com"
IMAP_PORT = 993
EMAIL_ADDRESS = "erel@evrnew.com"
EMAIL_PASSWORD = os.environ.get("EREL_GMAIL_APP_PASSWORD", os.environ.get("EREL_GMAIL_PASSWORD"))
CHECK_INTERVAL = 300
LOG_FILE = os.path.expanduser("~/evrnew-marketing/logs/erel-inbox.log")

os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
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


def connect():
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        mail.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        logger.info("Connected to Gmail as erel@evrnew.com")
        return mail
    except Exception as e:
        logger.error(f"Login failed: {e}")
        return None


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


def process(msg, mid: str) -> dict:
    from_addr = msg.get("From", "")
    subj_parts = decode_header(msg.get("Subject", ""))
    subject = " ".join(
        p.decode(c or "utf-8") if isinstance(p, bytes) else p
        for p, c in subj_parts
    )
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                pl = part.get_payload(decode=True)
                if pl:
                    body = pl.decode("utf-8", errors="replace")
                break
    else:
        pl = msg.get_payload(decode=True)
        if pl:
            body = pl.decode("utf-8", errors="replace")

    agent, pri, rule = route(from_addr, subject)
    data = {
        "id": mid,
        "from": from_addr,
        "subject": subject,
        "date": msg.get("Date", ""),
        "body": body[:5000],
        "routed_to": agent,
        "priority": pri,
        "rule": rule,
        "processed_at": datetime.now().isoformat(),
    }
    inbox_dir = os.path.expanduser(f"~/evrnew-marketing/data/inbox/{agent}")
    os.makedirs(inbox_dir, exist_ok=True)
    filename = f"{datetime.now():%Y%m%d_%H%M%S}_{mid}.json"
    with open(os.path.join(inbox_dir, filename), "w") as f:
        json.dump(data, f, indent=2)
    logger.info(f"[{pri.upper()}] {subject[:60]} -> {agent}")
    return data


def check(mail) -> list:
    mail.select("INBOX")
    _, msgs = mail.search(None, "UNSEEN")
    ids = msgs[0].split()
    if not ids:
        return []
    logger.info(f"{len(ids)} new email(s)")
    results = []
    for mid in ids:
        _, md = mail.fetch(mid, "(RFC822)")
        if md and md[0]:
            results.append(process(email.message_from_bytes(md[0][1]), mid.decode()))
    return results


def run():
    logger.info("=" * 50)
    logger.info("EREL INBOX MONITOR STARTED")
    logger.info(f"Checking: {EMAIL_ADDRESS} every {CHECK_INTERVAL}s")
    logger.info("=" * 50)
    mail = None
    fails = 0
    while True:
        try:
            if not mail:
                mail = connect()
                if not mail:
                    fails += 1
                    time.sleep(min(300, 30 * fails))
                    continue
                fails = 0
            check(mail)
        except (imaplib.IMAP4.abort, imaplib.IMAP4.error, OSError):
            logger.warning("Connection lost, reconnecting...")
            mail = None
        except Exception as e:
            logger.error(f"Error: {e}")
            mail = None
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    if not EMAIL_PASSWORD:
        print("Set EREL_GMAIL_APP_PASSWORD in ~/.zshrc")
        exit(1)
    run()
