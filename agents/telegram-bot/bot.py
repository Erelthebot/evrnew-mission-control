#!/usr/bin/env python3
"""
Evrnew / OpenClaw Telegram Bot
Handles inbound messages, commands, and routes to the appropriate agents.

Token is stored in ~/.config/evrnew/telegram_bot_token
or in env var TELEGRAM_BOT_TOKEN.
"""
import asyncio
import json
import logging
import os
import sqlite3
from pathlib import Path
from datetime import datetime
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

# ── Constants ───────────────────────────────────────────────────
DB_PATH = Path.home() / "evrnew-marketing/db/conversations.db"
HISTORY_LIMIT = 40  # max messages (user+assistant) passed to LLM per request
MEMORY_PATH = Path.home() / "evrnew-marketing/EREL_MEMORY.md"
INSTRUCTIONS_PATH = Path.home() / "evrnew-marketing/CLAUDE.md"

# grok-3 pricing (per million tokens)
COST_INPUT_PER_M  = 3.00
COST_OUTPUT_PER_M = 15.00

AGENT_LOGS = {
    "ads":           Path.home() / "evrnew-marketing/logs/ads.log",
    "blog-seo":      Path.home() / "evrnew-marketing/logs/blog-seo.log",
    "competitive":   Path.home() / "evrnew-marketing/logs/competitive.log",
    "content":       Path.home() / "evrnew-marketing/logs/content.log",
    "email-drip":    Path.home() / "evrnew-marketing/logs/email-drip.log",
    "social":        Path.home() / "evrnew-marketing/logs/social.log",
    "strategy":      Path.home() / "evrnew-marketing/logs/strategy.log",
    "technical-seo": Path.home() / "evrnew-marketing/logs/technical-seo.log",
}


