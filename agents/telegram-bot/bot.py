#!/usr/bin/env python3
"""
Evrnew / OpenClaw Telegram Bot
Handles inbound messages, commands, and routes to the appropriate agents.

Token is stored in ~/.config/evrnew/telegram_bot_token
or in env var TELEGRAM_BOT_TOKEN.
"""
import asyncio
import logging
import os
from pathlib import Path
from telegram import Update, BotCommand
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    filters, ContextTypes
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# ── Token loading ──────────────────────────────────────────────
def get_token() -> str:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if token:
        return token
    config = Path.home() / ".config/evrnew/telegram_bot_token"
    if config.exists():
        return config.read_text().strip()
    raise RuntimeError(
        "No bot token found. Set TELEGRAM_BOT_TOKEN env var or create "
        "~/.config/evrnew/telegram_bot_token"
    )


# ── Command handlers ───────────────────────────────────────────
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 I'm the Evrnew AI Marketing Agent.\n\n"
        "Commands:\n"
        "/status  — System status\n"
        "/brief   — Today's marketing brief\n"
        "/deploy  — Deploy latest site changes\n"
        "/agents  — List active agents\n"
        "/help    — Show this message"
    )


async def status(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    import subprocess
    lines = []
    # Moltbook heartbeat
    r = subprocess.run(
        ["launchctl", "list", "com.evrnew.moltbook-heartbeat"],
        capture_output=True, text=True
    )
    mb_status = "✅ running" if r.returncode == 0 else "❌ stopped"

    # Netlify site
    lines.append("*System Status*")
    lines.append(f"🌐 Site: https://openclaw-evrnew.netlify.app")
    lines.append(f"🦞 Moltbook heartbeat: {mb_status}")
    lines.append(f"🤖 Telegram bot: ✅ online")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def brief(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    from datetime import date
    today = date.today().strftime("%B %d, %Y")
    await update.message.reply_text(
        f"*Daily Brief — {today}*\n\n"
        "• Moltbook presence: active\n"
        "• OpenClaw site: live at openclaw-evrnew.netlify.app\n"
        "• Pending: Telegram account setup (code needed)\n"
        "• Next: Content distribution to Moltbook",
        parse_mode="Markdown"
    )


async def deploy(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    import subprocess
    await update.message.reply_text("🚀 Deploying site...")
    site_dir = Path.home() / "evrnew-marketing/sites/openclaw-site"
    result = subprocess.run(
        ["netlify", "deploy", "--dir", str(site_dir), "--prod"],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode == 0:
        # Extract URL from output
        import re
        url_match = re.search(r'https://[a-zA-Z0-9-]+\.netlify\.app', result.stdout)
        url = url_match.group(0) if url_match else "deployed"
        await update.message.reply_text(f"✅ Deployed: {url}")
    else:
        await update.message.reply_text(f"❌ Deploy failed:\n{result.stderr[:300]}")


async def agents(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "*Active Agents*\n\n"
        "1. 🦞 Moltbook Agent (`erel_evrnew`) — heartbeat every 30min\n"
        "2. 🤖 Telegram Bot — this bot\n"
        "3. 🌐 Site Publisher — deploys via Netlify CLI\n\n"
        "_Planned agents:_\n"
        "• Email router (Postmark → Claude)\n"
        "• Content generator (Claude → Moltbook/X)\n"
        "• Lead scorer (CRM integration)",
        parse_mode="Markdown"
    )


SYSTEM_PROMPT_PATH = Path.home() / "Downloads/evrnew_telegram_bot_prompt.txt"

def load_system_prompt() -> str:
    if SYSTEM_PROMPT_PATH.exists():
        return SYSTEM_PROMPT_PATH.read_text().strip()
    return (
        "You are Erel, EVRNEW's Chief of Staff AI. Help with operations, "
        "marketing, automation, and business tasks. Be concise and direct."
    )


async def echo(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Handle all non-command messages — route to Claude."""
    import anthropic

    msg = update.message.text
    thinking = await update.message.reply_text("⏳ Thinking…")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        key_file = Path.home() / ".config/anthropic/api_key"
        if key_file.exists():
            api_key = key_file.read_text().strip()

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=load_system_prompt(),
            messages=[{"role": "user", "content": msg}],
        )
        reply = response.content[0].text
    except Exception as e:
        reply = f"❌ Claude error: {e}"

    # Telegram message limit is 4096 chars
    if len(reply) > 4096:
        for i in range(0, len(reply), 4096):
            if i == 0:
                await thinking.edit_text(reply[:4096])
            else:
                await update.message.reply_text(reply[i:i+4096])
    else:
        await thinking.edit_text(reply)


# ── Main ───────────────────────────────────────────────────────
def main():
    token = get_token()
    app = Application.builder().token(token).build()

    # Register commands
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", start))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CommandHandler("brief", brief))
    app.add_handler(CommandHandler("deploy", deploy))
    app.add_handler(CommandHandler("agents", agents))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    logger.info("Starting Evrnew Telegram bot...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
