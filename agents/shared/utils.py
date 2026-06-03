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
PROJECT_ROOT = Path(__file__).parent.parent.parent.resolve()
DATA_DIR = PROJECT_ROOT / "data"
LOGS_DIR = PROJECT_ROOT / "logs"

TELEGRAM_CHAT_ID = "-5294204937"

# ---------------------------------------------------------------------------
# Environment loading
# ---------------------------------------------------------------------------

def load_env() -> None:
    """Load env vars from .env file and ~/.zshrc into os.environ (best-effort)."""
    # 1. Load from ~/evrnew-marketing/.env directly (works in non-interactive/launchd contexts)
    env_file = PROJECT_ROOT / ".env"
    if env_file.exists():
        try:
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, _, val = line.partition("=")
                        key = key.strip()
                        val = val.strip().strip('"').strip("'")
                        if key:
                            os.environ.setdefault(key, val)
        except Exception:
            pass

    # 2. Also load ~/.openclaw/.env
    openclaw_env = Path.home() / ".openclaw" / ".env"
    if openclaw_env.exists():
        try:
            with open(openclaw_env) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, _, val = line.partition("=")
                        key = key.strip()
                        val = val.strip().strip('"').strip("'")
                        if key:
                            os.environ.setdefault(key, val)
        except Exception:
            pass

    # 3. Source ~/.zshrc as fallback for any remaining vars
    zshrc = Path.home() / ".zshrc"
    if zshrc.exists():
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

def get_supabase_client():
    """Return a Supabase client for the EREL project. Uses service_role key for full access."""
    from supabase import create_client  # type: ignore
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise EnvironmentError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    return create_client(url, key)


def upload_to_storage(path: str, content: bytes, mime_type: str = "application/octet-stream", bucket: str = "erel") -> str | None:
    """Upload a file to Supabase Storage. Returns the public URL on success, None on failure."""
    try:
        import httpx as _httpx
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            raise EnvironmentError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
        headers = {"apikey": key, "Authorization": f"Bearer {key}"}
        resp = _httpx.post(
            f"{url}/storage/v1/object/{bucket}/{path}",
            headers=headers,
            content=content,
            params={"upsert": "true"},
            timeout=30,
        )
        if resp.status_code in (200, 201):
            return f"{url}/storage/v1/object/public/{bucket}/{path}"
        log("supabase", f"upload_to_storage failed {resp.status_code}: {resp.text}", "warning")
        return None
    except Exception as exc:
        log("supabase", f"upload_to_storage error: {exc}", "warning")
        return None