# ── Persistent conversation DB ──────────────────────────────────
def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id   TEXT    NOT NULL,
            role      TEXT    NOT NULL,
            content   TEXT    NOT NULL,
            ts        TEXT    NOT NULL
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS api_costs (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id        TEXT    NOT NULL,
            model          TEXT    NOT NULL,
            input_tokens   INTEGER NOT NULL,
            output_tokens  INTEGER NOT NULL,
            cost_usd       REAL    NOT NULL,
            ts             TEXT    NOT NULL
        )
    """)
    con.commit()
    con.close()


def save_cost(chat_id: str, model: str, input_tokens: int, output_tokens: int):
    cost = (input_tokens / 1_000_000 * COST_INPUT_PER_M) + \
           (output_tokens / 1_000_000 * COST_OUTPUT_PER_M)
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "INSERT INTO api_costs (chat_id, model, input_tokens, output_tokens, cost_usd, ts) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (chat_id, model, input_tokens, output_tokens, cost, datetime.utcnow().isoformat())
    )
    con.commit()
    con.close()
    return cost


def save_message(chat_id: str, role: str, content: str):
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "INSERT INTO messages (chat_id, role, content, ts) VALUES (?, ?, ?, ?)",
        (chat_id, role, content, datetime.utcnow().isoformat())
    )
    con.commit()
    con.close()


def load_history(chat_id: str) -> list[dict]:
    """Return the last HISTORY_LIMIT messages for this chat as LLM message dicts."""
    con = sqlite3.connect(DB_PATH)
    rows = con.execute(
        "SELECT role, content FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?",
        (chat_id, HISTORY_LIMIT)
    ).fetchall()
    con.close()
    # rows are newest-first; reverse to chronological order
    return [{"role": r, "content": c} for r, c in reversed(rows)]


def clear_history(chat_id: str):
    con = sqlite3.connect(DB_PATH)
    con.execute("DELETE FROM messages WHERE chat_id = ?", (chat_id,))
    con.commit()
    con.close()


def message_count(chat_id: str) -> int:
    con = sqlite3.connect(DB_PATH)
    n = con.execute(
        "SELECT COUNT(*) FROM messages WHERE chat_id = ?", (chat_id,)
    ).fetchone()[0]
    con.close()
    return n


# ── Token loading ───────────────────────────────────────────────
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


# ── System prompt ───────────────────────────────────────────────
def load_system_prompt() -> str:
    parts = [
        "You are Erel, Evrnew LLC's autonomous AI marketing chief of staff running on a Mac. "
        "Be concise, direct, and professional. Never use em dashes. "
        "You have a bash tool — use it freely and proactively. "
        "When asked about system state, services, files, logs, or anything that requires real data: run the command, don't guess. "
        "When asked to do something (deploy, restart a service, write a file, run a script): just do it. "
        "Chain multiple bash calls to complete a task fully before responding. "
        "CRITICAL: Never use code blocks, backticks, or markdown formatting in your final response text. Plain text only."
    ]
    if INSTRUCTIONS_PATH.exists():
        instructions = INSTRUCTIONS_PATH.read_text().strip()
        instructions = "\n".join(l for l in instructions.splitlines() if not l.startswith("@"))
        parts.append("\n\n--- OPERATING INSTRUCTIONS ---\n" + instructions)
    if MEMORY_PATH.exists():
        memory_content = MEMORY_PATH.read_text().strip()
        if len(memory_content) > 2000:  # Limit memory content to prevent context overflow
            memory_content = memory_content[:2000] + "\n[Memory truncated to prevent overflow]"
        parts.append("\n\n--- PERSISTENT MEMORY & CONTEXT ---\n" + memory_content)
    return "\n".join(parts)


# ── Helpers ─────────────────────────────────────────────────────
def strip_code_blocks(text: str) -> str:
    import re
    text = re.sub(r'(?m)^[ \t]*(```|~~~)[^\n]*\n([\s\S]*?)(```|~~~)[ \t]*$', r'\2', text)
    text = re.sub(r'(?m)^[ \t]*(```|~~~)[^\n]*$', '', text)
    text = re.sub(r'`+([^`]+)`+', r'\1', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def get_api_key() -> str:
    key = os.environ.get("XAI_API_KEY")
    if not key:
        key_file = Path.home() / ".config/xai/api_key"
        if key_file.exists():
            key = key_file.read_text().strip()
    return key


def extract_code_block(text: str):
    """Return (lang, code) if the message is a fenced code block, else (None, None)."""
    import re
    m = re.match(r'^```(\w*)\n([\s\S]+?)```\s*$', text.strip())
    if m:
        return m.group(1) or 'sh', m.group(2).strip()
    return None, None


def _run_command_sync(command: str, timeout: int = 120) -> tuple[str, int]:
    """Synchronous shell execution — call via run_command_async to avoid blocking."""
    import subprocess
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True,
            timeout=timeout, executable='/bin/zsh',
            env={**os.environ, 'HOME': str(Path.home()), 'PATH': os.environ.get('PATH', '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin')}
        )
        output = (result.stdout + result.stderr).strip()
        return output or '(no output)', result.returncode
    except subprocess.TimeoutExpired:
        return f'Timed out after {timeout}s', 124
    except Exception as e:
        return str(e), 1


def run_command(command: str, timeout: int = 120) -> tuple[str, int]:
    """Sync wrapper kept for /run command handler."""
    return _run_command_sync(command, timeout)


async def run_command_async(command: str, timeout: int = 120) -> tuple[str, int]:
    """Non-blocking shell execution — runs in thread pool so asyncio stays responsive."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run_command_sync, command, timeout)


# ── Tool definitions for xAI ─────────────────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "bash",
            "description": (
                "Execute a shell command on this Mac (zsh). Full permissions, no restrictions. "
                "Use this whenever you need real system state: processes, files, services, logs, "
                "git, APIs, deployments, scripts. Always prefer running commands over guessing. "
                "Timeout default 120s. For background tasks use 'nohup ... &'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "zsh command to execute"},
                    "timeout": {"type": "integer", "description": "timeout in seconds (max 300)", "default": 120}
                },
                "required": ["command"]
            }
        }
    }
]


