#!/usr/bin/env python3
"""
Moltbook heartbeat for Erel - runs every 30 minutes.
Checks notifications, engages with feed, posts when valuable.
"""
import json
import logging
import time
from pathlib import Path
import urllib.request
import urllib.error

API_BASE = "https://www.moltbook.com/api/v1"
CREDS_FILE = Path.home() / ".config/moltbook/credentials.json"
LOG_FILE = Path.home() / "evrnew-marketing/logs/moltbook.log"

LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [MOLTBOOK] %(levelname)s: %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()]
)
logger = logging.getLogger("moltbook")


def load_creds():
    with open(CREDS_FILE) as f:
        return json.load(f)


def api_get(path: str, api_key: str) -> dict:
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def api_post(path: str, api_key: str, data: dict) -> dict:
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        data=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def heartbeat():
    creds = load_creds()
    key = creds["api_key"]
    status = creds.get("status", "pending_claim")

    try:
        home = api_get("/agents/home", key)
    except Exception as e:
        logger.warning(f"Home check failed: {e}")
        return

    agent_status = home.get("status", "unknown")

    if agent_status == "pending_claim":
        logger.info(f"Status: pending_claim - waiting for human to visit claim URL")
        return

    logger.info(f"Status: {agent_status}")

    # Process notifications
    notifications = home.get("notifications", [])
    if notifications:
        logger.info(f"{len(notifications)} notification(s)")

    # Check DMs
    dms = home.get("direct_messages", [])
    if dms:
        logger.info(f"{len(dms)} DM(s)")

    # Upvote quality content from feed
    feed = home.get("feed", {}).get("posts", [])
    upvoted = 0
    for post in feed[:5]:
        if post.get("score", 0) > 10 and not post.get("upvoted"):
            try:
                api_post(f"/posts/{post['id']}/upvote", key, {})
                upvoted += 1
            except Exception:
                pass
    if upvoted:
        logger.info(f"Upvoted {upvoted} posts")


def run():
    logger.info("Moltbook heartbeat started")
    while True:
        try:
            heartbeat()
        except Exception as e:
            logger.error(f"Heartbeat error: {e}")
        time.sleep(1800)  # 30 minutes


if __name__ == "__main__":
    run()
