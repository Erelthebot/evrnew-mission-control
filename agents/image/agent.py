"""
Image Generation Agent — Gemini image API only (see config/llm-config.json → image).
Text/reasoning uses Grok-3 / DeepSeek-V4-Flash; this agent is the sole Gemini consumer.
Schedule: On-demand (called by other agents or directly via CLI/Telegram)

Usage:
    python3 agent.py "spray foam insulation being applied in an attic, dramatic lighting, professional"
    python3 agent.py --batch          # process all pending briefs from social/ads agents
    python3 agent.py --batch --limit 5
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.utils import (
    get_logger,
    log,
    notify_telegram,
    save_json,
    today_str,
    now_str,
    upsert_agent_output,
    log_activity,
    load_env,
)

load_env()

from google import genai
from google.genai import types

AGENT_NAME = "image"
logger = get_logger(AGENT_NAME)

MODEL = "gemini-3.1-flash-image-preview"
OUTPUT_DIR = Path.home() / "evrnew-marketing/data/images"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Platform-specific defaults
PLATFORM_CONFIGS: dict[str, dict] = {
    "instagram":        {"aspect_ratio": "4:5",  "image_size": "2K"},
    "instagram_square": {"aspect_ratio": "1:1",  "image_size": "2K"},
    "instagram_story":  {"aspect_ratio": "9:16", "image_size": "2K"},
    "facebook":         {"aspect_ratio": "16:9", "image_size": "2K"},
    "google_business":  {"aspect_ratio": "4:3",  "image_size": "1K"},
    "default":          {"aspect_ratio": "4:3",  "image_size": "1K"},
}

# Brand style injected into every prompt
BRAND_STYLE = (
    "Professional photography style. Pacific Northwest setting where relevant. "
    "Clean, modern, trustworthy aesthetic. No people unless essential. "
    "Evrnew brand colors: white, navy blue, and orange accents. "
    "High quality, commercial grade, suitable for a home services marketing campaign."
)

# Evrnew-specific prompt enhancer
EVRNEW_CONTEXT = (
    "The image is for Evrnew LLC, a residential and commercial insulation company "
    "serving King, Snohomish, and Skagit counties in Washington State. "
    "Services include spray foam, blown-in, batt insulation, crawl space encapsulation, "
    "and attic insulation."
)


def get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GEMINI_API_KEY not set. Get one at https://aistudio.google.com/apikey "
            "and add it to ~/evrnew-marketing/.env as GEMINI_API_KEY=..."
        )
    return genai.Client(api_key=api_key)


def build_prompt(brief: str, platform: str = "default") -> str:
    """Inject brand context and style into a raw brief."""
    return f"{brief}\n\n{EVRNEW_CONTEXT}\n\n{BRAND_STYLE}"


def generate_image(
    brief: str,
    platform: str = "default",
    filename_prefix: str = "",
) -> dict:
    """
    Generate a single image from a brief.
    Returns dict with: prompt, platform, filepath, filename, timestamp, success, error
    """
    client = get_client()
    config = PLATFORM_CONFIGS.get(platform, PLATFORM_CONFIGS["default"])
    prompt = build_prompt(brief, platform)

    log(AGENT_NAME, f"Generating [{platform}] {config['image_size']} {config['aspect_ratio']} — {brief[:80]}...")

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=types.ImageConfig(
                    aspect_ratio=config["aspect_ratio"],
                    image_size=config["image_size"],
                ),
            ),
        )

        # Find the image part in the response
        image_data: bytes | None = None
        model_caption: str = ""

        for part in response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data is not None:
                image_data = part.inline_data.data
                # inline_data.data may already be bytes or base64 str
                if isinstance(image_data, str):
                    image_data = base64.b64decode(image_data)
            elif hasattr(part, "text") and part.text:
                model_caption = part.text.strip()

        if image_data is None:
            raise ValueError("No image data in response")

        # Save file
        ts = int(time.time())
        prefix = f"{filename_prefix}_" if filename_prefix else ""
        safe_brief = "".join(c if c.isalnum() else "_" for c in brief[:40]).strip("_")
        filename = f"{prefix}{platform}_{safe_brief}_{ts}.png"
        filepath = OUTPUT_DIR / filename

        with open(filepath, "wb") as f:
            f.write(image_data)

        log(AGENT_NAME, f"Saved: {filepath} ({len(image_data)//1024}KB)")

        return {
            "success": True,
            "filepath": str(filepath),
            "filename": filename,
            "platform": platform,
            "brief": brief,
            "model_caption": model_caption,
            "resolution": config["image_size"],
            "aspect_ratio": config["aspect_ratio"],
            "timestamp": now_str(),
            "error": None,
        }

    except Exception as e:
        log(AGENT_NAME, f"Generation failed: {e}", "error")
        return {
            "success": False,
            "filepath": None,
            "filename": None,
            "platform": platform,
            "brief": brief,
            "model_caption": None,
            "resolution": config["image_size"],
            "aspect_ratio": config["aspect_ratio"],
            "timestamp": now_str(),
            "error": str(e),
        }


def process_batch(limit: int = 10) -> list[dict]:
    """
    Pull pending image briefs from today's social + ads agent outputs
    and generate images for each.
    """
    results = []
    processed = 0

    # Look for today's social posts with suggested_image fields
    social_files = sorted(
        Path.home() / "evrnew-marketing/data/social".glob(f"*{today_str()}*.json"),
        reverse=True,
    )

    for social_file in social_files:
        if processed >= limit:
            break
        try:
            data = json.loads(social_file.read_text())
            posts = data if isinstance(data, list) else data.get("posts", [])
            for post in posts:
                if processed >= limit:
                    break
                brief = post.get("suggested_image", "").strip()
                platform = post.get("platform", "default")
                if not brief:
                    continue

                # Map social platform names to image platform configs
                platform_map = {
                    "instagram": "instagram",
                    "facebook": "facebook",
                    "google_business": "google_business",
                }
                img_platform = platform_map.get(platform, "default")

                result = generate_image(brief, img_platform, filename_prefix=f"social_{platform}")
                result["source_file"] = str(social_file)
                result["post_topic"] = post.get("topic", "")
                results.append(result)
                processed += 1

                # Rate limit — Nano Banana 2 preview has strict RPM
                time.sleep(3)

        except Exception as e:
            log(AGENT_NAME, f"Error reading {social_file}: {e}", "warning")

    # Look for today's ad creatives with creative_brief fields
    ads_files = sorted(
        Path.home() / "evrnew-marketing/data/ads".glob(f"*{today_str()}*.json"),
        reverse=True,
    )

    for ads_file in ads_files:
        if processed >= limit:
            break
        try:
            data = json.loads(ads_file.read_text())
            ads = data if isinstance(data, list) else data.get("ads", [])
            for ad in ads:
                if processed >= limit:
                    break
                brief = ad.get("creative_brief", "").strip()
                if not brief:
                    continue

                result = generate_image(brief, "facebook", filename_prefix="ads")
                result["source_file"] = str(ads_file)
                result["ad_group"] = ad.get("ad_group", "")
                results.append(result)
                processed += 1
                time.sleep(3)

        except Exception as e:
            log(AGENT_NAME, f"Error reading {ads_file}: {e}", "warning")

    return results


def run_single(prompt: str, platform: str = "default") -> dict:
    """Generate a single image and return result. Used for direct CLI/Telegram calls."""
    result = generate_image(prompt, platform)
    return result


def run(batch: bool = False, limit: int = 10, prompt: str = "", platform: str = "default") -> dict:
    """Main entry point."""
    log(AGENT_NAME, "=== Image Generation Agent (Nano Banana 2) starting ===")

    if batch:
        log(AGENT_NAME, f"Batch mode — processing up to {limit} briefs...")
        results = process_batch(limit=limit)
        success_count = sum(1 for r in results if r["success"])
        fail_count = len(results) - success_count

        summary = {
            "mode": "batch",
            "total": len(results),
            "success": success_count,
            "failed": fail_count,
            "results": results,
            "date": today_str(),
        }

        save_json(AGENT_NAME, f"batch_{today_str()}.json", summary)
        upsert_agent_output(AGENT_NAME, "batch_results", content=json.dumps(summary, indent=2))

        msg = (
            f"Image batch done: {success_count}/{len(results)} generated. "
            f"Saved to data/images/."
        )
        if fail_count:
            msg += f" {fail_count} failed."
        notify_telegram(msg)
        log(AGENT_NAME, msg)
        return summary

    elif prompt:
        result = run_single(prompt, platform)
        if result["success"]:
            msg = f"Image generated: {result['filename']} ({result['resolution']}, {result['aspect_ratio']})"
            notify_telegram(msg)
        else:
            notify_telegram(f"Image generation failed: {result['error']}")
        upsert_agent_output(AGENT_NAME, "single_result", content=json.dumps(result, indent=2))
        return result

    else:
        log(AGENT_NAME, "No prompt or --batch flag provided. Use --help.", "warning")
        return {}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nano Banana 2 Image Generation Agent")
    parser.add_argument("prompt", nargs="?", default="", help="Image prompt/brief")
    parser.add_argument("--platform", default="default",
                        choices=list(PLATFORM_CONFIGS.keys()),
                        help="Target platform (affects aspect ratio + resolution)")
    parser.add_argument("--batch", action="store_true",
                        help="Process all pending briefs from social + ads agents")
    parser.add_argument("--limit", type=int, default=10,
                        help="Max images to generate in batch mode (default: 10)")
    args = parser.parse_args()

    result = run(batch=args.batch, limit=args.limit, prompt=args.prompt, platform=args.platform)
    print(json.dumps(result, indent=2))