# ── Command handlers ────────────────────────────────────────────
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "I'm the Evrnew AI Marketing Agent. I remember everything we discuss.\n\n"
        "Commands:\n"
        "/run      — Execute a shell command: /run ls -la\n"
        "/status   — System status\n"
        "/brief    — Today's marketing brief\n"
        "/deploy   — Deploy latest site changes\n"
        "/agents   — List active agents\n"
        "/activity — Last output from each agent\n"
        "/costs    — AI API usage and costs\n"
        "/memory   — Show how much I remember about this chat\n"
        "/forget   — Clear my memory for this chat\n"
        "/help     — Show this message\n\n"
        "Send a code block to auto-execute it:\n"
        "```bash\necho hello\n```"
    )


async def memory_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    n = message_count(chat_id)
    history = load_history(chat_id)
    # Estimate token count (rough: 4 chars per token)
    total_chars = sum(len(m["content"]) for m in history)
    estimated_tokens = total_chars // 4
    await update.message.reply_text(
        f"Memory for this chat:\n"
        f"Messages stored: {n}\n"
        f"Passed to LLM: {len(history)} (last {HISTORY_LIMIT})\n"
        f"Estimated tokens: ~{estimated_tokens:,}\n\n"
        f"Use /forget to clear and start fresh."
    )


async def forget_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    n = message_count(chat_id)
    clear_history(chat_id)
    await update.message.reply_text(
        f"Memory cleared. {n} messages deleted.\n"
        "Starting fresh from this point."
    )


