"""
Shared utilities for all EVRNEW marketing agents.
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path("/Users/erel/evrnew-marketing")
DATA_DIR = PROJECT_ROOT / "data"
LOGS_DIR = PROJECT_ROOT / "logs"

TELEGRAM_CHAT_ID = "-5294204937"

# ---------------------------------------------------------------------------
# Environment loading
# ---------------------------------------------------------------------------

def load_env() -> None:
    """Load env vars from ~/.zshrc into os.environ (best-effort)."""
    zshrc = Path.home() / ".zshrc"
    if not zshrc.exists():
        return
    try:
        result = subprocess.run(
            ["zsh", "-c", f"source {zshrc} && env"],
            capture_output=True, text=True, timeout=10
        )
        for line in result.stdout.splitlines():
            if "=" in line:
                key, _, val = line.partition("=")
                if key and key == key.strip() and not key.startswith("#"):
                    os.environ.setdefault(key, val)
    except Exception:
        pass  # Fall back to whatever is already in os.environ


# Call on import so all agents benefit automatically
load_env()


# ---------------------------------------------------------------------------
# API clients
# ---------------------------------------------------------------------------

def get_anthropic_client():
    """Return an Anthropic client instance."""
    import anthropic  # type: ignore
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError("ANTHROPIC_API_KEY not set")
    return anthropic.Anthropic(api_key=api_key)


def get_xai_client():
    """Return an OpenAI-compatible client pointed at xAI Grok."""
    from openai import OpenAI  # type: ignore
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        raise EnvironmentError("XAI_API_KEY not set")
    return OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")


# ---------------------------------------------------------------------------
# Output saving
# ---------------------------------------------------------------------------

def save_output(agent_name: str, filename: str, content: str) -> Path:
    """Save agent output to ~/evrnew-marketing/data/<agent_name>/<filename>."""
    out_dir = DATA_DIR / agent_name
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / filename
    out_path.write_text(content, encoding="utf-8")
    return out_path


def save_json(agent_name: str, filename: str, data: Any) -> Path:
    """Save JSON data to ~/evrnew-marketing/data/<agent_name>/<filename>."""
    return save_output(agent_name, filename, json.dumps(data, indent=2, default=str))


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

_loggers: dict[str, logging.Logger] = {}


def get_logger(agent_name: str) -> logging.Logger:
    if agent_name in _loggers:
        return _loggers[agent_name]

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger(agent_name)
    logger.setLevel(logging.DEBUG)

    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")

    # File handler
    fh = logging.FileHandler(LOGS_DIR / f"{agent_name}.log")
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    _loggers[agent_name] = logger
    return logger


def log(agent_name: str, message: str, level: str = "info") -> None:
    """Convenience wrapper around logger."""
    logger = get_logger(agent_name)
    getattr(logger, level.lower(), logger.info)(message)


# ---------------------------------------------------------------------------
# Telegram notifications
# ---------------------------------------------------------------------------

def notify_telegram(message: str, chat_id: str = TELEGRAM_CHAT_ID) -> bool:
    """Send a message to the Evrnew Telegram group. Returns True on success."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        log("telegram", "TELEGRAM_BOT_TOKEN not set — skipping notification", "warning")
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    }
    try:
        resp = httpx.post(url, json=payload, timeout=15)
        if resp.status_code == 200:
            return True
        log("telegram", f"Telegram API error {resp.status_code}: {resp.text}", "warning")
        return False
    except Exception as exc:
        log("telegram", f"Telegram notify failed: {exc}", "warning")
        return False


# ---------------------------------------------------------------------------
# Timestamp helpers
# ---------------------------------------------------------------------------

def today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
