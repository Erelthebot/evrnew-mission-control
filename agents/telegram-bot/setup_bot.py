#!/usr/bin/env python3
"""
Auto-create the Evrnew bot via BotFather using Telegram Web (Playwright).
Run this AFTER logging into Telegram. It will:
  1. Message @BotFather /newbot
  2. Set name "Evrnew Agent"
  3. Set username "evrnew_agent_bot"
  4. Extract and save the bot token
  5. Set bot description and commands
"""
import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright

PROFILE = "/tmp/chrome-profile"
BOT_NAME = "Evrnew Agent"
BOT_USERNAME = "evrnew_agent_bot"
TOKEN_FILE = Path.home() / ".config/evrnew/telegram_bot_token"


async def send_and_wait(page, input_box, text: str, wait_ms: int = 3000):
    """Type a message and wait for response."""
    await input_box.click()
    await page.keyboard.type(text)
    await page.keyboard.press("Enter")
    await page.wait_for_timeout(wait_ms)


async def get_last_messages(page, n: int = 5) -> list[str]:
    """Get the last n messages from BotFather chat."""
    return await page.evaluate(f"""
        () => {{
            const sel = [
                '.message .text-content',
                '.message [class*="message-text"]',
                '[class*="bubble"] .text-content',
                '[class*="message"] .translatable-message'
            ].join(', ');
            const msgs = document.querySelectorAll(sel);
            return Array.from(msgs).slice(-{n}).map(m => m.innerText || m.textContent);
        }}
    """)


async def main():
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            PROFILE, headless=False,
            args=["--no-sandbox"], ignore_https_errors=True,
            viewport={"width": 1280, "height": 800},
        )
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()

        # Navigate to BotFather
        print("Opening @BotFather...")
        await page.goto("https://web.telegram.org/k/#@BotFather",
                       wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(5000)
        await page.screenshot(path="/tmp/setup_botfather.png")

        # Check if logged in
        text = await page.evaluate("() => document.body.innerText.substring(0, 200)")
        if "Sign in" in text or "with the code" in text:
            print("ERROR: Not logged into Telegram!")
            print("Please log in first, then run this script.")
            await ctx.close()
            return

        # Find message input
        input_box = page.locator(
            "[contenteditable='true'].composer-rich-textarea, "
            ".input-message-container [contenteditable='true']"
        ).first

        if await input_box.count() == 0:
            print("ERROR: No message input found.")
            await ctx.close()
            return

        print("Sending /newbot...")
        await send_and_wait(page, input_box, "/newbot", 3000)

        msgs = await get_last_messages(page, 3)
        print(f"Response: {msgs}")

        # Check for "send a name" prompt
        if any("name" in m.lower() for m in msgs):
            print(f"Sending bot name: {BOT_NAME}")
            await send_and_wait(page, input_box, BOT_NAME, 2000)

            msgs2 = await get_last_messages(page, 3)
            print(f"After name: {msgs2}")

            # Check for "send a username" prompt
            if any("username" in m.lower() for m in msgs2):
                # Try the username (might already be taken)
                for username_try in [BOT_USERNAME, f"evrnew_ai_bot", f"evrnew_openclaw_bot"]:
                    print(f"Trying username: @{username_try}")
                    await send_and_wait(page, input_box, username_try, 4000)

                    msgs3 = await get_last_messages(page, 3)
                    print(f"After username: {msgs3}")

                    # Check if we got a token
                    token = None
                    for msg in msgs3:
                        match = re.search(r'(\d{8,12}:[A-Za-z0-9_-]{35,})', msg)
                        if match:
                            token = match.group(1)
                            break

                    if token:
                        print(f"\n✅ BOT TOKEN: {token}")
                        # Save token
                        TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
                        TOKEN_FILE.write_text(token)
                        print(f"Token saved to: {TOKEN_FILE}")

                        # Set bot commands
                        print("\nSetting bot commands...")
                        await send_and_wait(page, input_box, "/setcommands", 2000)
                        await send_and_wait(page, input_box, f"@{username_try}", 2000)
                        commands = (
                            "start - Start the bot\n"
                            "status - System status\n"
                            "brief - Today's marketing brief\n"
                            "deploy - Deploy latest site\n"
                            "agents - List active agents\n"
                            "help - Show help"
                        )
                        await send_and_wait(page, input_box, commands, 3000)

                        # Set description
                        await send_and_wait(page, input_box, "/setdescription", 2000)
                        await send_and_wait(page, input_box, f"@{username_try}", 2000)
                        await send_and_wait(page, input_box,
                            "Evrnew AI Marketing Agent. Manages OpenClaw infrastructure, "
                            "deploys sites, and coordinates AI agents.", 3000)

                        await page.screenshot(path="/tmp/setup_done.png")
                        print(f"\n✅ Bot @{username_try} is ready!")
                        print(f"Run the bot with: python3 ~/evrnew-marketing/agents/telegram-bot/bot.py")
                        break

                    if "already taken" in str(msgs3).lower():
                        print(f"Username taken, trying next...")
                        continue

        await asyncio.sleep(3)
        await ctx.close()


asyncio.run(main())