async def status(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    import subprocess
    r = subprocess.run(
        ["launchctl", "list", "com.evrnew.moltbook-heartbeat"],
        capture_output=True, text=True
    )
    mb_status = "running" if r.returncode == 0 else "stopped"
    await update.message.reply_text(
        f"System Status\n"
        f"Site: https://openclaw-evrnew.netlify.app\n"
        f"Moltbook heartbeat: {mb_status}\n"
        f"Telegram bot: online"
    )


async def brief(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    from datetime import date
    today = date.today().strftime("%B %d, %Y")
    await update.message.reply_text(
        f"Daily Brief — {today}\n\n"
        "Moltbook presence: active\n"
        "OpenClaw site: live at openclaw-evrnew.netlify.app\n"
        "Pending: Telegram account setup\n"
        "Next: Content distribution to Moltbook"
    )


async def deploy(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    import subprocess
    await update.message.reply_text("Deploying site...")
    site_dir = Path.home() / "evrnew-marketing/sites/openclaw-site"
    result = subprocess.run(
        ["netlify", "deploy", "--dir", str(site_dir), "--prod"],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode == 0:
        import re
        url_match = re.search(r'https://[a-zA-Z0-9-]+\.netlify\.app', result.stdout)
        url = url_match.group(0) if url_match else "deployed"
        await update.message.reply_text(f"Deployed: {url}")
    else:
        await update.message.reply_text("Deploy failed. Check the server logs.")


async def agents(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Active Agents\n\n"
        "1. Moltbook Agent (erel_evrnew) — heartbeat every 30 min\n"
        "2. Telegram Bot — this bot\n"
        "3. Site Publisher — deploys via Netlify CLI\n\n"
        "Planned agents:\n"
        "- Email router\n"
        "- Content generator\n"
        "- Lead scorer"
    )


# ── /run command ────────────────────────────────────────────────
async def run_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Execute a shell command: /run <command>"""
    command = ' '.join(ctx.args) if ctx.args else ''
    if not command:
        await update.message.reply_text('Usage: /run <shell command>\nExample: /run ls -la ~')
        return

    thinking = await update.message.reply_text(f'Running: {command}')
    output, code = run_command(command)

    header = f'$ {command}\n[exit {code}]\n\n'
    full = header + output

    if len(full) > 4096:
        await thinking.edit_text(header + output[:4096 - len(header) - 20] + '\n...(truncated)')
    else:
        await thinking.edit_text(full)


# ── /activity command ───────────────────────────────────────────
async def activity_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Show the last meaningful line from each agent log."""
    lines = ["Agent Activity\n"]
    for name, log_path in AGENT_LOGS.items():
        if not log_path.exists():
            lines.append(f"{name}: no log")
            continue
        # Read last 50 lines, find the last non-empty, non-timestamped-INFO line
        try:
            tail = log_path.read_text(errors="ignore").splitlines()
            # Walk backwards for a meaningful summary line
            last = ""
            for line in reversed(tail):
                stripped = line.strip()
                if stripped and "[INFO]" not in stripped and "[WARNING]" not in stripped:
                    last = stripped[:120]
                    break
            if not last:
                # Fall back to any last non-empty line
                for line in reversed(tail):
                    if line.strip():
                        last = line.strip()[:120]
                        break
            lines.append(f"{name}: {last or 'no output'}")
        except Exception as e:
            lines.append(f"{name}: error reading log")
    await update.message.reply_text("\n".join(lines))


# ── /costs command ───────────────────────────────────────────────
async def costs_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Show AI API costs tracked by this bot."""
    con = sqlite3.connect(DB_PATH)

    # This month
    month_rows = con.execute("""
        SELECT SUM(input_tokens), SUM(output_tokens), SUM(cost_usd), COUNT(*)
        FROM api_costs
        WHERE strftime('%Y-%m', ts) = strftime('%Y-%m', 'now')
    """).fetchone()

    # All time
    total_rows = con.execute("""
        SELECT SUM(input_tokens), SUM(output_tokens), SUM(cost_usd), COUNT(*)
        FROM api_costs
    """).fetchone()

    # Last 5 calls
    recent = con.execute("""
        SELECT input_tokens, output_tokens, cost_usd, ts
        FROM api_costs
        ORDER BY id DESC LIMIT 5
    """).fetchall()

    con.close()

    def fmt(row):
        in_t, out_t, cost, calls = row
        return (
            f"Calls: {calls or 0}\n"
            f"Input tokens: {(in_t or 0):,}\n"
            f"Output tokens: {(out_t or 0):,}\n"
            f"Cost: ${(cost or 0):.4f}"
        )

    msg = "AI API Costs (this bot)\n\n"
    msg += "This month:\n" + fmt(month_rows) + "\n\n"
    msg += "All time:\n" + fmt(total_rows) + "\n\n"

    if recent:
        msg += "Last 5 calls:\n"
        for in_t, out_t, cost, ts in recent:
            msg += f"  {ts[:16]}  in={in_t:,} out={out_t:,}  ${cost:.4f}\n"

    await update.message.reply_text(msg)


# ── Send long message helper ─────────────────────────────────────
async def send_reply(thinking_msg, update, text: str):
    """Edit the thinking message then send overflow pages."""
    text = text.strip() or "(no response)"
    pages = [text[i:i+4096] for i in range(0, len(text), 4096)]
    try:
        await thinking_msg.edit_text(pages[0])
    except Exception:
        # "Message is not modified" or similar — send as new message instead
        await update.message.reply_text(pages[0])
    for page in pages[1:]:
        await update.message.reply_text(page)


# ── Main message handler ────────────────────────────────────────
async def echo(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Handle all non-command messages — agentic loop with bash tool."""
    from openai import OpenAI

    # In group chats, only respond when mentioned or directly replied to
    chat_type = update.message.chat.type
    if chat_type in ("group", "supergroup"):
        bot_username = ctx.bot.username
        replied_to_bot = (
            update.message.reply_to_message
            and update.message.reply_to_message.from_user
            and update.message.reply_to_message.from_user.username == bot_username
        )
        mentioned = f"@{bot_username}" in (update.message.text or "")
        if not replied_to_bot and not mentioned:
            return

    msg = update.message.text
    chat_id = str(update.effective_chat.id)

    # Auto-execute fenced code blocks sent directly by user
    lang, code = extract_code_block(msg)
    if lang and code:
        EXEC_LANGS = {'sh', 'bash', 'zsh', 'shell', 'python', 'python3', 'py', 'node', 'js'}
        if lang.lower() in EXEC_LANGS:
            thinking = await update.message.reply_text(f'Executing {lang} block...')
            if lang.lower() in ('python', 'python3', 'py'):
                command = f'python3 -c {__import__("shlex").quote(code)}'
            elif lang.lower() in ('node', 'js'):
                command = f'node -e {__import__("shlex").quote(code)}'
            else:
                command = code
            output, exit_code = run_command(command)
            header = f'[{lang}] exit {exit_code}\n\n'
            full = header + output
            save_message(chat_id, "user", msg)
            save_message(chat_id, "assistant", full)
            await send_reply(thinking, update, full)
            return

    thinking = await update.message.reply_text("Thinking...")

    save_message(chat_id, "user", msg)
    history = load_history(chat_id)  # includes the message we just saved

    # Build messages with system prompt first
    messages = [{"role": "system", "content": load_system_prompt()}] + history

    total_input = 0
    total_output = 0

    try:
        client = OpenAI(api_key=get_api_key(), base_url="https://api.x.ai/v1")

        for _ in range(20):  # max 20 tool calls per turn
            response = client.chat.completions.create(
                model="grok-3",
                max_tokens=4096,
                messages=messages,
                tools=TOOLS,
            )
            choice = response.choices[0]
            total_input += response.usage.prompt_tokens
            total_output += response.usage.completion_tokens

            if choice.finish_reason == "tool_calls":
                tool_calls = choice.message.tool_calls or []

                try:
                    await thinking.edit_text("...")
                except Exception:
                    pass

                # Append assistant message with tool calls
                messages.append({
                    "role": "assistant",
                    "content": choice.message.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                        }
                        for tc in tool_calls
                    ],
                })

                # Execute each tool call and append results
                for tc in tool_calls:
                    if tc.function.name == "bash":
                        args = json.loads(tc.function.arguments)
                        cmd = args.get("command", "")
                        timeout = min(int(args.get("timeout", 120)), 300)
                        output, exit_code = await run_command_async(cmd, timeout=timeout)
                        result_text = f"exit {exit_code}\n{output}"
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": result_text,
                        })
                continue

            # Final text response
            reply_text = strip_code_blocks((choice.message.content or "").strip())
            reply = reply_text or "(no response)"
            save_message(chat_id, "assistant", reply)
            save_cost(chat_id, "grok-3", total_input, total_output)
            await send_reply(thinking, update, reply)
            return

        await thinking.edit_text("Done.")

    except Exception as e:
        logger.error(f"xAI error: {e}")
        await thinking.edit_text(f"Error: {e}")


