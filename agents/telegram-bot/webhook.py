#!/usr/bin/env python3
"""
Webhook server for the Evrnew Telegram bot.
Receives updates from Telegram via HTTPS POST.
Use instead of polling for production deployments.
"""
import asyncio
import json
import logging
import os
from pathlib import Path
from aiohttp import web
from telegram import Update, Bot
from telegram.ext import Application

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN") or (
    Path.home() / ".config/evrnew/telegram_bot_token"
).read_text().strip()

WEBHOOK_SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "evrnew-secret-2026")
PORT = int(os.environ.get("PORT", 8443))


async def webhook_handler(request: web.Request) -> web.Response:
    """Receive and process Telegram updates."""
    # Verify secret token
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if secret != WEBHOOK_SECRET:
        return web.Response(status=403)

    data = await request.json()
    logger.info(f"Update received: {json.dumps(data)[:200]}")

    # Process with bot application (import handlers from bot.py)
    # TODO: wire up full handler pipeline
    update = Update.de_json(data, Bot(TOKEN))
    if update.message:
        await update.message.reply_text(f"Received: {update.message.text}")

    return web.Response(status=200)


async def set_webhook(bot: Bot, url: str):
    """Register the webhook URL with Telegram."""
    result = await bot.set_webhook(
        url=url,
        secret_token=WEBHOOK_SECRET,
        allowed_updates=["message", "callback_query", "inline_query"]
    )
    logger.info(f"Webhook set: {result}")
    info = await bot.get_webhook_info()
    logger.info(f"Webhook info: url={info.url}, pending={info.pending_update_count}")


async def main():
    bot = Bot(TOKEN)
    webhook_url = os.environ.get("WEBHOOK_URL")

    if webhook_url:
        await set_webhook(bot, webhook_url)

    app = web.Application()
    app.router.add_post(f"/telegram/{TOKEN}", webhook_handler)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", PORT)
    await site.start()
    logger.info(f"Webhook server running on port {PORT}")

    # Keep running
    try:
        await asyncio.Event().wait()
    finally:
        await runner.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
