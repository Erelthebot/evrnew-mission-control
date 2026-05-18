# EVRNEW Agent Build Instructions

You are finishing and launching all 8 EVRNEW marketing agents on this Mac Mini server.
The venv is at ~/evrnew-marketing/.venv — use it for all Python execution.
Project root: ~/evrnew-marketing/
Shared utils: ~/evrnew-marketing/agents/shared/utils.py

## EXISTING AGENTS (have agent.py already — DO NOT REWRITE):
- agents/competitive/agent.py — Daily 6am — SERP + competitor intel
- agents/ads/agent.py — Every 6h — Google/Meta ad copy generation
- agents/blog-seo/agent.py — Mon+Thu 9am — local SEO blog posts
- agents/content/agent.py — Daily 7am — landing pages, email sequences

## MISSING AGENTS (need agent.py written from scratch):

### 1. agents/strategy/agent.py
- Schedule: Weekly Monday 8am
- Purpose: Pull competitive intel + market data, generate weekly marketing strategy brief
- Should: Read from ~/evrnew-marketing/data/competitors/ for latest intel, call DeepSeek-V4-Flash (via call_llm with model="reasoning") to synthesize a weekly strategy brief
- Output: Save brief to ~/evrnew-marketing/data/strategy/YYYY-MM-DD-weekly-brief.md
- Notify via Telegram when done
- Follow the exact same pattern as agents/competitive/agent.py (imports, load_env, AGENT_NAME, logger, main() function, etc.)

### 2. agents/social/agent.py
- Schedule: Daily 8am
- Purpose: Generate social media posts for Facebook, Instagram, Google Business Profile
- Should: Generate 3 posts per platform per day targeting PNW homeowners
  - Facebook: educational/trust-building (attic insulation, crawl space, spray foam topics)
  - Instagram: visual-friendly captions with hashtags
  - Google Business: short service updates/offers
- Call Gemini Pro (via call_llm with model="gemini") for generation
- Output: Save to ~/evrnew-marketing/data/social/YYYY-MM-DD-posts.json
- Notify via Telegram when done
- Follow the same pattern as the other agents

### 3. agents/technical-seo/agent.py
- Schedule: Weekly Wednesday 10am
- Purpose: Generate technical SEO audit checklist + schema markup for evrnew.com
- Should:
  - Generate LocalBusiness JSON-LD schema for EVRNEW (insulation contractor, PNW service area)
  - Generate page-by-page technical SEO checklist (meta titles, descriptions, H1s, etc.)
  - Identify top local keyword opportunities using Grok-3 (model="fast")
- Output: Save to ~/evrnew-marketing/data/seo/YYYY-MM-DD-technical-seo.json
- Notify via Telegram when done

### 4. agents/email-drip/agent.py
- Schedule: Weekly Tuesday 9am
- Purpose: Generate email drip sequences for leads
- Should: Create 5-email nurture sequences for different lead types:
  - Attic insulation inquiry
  - Crawl space inquiry
  - Commercial/spray foam inquiry
  - Post-estimate follow-up
  - Rebate education series
- Call Gemini Pro (via call_llm with model="gemini")
- Output: Save to ~/evrnew-marketing/data/email-drip/YYYY-MM-DD-sequences.json
- Notify via Telegram when done

## LAUNCHAGENT PLISTS — Create ALL 8 at ~/Library/LaunchAgents/:

Use this venv python: /Users/erel/evrnew-marketing/.venv/bin/python
Use this working dir: /Users/erel/evrnew-marketing

### Schedules:
- com.evrnew.agent-competitive.plist — Daily 6:00am (Hour=6, Minute=0)
- com.evrnew.agent-ads.plist — Every 6h (StartInterval=21600)
- com.evrnew.agent-blog-seo.plist — Mon+Thu 9am (Weekday 1 and 4, Hour=9)
- com.evrnew.agent-content.plist — Daily 7:00am (Hour=7, Minute=0)
- com.evrnew.agent-strategy.plist — Weekly Mon 8am (Weekday=1, Hour=8, Minute=0)
- com.evrnew.agent-social.plist — Daily 8:00am (Hour=8, Minute=0)
- com.evrnew.agent-technical-seo.plist — Weekly Wed 10am (Weekday=3, Hour=10, Minute=0)
- com.evrnew.agent-email-drip.plist — Weekly Tue 9am (Weekday=2, Hour=9, Minute=0)

### Plist template (adapt for each agent):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.evrnew.agent-NAME</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/erel/evrnew-marketing/.venv/bin/python</string>
        <string>/Users/erel/evrnew-marketing/agents/NAME/agent.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/erel/evrnew-marketing</string>
    <key>StandardOutPath</key>
    <string>/Users/erel/evrnew-marketing/logs/NAME.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/erel/evrnew-marketing/logs/NAME.err.log</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>H</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
```

For the ads agent (every 6h), use StartInterval instead:
```xml
    <key>StartInterval</key>
    <integer>21600</integer>
```

For blog-seo (Mon+Thu), create TWO StartCalendarInterval entries as an array.

## AFTER CREATING ALL FILES:

1. Create log directories:
   mkdir -p ~/evrnew-marketing/logs ~/evrnew-marketing/data/strategy ~/evrnew-marketing/data/social ~/evrnew-marketing/data/seo ~/evrnew-marketing/data/email-drip

2. Load all 8 LaunchAgents:
   launchctl load ~/Library/LaunchAgents/com.evrnew.agent-competitive.plist
   launchctl load ~/Library/LaunchAgents/com.evrnew.agent-ads.plist
   launchctl load ~/Library/LaunchAgents/com.evrnew.agent-blog-seo.plist
   launchctl load ~/Library/LaunchAgents/com.evrnew.agent-content.plist
   launchctl load ~/Library/LaunchAgents/com.evrnew.agent-strategy.plist
   launchctl load ~/Library/LaunchAgents/com.evrnew.agent-social.plist
   launchctl load ~/Library/LaunchAgents/com.evrnew.agent-technical-seo.plist
   launchctl load ~/Library/LaunchAgents/com.evrnew.agent-email-drip.plist

3. Verify all 8 are registered:
   launchctl list | grep "evrnew.agent"

4. Do a quick smoke test — run each new agent once directly to confirm no import errors:
   cd ~/evrnew-marketing && .venv/bin/python agents/strategy/agent.py 2>&1 | head -5
   cd ~/evrnew-marketing && .venv/bin/python agents/social/agent.py 2>&1 | head -5
   cd ~/evrnew-marketing && .venv/bin/python agents/technical-seo/agent.py 2>&1 | head -5
   cd ~/evrnew-marketing && .venv/bin/python agents/email-drip/agent.py 2>&1 | head -5

5. When all 8 are loaded and smoke tests pass, run:
   openclaw system event --text "Done: All 8 EVRNEW agents built and launched as LaunchAgents" --mode now