def upsert_agent_output(agent_name: str, output_type: str, content: str | None = None, data: Any = None) -> bool:
    """Write agent output to Supabase agent_outputs table. Returns True on success."""
    try:
        client = get_supabase_client()
        from datetime import timezone
        row = {
            "agent_name": agent_name,
            "output_type": output_type,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        if content is not None:
            row["content"] = content
        if data is not None:
            row["data"] = data
        client.table("agent_outputs").upsert(row, on_conflict="agent_name,output_type").execute()
        return True
    except Exception as exc:
        log("supabase", f"upsert_agent_output failed: {exc}", "warning")
        return False


def log_activity(action: str, category: str, actor: str, details: str, related_id: str | None = None) -> bool:
    """Insert an activity log entry to Supabase. Returns True on success."""
    try:
        client = get_supabase_client()
        from datetime import timezone
        row = {
            "action": action,
            "category": category,
            "actor": actor,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if related_id:
            row["related_id"] = related_id
        client.table("activity_logs").insert(row).execute()
        return True
    except Exception as exc:
        log("supabase", f"log_activity failed: {exc}", "warning")
        return False


def get_xai_client():
    """Return an OpenAI-compatible client pointed at xAI Grok. Fallback-of-fallback."""
    from openai import OpenAI  # type: ignore
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        raise EnvironmentError("XAI_API_KEY not set")
    return OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")


def get_ollama_client():
    """Return an OpenAI-compatible client pointed at local llama-server (port 8080)."""
    from openai import OpenAI  # type: ignore
    return OpenAI(api_key="local", base_url="http://127.0.0.1:8080/v1")


def _load_llm_config() -> dict:
    cfg_path = PROJECT_ROOT / "config" / "llm-config.json"
    if cfg_path.exists():
        return json.loads(cfg_path.read_text(encoding="utf-8"))
    return {}


def get_openrouter_client():
    """Return an OpenAI-compatible client for DeepSeek-V4-Flash via OpenRouter."""
    from openai import OpenAI  # type: ignore
    cfg = _load_llm_config().get("reasoning", {})
    api_key = os.environ.get(cfg.get("env_key", "OPENROUTER_API_KEY"))
    if not api_key:
        raise EnvironmentError("OPENROUTER_API_KEY not set")
    return OpenAI(api_key=api_key, base_url=cfg.get("base_url", "https://openrouter.ai/api/v1"))


def get_overflow_client():
    """Return an OpenAI-compatible client for MLX Llama-3.3-70B-Instruct-4bit (port 52416)."""
    from openai import OpenAI  # type: ignore
    cfg = _load_llm_config().get("overflow", {})
    port = cfg.get("port", 52416)
    return OpenAI(api_key="local", base_url=f"http://127.0.0.1:{port}/v1")


def get_primary_client():
    """Returns (client, model) using local Holo3-35B-A3B via llama-server (port 8080)."""
    cfg = _load_llm_config().get("local", {})
    return get_ollama_client(), cfg.get("model_id", "Holo3-35B-A3B")


def call_consensus(question: str) -> dict:
    """Run the multi-LLM consensus engine (Holo3 + Grok-3 + DeepSeek-V4-Flash → V4-Flash synthesis).
    Returns {question, panel, consensus}. Sync wrapper around the async engine."""
    import asyncio
    import importlib.util
    spec = importlib.util.spec_from_file_location("consensus", PROJECT_ROOT / "consensus.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return asyncio.run(mod.run_consensus(question))


def call_llm(
    system: str,
    user: str,
    model: str = "local",
    max_tokens: int = 2000,
    thinking: bool = False,
) -> str:
    """
    Tiered LLM routing via config/llm-config.json route names:
      local      → Holo3-35B-A3B (vision / GUI, port 8080)
      fast       → Grok-3 (primary chat, copy, ads)
      reasoning  → DeepSeek-V4-Flash via OpenRouter (non-thinking default)
      overflow   → Llama-3.3-70B-Instruct-4bit via MLX :52416
      hub        → DeepSeek-V4-Flash (orchestration)

    Legacy aliases: gemini/gemini-pro → reasoning; grok/grok-3/grok-3-fast → fast.
    """
    cfg = _load_llm_config()
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": user}]

    route = model
    if route in {"gemini", "gemini-pro"}:
        route = "reasoning"
    if route in {"grok", "grok-3", "grok-3-fast"}:
        route = "fast"

    fast_model = cfg.get("fast", {}).get("model", "grok-3")
    reasoning_model = cfg.get("reasoning", {}).get("model", "deepseek/deepseek-v4-flash")
    overflow_model = cfg.get("overflow", {}).get("model", "Llama-3.3-70B-Instruct-4bit")
    local_model = cfg.get("local", {}).get("model_id", "Holo3-35B-A3B")

    extra = {"extra_body": {"reasoning": {"enabled": True}}} if thinking else {}

    if route in {"reasoning", "hub"}:
        for attempt in range(3):
            try:
                import time
                if attempt > 0:
                    time.sleep(2 ** attempt)
                client = get_openrouter_client()
                resp = client.chat.completions.create(
                    model=reasoning_model,
                    max_tokens=max_tokens,
                    messages=msgs,
                    **extra,
                )
                return (resp.choices[0].message.content or "")
            except Exception as exc:
                is_503 = getattr(exc, "status_code", None) == 503 or "503" in str(exc)
                if is_503 and attempt < 2:
                    continue
        client = get_xai_client()
        resp = client.chat.completions.create(model=fast_model, max_tokens=max_tokens, messages=msgs)
        return (resp.choices[0].message.content or "")

    if route == "fast":
        client = get_xai_client()
        resp = client.chat.completions.create(model=fast_model, max_tokens=max_tokens, messages=msgs)
        return (resp.choices[0].message.content or "")

    if route == "overflow":
        try:
            client = get_overflow_client()
            resp = client.chat.completions.create(model=overflow_model, max_tokens=max_tokens, messages=msgs)
            return (resp.choices[0].message.content or "")
        except Exception:
            pass
        client = get_xai_client()
        resp = client.chat.completions.create(model=fast_model, max_tokens=max_tokens, messages=msgs)
        return (resp.choices[0].message.content or "")

    # Default: local Holo3 with fallback chain
    try:
        client = get_ollama_client()
        resp = client.chat.completions.create(model=local_model, max_tokens=max_tokens, messages=msgs)
        return (resp.choices[0].message.content or "")
    except Exception:
        pass
    try:
        client = get_openrouter_client()
        resp = client.chat.completions.create(
            model=reasoning_model,
            max_tokens=max_tokens,
            messages=msgs,
        )
        return (resp.choices[0].message.content or "")
    except Exception:
        pass
    try:
        client = get_overflow_client()
        resp = client.chat.completions.create(model=overflow_model, max_tokens=max_tokens, messages=msgs)
        return (resp.choices[0].message.content or "")
    except Exception:
        pass
    client = get_xai_client()
    resp = client.chat.completions.create(model=fast_model, max_tokens=max_tokens, messages=msgs)
    return (resp.choices[0].message.content or "")


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
        # Markdown parse error — retry as plain text
        if resp.status_code == 400 and "parse" in resp.text.lower():
            plain = {k: v for k, v in payload.items() if k != "parse_mode"}
            resp2 = httpx.post(url, json=plain, timeout=15)
            if resp2.status_code == 200:
                return True
            log("telegram", f"Telegram API error {resp2.status_code}: {resp2.text}", "warning")
            return False
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


# ---------------------------------------------------------------------------
# SMS notifications via Twilio
# ---------------------------------------------------------------------------

def notify_sms(message: str, to: str | None = None) -> bool:
    """Send an SMS via Twilio. Returns True on success."""
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    api_key = os.environ.get("TWILIO_API_KEY")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_PHONE_NUMBER")
    to_number = to or os.environ.get("TWILIO_NOTIFY_NUMBER", "")

    if not account_sid or not auth_token or not from_number or not to_number:
        log("twilio", "Twilio credentials/TWILIO_NOTIFY_NUMBER not set — skipping SMS", "warning")
        return False

    # Use API Key auth if available, otherwise fall back to account SID + auth token
    auth = (api_key, auth_token) if api_key else (account_sid, auth_token)
    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    try:
        resp = httpx.post(
            url,
            auth=auth,
            data={"From": from_number, "To": to_number, "Body": message[:1600]},
            timeout=15,
        )
        if resp.status_code in (200, 201):
            return True
        log("twilio", f"Twilio API error {resp.status_code}: {resp.text}", "warning")
        return False
    except Exception as exc:
        log("twilio", f"Twilio notify failed: {exc}", "warning")
        return False
