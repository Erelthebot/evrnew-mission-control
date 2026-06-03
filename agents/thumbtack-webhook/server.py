#!/usr/bin/env python3
"""
Thumbtack -> GHL Lead Webhook Receiver
Receives lead POSTs from Thumbtack API and creates contacts in GoHighLevel.
Runs on port 3007.
"""
import json
import logging
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from shared import ghl_tool

PORT = 3007
_LOG_FILE = Path.home() / 'evrnew-marketing/logs/thumbtack-webhook.log'
_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler(str(_LOG_FILE)),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)


def create_ghl_contact(lead: dict) -> dict:
    """Map Thumbtack lead payload to GHL contact and create it via ghl_tool."""
    customer = lead.get("customer", {})
    request_info = lead.get("request", {})
    name = customer.get("name", "")
    parts = name.split(" ", 1)
    first = parts[0] if parts else ""
    last = parts[1] if len(parts) > 1 else ""

    contact = ghl_tool.create_contact(
        first_name=first,
        last_name=last,
        phone=customer.get("phone", ""),
        email=customer.get("email", ""),
        source="Thumbtack",
        tags=["thumbtack-lead"],
        custom_fields=[
            {"key": "thumbtack_lead_id",  "field_value": str(lead.get("leadID", ""))},
            {"key": "service_requested",  "field_value": request_info.get("category", {}).get("name", "")},
            {"key": "job_description",    "field_value": request_info.get("description", "")},
            {"key": "lead_price",         "field_value": str(lead.get("leadPrice", ""))},
        ],
    )
    if not contact:
        raise RuntimeError("ghl_tool.create_contact returned None")
    return contact


class WebhookHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        log.info(f"{self.address_string()} - {format % args}")

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status":"ok","service":"thumbtack-ghl-webhook"}')

    def do_POST(self):
        if self.path not in ["/thumbtack/leads", "/thumbtack/leads/"]:
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        log.info(f"Received Thumbtack payload: {body[:500]}")

        try:
            lead = json.loads(body)
            result = create_ghl_contact(lead)
            contact_id = result.get("id", "unknown")
            log.info(f"GHL contact created: {contact_id}")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "ghl_contact_id": contact_id}).encode())
        except Exception as e:
            log.error(f"Error processing lead: {e}", exc_info=True)
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), WebhookHandler)
    log.info(f"Thumbtack webhook receiver started on port {PORT}")
    log.info(f"Lead endpoint: https://mc-api.evrnew.com/thumbtack/leads")
    server.serve_forever()
