#!/usr/bin/env python3
"""
Weekly credentials health check.
Pings each API with a minimal test call and writes status back to credentials.md.
"""
import os, re, json, sys
from datetime import datetime
from pathlib import Path
import urllib.request, urllib.error

ENV_FILE = Path.home() / "evrnew-marketing" / ".env"
CREDS_FILE = Path.home() / "evrnew-marketing" / "memory" / "credentials.md"
LOG_FILE = Path.home() / "evrnew-marketing" / "logs" / "check-credentials.log"
TODAY = datetime.now().strftime("%Y-%m-%d %H:%M")

# Load env vars
env = {}
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
# Also pull from process env
env = {**env, **os.environ}

results = {}

def check(name, fn):
    try:
        status, detail = fn()
        results[name] = {"status": status, "detail": detail}
        print(f"{'OK  ' if status == 'ok' else 'FAIL'} {name}: {detail}")
    except Exception as e:
        results[name] = {"status": "error", "detail": str(e)[:80]}
        print(f"ERR  {name}: {e}")

UA = "Mozilla/5.0 (compatible; evrnew-health-check/1.0)"

def http_get(url, headers=None, timeout=8):
    h = {"User-Agent": UA, **(headers or {})}
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read(200).decode(errors="replace")

# --- Checks ---

def check_gemini():
    key = env.get("GEMINI_API_KEY", "")
    if not key: return "missing", "no key"
    status, body = http_get("https://generativelanguage.googleapis.com/v1beta/openai/models",
        {"Authorization": f"Bearer {key}"})
    return ("ok", f"HTTP {status}") if status == 200 else ("fail", f"HTTP {status}")

def check_xai():
    key = env.get("XAI_API_KEY", "")
    if not key: return "missing", "no key"
    status, body = http_get("https://api.x.ai/v1/models",
        {"Authorization": f"Bearer {key}"})
    return ("ok", f"HTTP {status}") if status == 200 else ("fail", f"HTTP {status}")

def check_supabase():
    url = env.get("SUPABASE_URL", "")
    key = env.get("SUPABASE_ANON_KEY", "")
    if not url or not key: return "missing", "no url/key"
    status, _ = http_get(f"{url}/rest/v1/",
        {"apikey": key, "Authorization": f"Bearer {key}"})
    return ("ok", f"HTTP {status}") if status in (200, 404) else ("fail", f"HTTP {status}")

def check_twilio():
    sid = env.get("TWILIO_ACCOUNT_SID", "")
    token = env.get("TWILIO_AUTH_TOKEN", "")
    if not sid or not token: return "missing", "no sid/token"
    import base64
    creds = base64.b64encode(f"{sid}:{token}".encode()).decode()
    status, _ = http_get(f"https://api.twilio.com/2010-04-01/Accounts/{sid}.json",
        {"Authorization": f"Basic {creds}"})
    return ("ok", f"HTTP {status}") if status == 200 else ("fail", f"HTTP {status}")

def check_dataforseo():
    login = env.get("DATAFORSEO_LOGIN", "")
    pwd = env.get("DATAFORSEO_PASSWORD", "")
    if not login or not pwd: return "missing", "no login/pwd"
    import base64
    creds = base64.b64encode(f"{login}:{pwd}".encode()).decode()
    status, _ = http_get("https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
        {"Authorization": f"Basic {creds}", "Content-Type": "application/json"})
    return ("ok", f"HTTP {status}") if status in (200, 400) else ("fail", f"HTTP {status}")

def check_cloudflare():
    token = env.get("CLOUDFLARE_API_TOKEN", "")
    if not token: return "missing", "no token"
    status, body = http_get("https://api.cloudflare.com/client/v4/user/tokens/verify",
        {"Authorization": f"Bearer {token}"})
    ok = status == 200 and '"active"' in body
    return ("ok", "active") if ok else ("fail", f"HTTP {status}")

GHL_PIT_ROTATE_BY = "2026-07-09"  # 90-day rotation policy — update after each new PIT is generated

def check_ghl():
    key = env.get("GHL_API_KEY", "")
    if not key: return "missing", "no key"
    status, _ = http_get("https://services.leadconnectorhq.com/locations/4DKapRFZCHMehBPjCKKU",
        {"Authorization": f"Bearer {key}", "Version": "2021-07-28"})
    if status != 200:
        return ("fail", f"HTTP {status}")
    # Warn if PIT is within 10 days of rotation deadline
    from datetime import date
    days_left = (date.fromisoformat(GHL_PIT_ROTATE_BY) - date.today()).days
    if days_left <= 10:
        return ("warn", f"HTTP 200 — PIT rotation due in {days_left}d (by {GHL_PIT_ROTATE_BY})")
    return ("ok", f"HTTP 200 — PIT rotates {GHL_PIT_ROTATE_BY} ({days_left}d)")

def check_brave():
    key = env.get("BRAVE_API_KEY", "")
    if not key: return "missing", "no key"
    status, _ = http_get("https://api.search.brave.com/res/v1/web/search?q=test&count=1",
        {"Accept": "application/json", "X-Subscription-Token": key})
    return ("ok", f"HTTP {status}") if status == 200 else ("fail", f"HTTP {status}")

def check_github():
    token = env.get("GITHUB_TOKEN", "")
    if not token: return "missing", "no token"
    status, _ = http_get("https://api.github.com/user",
        {"Authorization": f"token {token}", "User-Agent": "erel-check"})
    return ("ok", f"HTTP {status}") if status == 200 else ("fail", f"HTTP {status}")

check("Gemini", check_gemini)
check("XAI/Grok", check_xai)
check("Supabase", check_supabase)
check("Twilio", check_twilio)
check("DataForSEO", check_dataforseo)
check("Cloudflare", check_cloudflare)
check("GHL", check_ghl)
check("Brave Search", check_brave)
check("GitHub", check_github)

# Build status table for credentials.md
lines = [f"\n## Credential Status — last checked {TODAY}\n"]
lines.append("| Service | Status | Detail |")
lines.append("|---------|--------|--------|")
for name, r in results.items():
    icon = "✅" if r["status"] == "ok" else ("⚠️" if r["status"] == "missing" else "❌")
    lines.append(f"| {name} | {icon} {r['status']} | {r['detail']} |")
status_block = "\n".join(lines)

# Update or append the status block in credentials.md
content = CREDS_FILE.read_text()
if "## Credential Status" in content:
    content = re.sub(r"\n## Credential Status.*?(?=\n## |\Z)", "\n" + status_block, content, flags=re.DOTALL)
else:
    content += "\n" + status_block

CREDS_FILE.write_text(content)

# Write log
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
with open(LOG_FILE, "a") as f:
    f.write(f"\n=== {TODAY} ===\n")
    for name, r in results.items():
        f.write(f"{r['status']:8} {name}: {r['detail']}\n")

ok_count = sum(1 for r in results.values() if r["status"] == "ok")
print(f"\n{ok_count}/{len(results)} credentials OK — status written to credentials.md")
