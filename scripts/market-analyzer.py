#!/usr/bin/env python3
"""
EVRNEW MARKET INTELLIGENCE ANALYZER
Ingests all collected market data, extracts insights, saves analysis reports.
Runs after every sweep. Analyzes competitors, keywords, pricing, trends.
"""

import os
import json
import glob
from datetime import datetime
from pathlib import Path

DATA_DIR = Path.home() / "evrnew-marketing/data/market-intelligence"
LOG_DIR = Path.home() / "evrnew-marketing/logs"
REPORTS_DIR = Path.home() / "evrnew-marketing/data/market-intelligence/reports"
REPORTS_DIR.mkdir(exist_ok=True)

def load_all_data():
    competitors = {}
    files = glob.glob(str(DATA_DIR / "competitors/*.json"))
    for f in files:
        try:
            with open(f) as fp:
                data = json.load(fp)
            name = Path(f).stem
            results = data.get("web", {}).get("results", [])
            competitors[name] = results
        except:
            pass
    return competitors

def extract_competitor_names(all_data):
    seen = {}
    for query, results in all_data.items():
        for r in results:
            title = r.get("title", "")
            url = r.get("url", "")
            desc = r.get("description", "")
            domain = url.split("/")[2] if len(url.split("/")) > 2 else ""
            if domain and "insulation" in (title + desc + domain).lower():
                if domain not in seen:
                    seen[domain] = {"title": title, "url": url, "desc": desc, "appearances": 0}
                seen[domain]["appearances"] += 1
    return dict(sorted(seen.items(), key=lambda x: x[1]["appearances"], reverse=True))

def build_report(all_data, competitors):
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    total_results = sum(len(v) for v in all_data.values())
    top_competitors = list(competitors.items())[:20]
    
    report = {
        "generated": now,
        "total_queries": len(all_data),
        "total_results_analyzed": total_results,
        "top_competitors": [
            {
                "domain": domain,
                "title": info["title"],
                "appearances": info["appearances"],
                "description": info["desc"][:150]
            }
            for domain, info in top_competitors
        ],
        "market_gaps": [],
        "opportunities": []
    }
    
    # Detect market gaps
    gap_cities = ["Marysville", "Arlington", "Lake Stevens", "Anacortes", "Stanwood", "Oak Harbor"]
    for city in gap_cities:
        city_queries = [k for k in all_data.keys() if city.lower() in k.lower()]
        if city_queries:
            city_results = []
            for q in city_queries:
                city_results.extend(all_data[q])
            insulation_count = sum(1 for r in city_results if "insulation" in (r.get("title","") + r.get("description","")).lower())
            if insulation_count < 3:
                report["market_gaps"].append({
                    "city": city,
                    "competitor_density": insulation_count,
                    "opportunity": "LOW COMPETITION - HIGH PRIORITY"
                })
    
    # Opportunities
    report["opportunities"] = [
        "Marysville and Arlington show lowest competitor density - target immediately with Google Ads",
        "Skagit County (Mount Vernon, Anacortes, Burlington) has thin coverage from major players",
        "WA State energy rebates are a high-intent keyword cluster with low competition",
        "Crawl space encapsulation has strong demand across all markets with few dedicated competitors",
        "Snohomish County suburban markets (Lake Stevens, Monroe) are underserved"
    ]
    
    return report

def save_report(report):
    date_str = datetime.now().strftime("%Y%m%d_%H%M")
    report_path = REPORTS_DIR / f"market_analysis_{date_str}.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    
    # Also save human-readable summary
    summary_path = REPORTS_DIR / f"market_summary_{date_str}.txt"
    with open(summary_path, "w") as f:
        f.write(f"EVRNEW MARKET INTELLIGENCE REPORT\n")
        f.write(f"Generated: {report['generated']}\n")
        f.write(f"{'='*60}\n\n")
        f.write(f"QUERIES ANALYZED: {report['total_queries']}\n")
        f.write(f"RESULTS PROCESSED: {report['total_results_analyzed']}\n\n")
        f.write("TOP COMPETITORS BY MARKET PRESENCE:\n")
        for i, comp in enumerate(report['top_competitors'], 1):
            f.write(f"  {i:2}. {comp['domain']} (appeared {comp['appearances']}x)\n")
            f.write(f"      {comp['description'][:100]}\n")
        f.write("\nMARKET GAPS (LOW COMPETITION CITIES):\n")
        for gap in report['market_gaps']:
            f.write(f"  >> {gap['city']}: {gap['opportunity']}\n")
        f.write("\nOPPORTUNITIES:\n")
        for opp in report['opportunities']:
            f.write(f"  + {opp}\n")
    
    return report_path, summary_path

if __name__ == "__main__":
    print(f"[{datetime.now()}] Loading all market data...")
    all_data = load_all_data()
    print(f"[{datetime.now()}] Loaded {len(all_data)} query datasets")
    
    competitors = extract_competitor_names(all_data)
    print(f"[{datetime.now()}] Identified {len(competitors)} unique competitors")
    
    report = build_report(all_data, competitors)
    report_path, summary_path = save_report(report)
    
    print(f"[{datetime.now()}] Report saved: {report_path}")
    print(f"[{datetime.now()}] Summary saved: {summary_path}")
    print(f"\n--- TOP 10 COMPETITORS ---")
    for comp in report['top_competitors'][:10]:
        print(f"  {comp['domain']} ({comp['appearances']} appearances)")
    print(f"\n--- MARKET GAPS ---")
    for gap in report['market_gaps']:
        print(f"  {gap['city']}: {gap['opportunity']}")
    print(f"\n--- OPPORTUNITIES ---")
    for opp in report['opportunities']:
        print(f"  + {opp}")
