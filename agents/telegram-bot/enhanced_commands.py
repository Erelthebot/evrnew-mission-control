#!/usr/bin/env python3
"""
Enhanced Telegram Bot Commands for Erel
Adds system monitoring, memory search, and operational commands
"""
import subprocess
from pathlib import Path
from datetime import datetime
import json

WORKSPACE = Path.home() / ".openclaw/workspace"
MEMORY_DIR = WORKSPACE / "memory"


def get_system_status():
    """Get comprehensive system status"""
    try:
        # Get service status
        result = subprocess.run(
            ["launchctl", "list"],
            capture_output=True,
            text=True
        )
        services = [line for line in result.stdout.split('\n') if 'evrnew' in line]
        
        running = []
        stopped = []
        for service in services:
            parts = service.split()
            if len(parts) >= 3:
                pid, exit_code, name = parts[0], parts[1], parts[2]
                if pid != '-':
                    running.append(f"✅ {name}")
                else:
                    stopped.append(f"⚠️ {name}")
        
        # Get Docker status
        docker_result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}: {{.Status}}"],
            capture_output=True,
            text=True
        )
        docker_services = docker_result.stdout.strip().split('\n') if docker_result.returncode == 0 else []
        
        # Get memory stats
        git_count = subprocess.run(
            ["git", "rev-list", "--count", "HEAD"],
            cwd=WORKSPACE,
            capture_output=True,
            text=True
        ).stdout.strip() if (WORKSPACE / ".git").exists() else "0"
        
        daily_logs = len(list(MEMORY_DIR.glob("202*.md"))) if MEMORY_DIR.exists() else 0
        
        status = f"""🦞 **Erel System Status**

**Services Running:**
{chr(10).join(running[:8])}

**Docker Containers:**
{chr(10).join(f"🐳 {s}" for s in docker_services[:5])}

**Memory System:**
📊 Git commits: {git_count}
📝 Daily logs: {daily_logs}
💾 Storage: {get_memory_size()}

**Uptime:**
⏱️ {get_uptime()}

Last checked: {datetime.now().strftime('%Y-%m-%d %H:%M:%S %Z')}
"""
        return status
    except Exception as e:
        return f"❌ Error getting system status: {str(e)}"


def get_memory_size():
    """Get memory directory size"""
    try:
        result = subprocess.run(
            ["du", "-sh", str(MEMORY_DIR)],
            capture_output=True,
            text=True
        )
        return result.stdout.split()[0] if result.returncode == 0 else "Unknown"
    except:
        return "Unknown"


def get_uptime():
    """Get system uptime"""
    try:
        result = subprocess.run(
            ["uptime"],
            capture_output=True,
            text=True
        )
        # Parse uptime output
        uptime_str = result.stdout.strip()
        if "up" in uptime_str:
            # Extract the time portion
            parts = uptime_str.split("up")[1].split(",")[0].strip()
            return parts
        return "Unknown"
    except:
        return "Unknown"


def get_latest_leads(limit=5):
    """Get latest leads from GHL (placeholder - needs GHL API integration)"""
    # TODO: Implement GHL API call once authentication is fixed
    return f"""📊 **Latest Leads** (Mock Data)

⏰ This feature requires GHL API integration.
Current status: API returning 403 errors

Next steps:
1. Fix GHL API authentication
2. Implement lead sync script
3. Enable real-time lead display

See memory/projects.md for details.
"""


def get_project_status():
    """Get active project status from memory"""
    try:
        projects_file = MEMORY_DIR / "projects.md"
        if not projects_file.exists():
            return "❌ Projects file not found"
        
        content = projects_file.read_text()
        
        # Extract project sections
        projects = []
        current_project = None
        for line in content.split('\n'):
            if line.startswith('## ') and 'Last Updated' not in line:
                current_project = line.replace('## ', '').strip()
                projects.append(f"📌 **{current_project}**")
            elif current_project and line.startswith('**Status:**'):
                status = line.replace('**Status:**', '').strip()
                projects.append(f"   Status: {status}")
                current_project = None  # Reset after status
        
        if projects:
            return "🎯 **Active Projects**\n\n" + '\n'.join(projects[:10])
        else:
            return "ℹ️ No active projects found"
    except Exception as e:
        return f"❌ Error reading projects: {str(e)}"


