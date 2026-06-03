#!/usr/bin/env python3
"""
Webhook Receiver for Erel — no external dependencies (stdlib only).
Handles incoming webhooks from GHL, Thumbtack, Stripe, n8n.

Port: 8766 (8765 reserved by triggers.py)
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.utils import notify_telegram, log, save_json

WEBHOOK_PORT      = int(os.environ.get("WEBHOOK_PORT", 8766))
WEBHOOK_LOG_DIR   = Path.home() / "evrnew-marketing/data/webhooks"
WEBHOOK_LOG_DIR.mkdir(parents=True, exist_ok=True)

LEAD_INTAKE_SCRIPT  = Path.home() / "evrnew-marketing/scripts/ghl-lead-intake.py"
QB_INVOICE_SCRIPT   = Path.home() / "evrnew-marketing/scripts/ghl-won-qb-invoice.py"
PYTHON_BIN          = Path.home() / "evrnew-venv/bin/python3"


def _spawn_lead_intake(contact_id: str) -> None:
    """Fire-and-forget: run lead intake script in background thread."""
    def _run():
        try:
            result = subprocess.run(
                [str(PYTHON_BIN), str(LEAD_INTAKE_SCRIPT), contact_id],
                capture_output=True, text=True, timeout=60,
                env={**os.environ, "PYTHONPATH": str(Path.home() / "evrnew-marketing")},
            )
            if result.returncode != 0:
                logger.error(f"lead-intake failed for {contact_id}: {result.stderr[:300]}")
            else:
                logger.info(f"lead-intake completed for {contact_id}")
        except Exception as exc:
            logger.error(f"lead-intake exception for {contact_id}: {exc}")

    t = threading.Thread(target=_run, daemon=True)
    t.start()


def _spawn_qb_invoice(opp: dict) -> None:
    """Fire-and-forget: create a QB invoice for a won GHL opportunity."""
    import json as _json
    def _run():
        try:
            result = subprocess.run(
                [str(PYTHON_BIN), str(QB_INVOICE_SCRIPT), _json.dumps(opp)],
                capture_output=True, text=True, timeout=90,
                env={**os.environ, "PYTHONPATH": str(Path.home() / "evrnew-marketing")},
            )
            if result.returncode != 0:
                logger.error(f"qb-invoice failed for opp {opp.get('id')}: {result.stderr[:300]}")
            else:
                logger.info(f"qb-invoice completed for opp {opp.get('id')}")
        except Exception as exc:
            logger.error(f"qb-invoice exception for opp {opp.get('id')}: {exc}")
    threading.Thread(target=_run, daemon=True).start()


def _log_to_supabase(action: str, category: str, details: str, related_id: str = "") -> None:
    """Best-effort Supabase activity_log write — never raises."""
    def _run():
        try:
            from shared.utils import load_env
            load_env()
            from supabase import create_client
            sb = create_client(
                os.getenv("SUPABASE_URL", ""),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
            )
            row = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": action,
                "category": category,
                "actor": "webhook-receiver",
                "details": details,
            }
            if related_id:
                row["related_id"] = related_id
            sb.table("activity_logs").insert(row).execute()
        except Exception as exc:
            logger.warning(f"Supabase activity_log failed: {exc}")

    threading.Thread(target=_run, daemon=True).start()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def _read_body(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", 0))
    raw = handler.rfile.read(length) if length else b"{}"
    try:
        return json.loads(raw)
    except Exception:
        return {}


def _ok(handler: BaseHTTPRequestHandler, body: dict):
    payload = json.dumps(body).encode()
    handler.send_response(200)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(payload)))
    handler.end_headers()
    handler.wfile.write(payload)


def _err(handler: BaseHTTPRequestHandler, msg: str, code: int = 500):
    payload = json.dumps({"status": "error", "message": msg}).encode()
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(payload)))
    handler.end_headers()
    handler.wfile.write(payload)


# ── Route handlers ────────────────────────────────────────────────────────────

def handle_health(handler: BaseHTTPRequestHandler):
    _ok(handler, {
        "status": "healthy",
        "service": "erel-webhook-receiver",
        "port": WEBHOOK_PORT,
        "timestamp": datetime.now().isoformat(),
    })


def handle_ghl(handler: BaseHTTPRequestHandler):
    try:
        data = _read_body(handler)
        event_type = data.get("type", "unknown")
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        save_json("webhooks", f"ghl_{event_type}_{ts}.json", data)
        logger.info(f"GHL webhook: {event_type}")

        if event_type in ("ContactCreate", "Contact.Create"):
            # Full lead intake automation: tag, service area, pipeline, task, Telegram
            contact = data.get("contact", data)
            contact_id = contact.get("id") or data.get("id")
            if contact_id:
                _spawn_lead_intake(contact_id)
            else:
                # Fallback: basic notification if no ID
                name  = contact.get("contactName") or f"{contact.get('firstName','')} {contact.get('lastName','')}".strip() or "Unknown"
                notify_telegram(f"New GHL lead: {name} | {contact.get('email','N/A')} | {contact.get('phone','N/A')}")

        elif event_type in ("ContactUpdate", "Contact.Update"):
            # Lightweight — just log, no Telegram noise
            contact = data.get("contact", data)
            contact_id = contact.get("id") or data.get("id", "")
            name = contact.get("contactName") or f"{contact.get('firstName','')} {contact.get('lastName','')}".strip()
            _log_to_supabase("ghl_contact_update", "crm", f"Contact updated: {name}", contact_id)

        elif event_type in ("OpportunityCreate", "Opportunity.Create"):
            opp    = data.get("opportunity", data)
            name   = opp.get("name", "Unknown")
            value  = opp.get("monetaryValue", 0)
            stage  = opp.get("pipelineStageName", "")
            opp_id = opp.get("id", "")
            msg = f"New GHL opportunity: {name} — ${value:,} [{stage}]" if value else f"New GHL opportunity: {name} [{stage}]"
            notify_telegram(msg)
            _log_to_supabase("ghl_opportunity_create", "crm", msg, opp_id)

        elif event_type == "OpportunityStatusUpdate":
            opp    = data.get("opportunity", data)
            name   = opp.get("name", "Unknown")
            status = opp.get("status", "")
            value  = opp.get("monetaryValue", 0)
            opp_id = opp.get("id", "")
            msg = f"GHL opportunity {status}: {name} — ${value:,}" if value else f"GHL opportunity {status}: {name}"
            notify_telegram(msg)
            _log_to_supabase("ghl_opportunity_status", "crm", msg, opp_id)

            if status.lower() == "won":
                _spawn_qb_invoice(opp)

        elif event_type == "InboundMessage":
            contact_name = data.get("contactName") or data.get("fullName", "Unknown")
            body_text    = (data.get("body") or data.get("message", ""))[:200]
            msg_type     = data.get("messageType") or data.get("type", "message")
            contact_id   = data.get("contactId", "")
            msg = f"GHL inbound {msg_type} from {contact_name}: {body_text}"
            notify_telegram(msg)
            _log_to_supabase("ghl_inbound_message", "crm", msg, contact_id)

        elif event_type == "TaskCreate":
            task        = data.get("task", data)
            title       = task.get("title", "Unknown task")
            contact_id  = task.get("contactId", "")
            _log_to_supabase("ghl_task_create", "crm", f"Task created: {title}", contact_id)

        log("webhook", f"GHL {event_type} processed")
        _ok(handler, {"status": "success", "processed": event_type})
    except Exception as e:
        logger.error(f"GHL webhook error: {e}", exc_info=True)
        _err(handler, str(e))


def handle_thumbtack(handler: BaseHTTPRequestHandler):
    try:
        data = _read_body(handler)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        save_json("webhooks", f"thumbtack_{ts}.json", data)
        log("webhook", "Thumbtack webhook received")
        _ok(handler, {"status": "success"})
    except Exception as e:
        _err(handler, str(e))


def handle_stripe(handler: BaseHTTPRequestHandler):
    try:
        data = _read_body(handler)
        event_type = data.get("type", "unknown")
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        save_json("webhooks", f"stripe_{event_type}_{ts}.json", data)

        if event_type.startswith("payment_intent"):
            obj    = data.get("data", {}).get("object", {})
            amount = obj.get("amount", 0) / 100
            status = obj.get("status", "unknown")
            notify_telegram(f"Stripe payment {status}: ${amount:.2f}")

        log("webhook", f"Stripe {event_type} processed")
        _ok(handler, {"status": "success"})
    except Exception as e:
        _err(handler, str(e))


def handle_n8n(handler: BaseHTTPRequestHandler):
    try:
        data = _read_body(handler)
        workflow = data.get("workflow", "unknown")
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        save_json("webhooks", f"n8n_{workflow}_{ts}.json", data)
        if data.get("notify"):
            notify_telegram(f"n8n workflow complete: {workflow}")
        log("webhook", f"n8n {workflow} processed")
        _ok(handler, {"status": "success"})
    except Exception as e:
        _err(handler, str(e))


def handle_test(handler: BaseHTTPRequestHandler):
    data = _read_body(handler)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_json("webhooks", f"test_{ts}.json", data)
    _ok(handler, {"status": "success", "received": data, "timestamp": datetime.now().isoformat()})


# ── Router ────────────────────────────────────────────────────────────────────

ROUTES: dict[str, callable] = {
    "/health":          handle_health,
    "/webhook/ghl":     handle_ghl,
    "/webhook/thumbtack": handle_thumbtack,
    "/webhook/stripe":  handle_stripe,
    "/webhook/n8n":     handle_n8n,
    "/webhook/test":    handle_test,
}


class WebhookHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        logger.info(f"{self.address_string()} {fmt % args}")

    def do_GET(self):
        path = self.path.rstrip("/") or self.path
        handler_fn = ROUTES.get(path)
        if handler_fn:
            handler_fn(self)
        else:
            _err(self, "not found", 404)

    def do_POST(self):
        path = self.path.split("?")[0].rstrip("/")
        handler_fn = ROUTES.get(path)
        if handler_fn:
            handler_fn(self)
        else:
            _err(self, f"unknown route: {self.path}", 404)


class ThreadedHTTPServer(HTTPServer):
    """Handle each request in a separate thread."""
    def process_request(self, request, client_address):
        t = threading.Thread(target=self._handle, args=(request, client_address))
        t.daemon = True
        t.start()

    def _handle(self, request, client_address):
        self.finish_request(request, client_address)
        self.shutdown_request(request)


if __name__ == "__main__":
    server = ThreadedHTTPServer(("0.0.0.0", WEBHOOK_PORT), WebhookHandler)
    logger.info(f"Erel webhook receiver started on port {WEBHOOK_PORT}")
    logger.info(f"Endpoints: {', '.join(ROUTES.keys())}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down")
        server.shutdown()