# ── Main ────────────────────────────────────────────────────────
def _kill_duplicate_instances():
    """Kill any other bot.py processes before starting to prevent Conflict errors."""
    import subprocess, signal
    current_pid = os.getpid()
    result = subprocess.run(["pgrep", "-f", "bot.py"], capture_output=True, text=True)
    for pid_str in result.stdout.strip().splitlines():
        pid = int(pid_str)
        if pid != current_pid:
            try:
                os.kill(pid, signal.SIGTERM)
                logger.info(f"Killed duplicate bot.py instance (pid {pid})")
            except ProcessLookupError:
                pass
    import time; time.sleep(2)


def main():
    _kill_duplicate_instances()
    init_db()
    token = get_token()
    app = Application.builder().token(token).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", start))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CommandHandler("brief", brief))
    app.add_handler(CommandHandler("deploy", deploy))
    app.add_handler(CommandHandler("agents", agents))
    app.add_handler(CommandHandler("memory", memory_cmd))
    app.add_handler(CommandHandler("forget", forget_cmd))
    app.add_handler(CommandHandler("run", run_cmd))
    app.add_handler(CommandHandler("activity", activity_cmd))
    app.add_handler(CommandHandler("costs", costs_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    logger.info("Starting Evrnew Telegram bot (with persistent memory)...")
    app.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)


if __name__ == "__main__":
    main()