def search_memory(query):
    """Search memory files for a query"""
    try:
        results = []
        search_files = [
            "systems.md",
            "people.md", 
            "projects.md",
            "lessons.md"
        ]
        
        for filename in search_files:
            filepath = MEMORY_DIR / filename
            if filepath.exists():
                content = filepath.read_text()
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if query.lower() in line.lower():
                        # Get context (2 lines before and after)
                        start = max(0, i-2)
                        end = min(len(lines), i+3)
                        context = '\n'.join(lines[start:end])
                        results.append(f"**{filename}**:\n```\n{context}\n```")
                        break  # Only first match per file
        
        if results:
            return f"🔍 **Memory Search: '{query}'**\n\n" + '\n\n'.join(results[:5])
        else:
            return f"ℹ️ No results found for '{query}'"
    except Exception as e:
        return f"❌ Error searching memory: {str(e)}"


def get_stats():
    """Get today's statistics"""
    # TODO: Implement actual stats from GHL, n8n, etc.
    today = datetime.now().strftime('%Y-%m-%d')
    
    return f"""📊 **Today's Stats** ({today})

⏰ This feature requires integration setup.

Planned metrics:
• New leads from GHL
• Emails processed
• Tasks completed
• API calls made

Status: Integration in progress
See MEMORY_UPGRADES.md for roadmap
"""


def trigger_backup():
    """Trigger memory backup"""
    try:
        result = subprocess.run(
            ["bash", str(WORKSPACE / "scripts/memory_backup.sh")],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return f"✅ Memory backup completed:\n\n{result.stdout}"
        else:
            return f"❌ Backup failed:\n{result.stderr}"
    except Exception as e:
        return f"❌ Error running backup: {str(e)}"


def get_health_check():
    """Run full system health diagnostic"""
    try:
        result = subprocess.run(
            ["bash", str(WORKSPACE / "scripts/memory_health.sh")],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return f"🏥 **System Health Report**\n\n```\n{result.stdout}\n```"
        else:
            return f"❌ Health check failed:\n{result.stderr}"
    except Exception as e:
        return f"❌ Error running health check: {str(e)}"


# Command handlers for Telegram bot
ENHANCED_COMMANDS = {
    '/status': get_system_status,
    '/leads': get_latest_leads,
    '/stats': get_stats,
    '/projects': get_project_status,
    '/health': get_health_check,
    '/backup': trigger_backup,
}

# Commands that take arguments
def handle_memory_search(args):
    """Handle /memory <query> command"""
    if not args:
        return "Usage: /memory <search query>\n\nExample: /memory GHL API"
    query = ' '.join(args)
    return search_memory(query)


def handle_remind(args):
    """Handle /remind <time> <message> command"""
    # TODO: Implement cron-based reminder system
    return """⏰ **Reminder System**

Feature coming soon. Will use:
• OpenClaw cron tool for scheduling
• Telegram notifications at specified time
• Persistent reminder storage

Usage (planned):
/remind 30m Check lead responses
/remind 2h Follow up with Johnny
/remind tomorrow 9am Send weekly report
"""


def handle_alert(args):
    """Handle /alert <message> command - send to Spencer+Johnny"""
    if not args:
        return "Usage: /alert <message>\n\nSends urgent alert to Spencer and Johnny"
    
    message = ' '.join(args)
    # TODO: Implement group message sending
    return f"""📢 **Alert System**

Would send to:
• Spencer (Telegram: 8688596596)
• Johnny (Telegram: 8733921180)
• Group chat: -5294204937

Message: {message}

⚠️ Alert sending requires Telegram API integration (in progress)
"""


# Export command definitions
def get_command_list():
    """Return list of BotCommand objects for Telegram"""
    from telegram import BotCommand
    return [
        BotCommand("status", "System health and service status"),
        BotCommand("leads", "Latest leads from GHL"),
        BotCommand("stats", "Today's metrics and statistics"),
        BotCommand("projects", "Active project status"),
        BotCommand("memory", "Search memory system"),
        BotCommand("health", "Full system diagnostic"),
        BotCommand("backup", "Trigger memory backup"),
        BotCommand("remind", "Set a reminder"),
        BotCommand("alert", "Send urgent alert to team"),
    ]
