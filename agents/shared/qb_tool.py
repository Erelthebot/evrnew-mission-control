"""
QuickBooks Online tool for Erel agents.
Uses python-quickbooks SDK + intuit-oauth for authenticated access.
Reads/refreshes tokens from qb-tokens.json (shared with qb-auth.js).
All functions return plain dicts ready for LLM consumption.
"""

import json
import os
import time
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from intuitlib.client import AuthClient
from quickbooks import QuickBooks
from quickbooks.objects.bill import Bill
from quickbooks.objects.company_info import CompanyInfo
from quickbooks.objects.invoice import Invoice
from quickbooks.objects.payment import Payment

load_dotenv(os.path.expanduser("~/evrnew-marketing/.env"))

TOKEN_FILE    = os.environ.get("QB_TOKEN_FILE", os.path.expanduser("~/evrnew-marketing/scripts/quickbooks/qb-tokens.json"))
CLIENT_ID     = os.environ["QB_CLIENT_ID"]
CLIENT_SECRET = os.environ["QB_CLIENT_SECRET"]
REDIRECT_URI  = "https://erel.evrnew.com/api/qb-callback"
MINOR_VERSION = 65


# ── Token management ──────────────────────────────────────────────

def _load_tokens() -> Optional[dict]:
    if not os.path.exists(TOKEN_FILE):
        return None
    with open(TOKEN_FILE) as f:
        return json.load(f)


def _save_tokens(tokens: dict):
    tokens["saved_at"] = datetime.now(timezone.utc).isoformat()
    with open(TOKEN_FILE, "w") as f:
        json.dump(tokens, f, indent=2)


def _get_qb_client() -> QuickBooks:
    tokens = _load_tokens()
    if not tokens:
        raise RuntimeError("QuickBooks not connected. Run: node qb-auth.js connect")

    saved_at_str = tokens["saved_at"].replace("Z", "+00:00")
    try:
        saved_at = datetime.fromisoformat(saved_at_str).timestamp()
    except ValueError:
        saved_at = datetime.strptime(saved_at_str.split(".")[0], "%Y-%m-%dT%H:%M:%S").timestamp()

    expires_in = int(tokens.get("expires_in", 3600))

    auth_client = AuthClient(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
        environment="production",
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        realm_id=tokens["realm_id"],
    )

    if time.time() > saved_at + expires_in - 120:
        auth_client.refresh()
        tokens = {
            **tokens,
            "access_token": auth_client.access_token,
            "refresh_token": auth_client.refresh_token,
            "expires_in": 3600,
        }
        _save_tokens(tokens)

    return QuickBooks(
        auth_client=auth_client,
        refresh_token=auth_client.refresh_token,
        company_id=tokens["realm_id"],
        minorversion=MINOR_VERSION,
    )


# ── Accounting functions ──────────────────────────────────────────

def get_company_info() -> dict:
    qb = _get_qb_client()
    companies = CompanyInfo.all(qb=qb)
    if not companies:
        return {}
    c = companies[0]
    return {
        "name": getattr(c, "CompanyName", None),
        "industry": getattr(c, "IndustryType", None),
        "fiscal_year_start": getattr(c, "FiscalYearStartMonth", None),
        "country": getattr(c, "Country", None),
    }


def get_open_invoices() -> list[dict]:
    qb = _get_qb_client()
    invoices = Invoice.query(
        "SELECT * FROM Invoice WHERE Balance > '0' ORDER BY DueDate ASC MAXRESULTS 100",
        qb=qb,
    )
    now = time.time()
    result = []
    for inv in invoices:
        txn_date = getattr(inv, "TxnDate", None)
        days_old = int((now - datetime.fromisoformat(txn_date).timestamp()) / 86400) if txn_date else 0
        result.append({
            "id": inv.Id,
            "customer": getattr(inv.CustomerRef, "name", None) if inv.CustomerRef else None,
            "amount": getattr(inv, "TotalAmt", None),
            "balance": getattr(inv, "Balance", None),
            "due_date": getattr(inv, "DueDate", None),
            "invoice_date": txn_date,
            "days_old": days_old,
        })
    return result


def get_ar_aging() -> dict:
    invs = get_open_invoices()
    buckets: dict = {"current": [], "31-60": [], "61-90": [], "90+": []}
    for inv in invs:
        d = inv["days_old"]
        key = "current" if d <= 30 else "31-60" if d <= 60 else "61-90" if d <= 90 else "90+"
        buckets[key].append(inv)
    return {
        k: {"count": len(v), "total": round(sum(i["balance"] for i in v), 2), "invoices": v}
        for k, v in buckets.items()
    }


def get_unpaid_bills() -> list[dict]:
    qb = _get_qb_client()
    bills = Bill.query(
        "SELECT * FROM Bill WHERE Balance > '0' ORDER BY DueDate ASC MAXRESULTS 100",
        qb=qb,
    )
    now = time.time()
    result = []
    for b in bills:
        due_date = getattr(b, "DueDate", None)
        days_until_due = int((datetime.fromisoformat(due_date).timestamp() - now) / 86400) if due_date else 0
        result.append({
            "id": b.Id,
            "vendor": getattr(b.VendorRef, "name", None) if b.VendorRef else None,
            "amount": getattr(b, "TotalAmt", None),
            "balance": getattr(b, "Balance", None),
            "due_date": due_date,
            "days_until_due": days_until_due,
        })
    return result


def get_recent_payments(days: int = 30) -> list[dict]:
    qb = _get_qb_client()
    since = datetime.fromtimestamp(time.time() - days * 86400).strftime("%Y-%m-%d")
    payments = Payment.query(
        f"SELECT * FROM Payment WHERE TxnDate >= '{since}' ORDER BY TxnDate DESC MAXRESULTS 50",
        qb=qb,
    )
    return [{
        "id": p.Id,
        "customer": getattr(p.CustomerRef, "name", None) if p.CustomerRef else None,
        "amount": getattr(p, "TotalAmt", None),
        "date": getattr(p, "TxnDate", None),
        "method": getattr(p.PaymentMethodRef, "name", "Unknown") if p.PaymentMethodRef else "Unknown",
    } for p in payments]


def get_profit_and_loss(start_date: str, end_date: str) -> dict:
    qb = _get_qb_client()
    url = (f"{qb.api_url}/company/{qb.company_id}/reports/ProfitAndLoss"
           f"?start_date={start_date}&end_date={end_date}&minorversion={MINOR_VERSION}")
    return qb.make_request("GET", url)


def _find_report_group(rows: list, group: str) -> Optional[float]:
    """Recursively search QB report rows for a section by group name and return its summary total."""
    for row in rows:
        if not isinstance(row, dict):
            continue
        if row.get("group") == group:
            col_data = row.get("Summary", {}).get("ColData", [])
            if len(col_data) >= 2:
                try:
                    return float(col_data[1].get("value") or 0)
                except (ValueError, TypeError):
                    return None
        nested_rows = row.get("Rows", {}).get("Row", [])
        if nested_rows:
            result = _find_report_group(nested_rows, group)
            if result is not None:
                return result
    return None


def get_pl_mtd() -> dict:
    """Return P&L summary for current month-to-date (single API call).

    Returns revenue_mtd, expenses_mtd, net_income_mtd, period_start, period_end.
    """
    today = datetime.now()
    start = today.replace(day=1).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")
    report = get_profit_and_loss(start, end)
    rows = report.get("Rows", {}).get("Row", [])
    return {
        "revenue_mtd":    _find_report_group(rows, "Income"),
        "expenses_mtd":   _find_report_group(rows, "Expenses"),
        "net_income_mtd": _find_report_group(rows, "NetIncome"),
        "period_start":   start,
        "period_end":     end,
    }


def get_cash_on_hand() -> Optional[float]:
    """Return total bank account balance from QB Balance Sheet as of today."""
    qb = _get_qb_client()
    url = (f"{qb.api_url}/company/{qb.company_id}/reports/BalanceSheet"
           f"?date_macro=Today&minorversion={MINOR_VERSION}")
    report = qb.make_request("GET", url)
    rows = report.get("Rows", {}).get("Row", [])
    return _find_report_group(rows, "BankAccounts")


def get_cash_flow(start_date: str, end_date: str) -> dict:
    qb = _get_qb_client()
    url = (f"{qb.api_url}/company/{qb.company_id}/reports/CashFlow"
           f"?start_date={start_date}&end_date={end_date}&minorversion={MINOR_VERSION}")
    return qb.make_request("GET", url)


def get_daily_summary() -> dict:
    ar = get_ar_aging()
    bills = get_unpaid_bills()
    pmts = get_recent_payments(7)

    total_ar = sum(b["total"] for b in ar.values())
    total_ap = sum(b["balance"] for b in bills)
    weekly_recv = sum(p["amount"] for p in pmts)
    due_soon = [b for b in bills if 0 <= b["days_until_due"] <= 7]
    overdue_ar = ar["90+"]["total"]

    alerts = []
    for b in due_soon:
        alerts.append(f"Bill due in {b['days_until_due']}d: {b['vendor']} ${b['balance']:.0f}")
    if overdue_ar > 0:
        alerts.append(f"AR 90+ days overdue: ${overdue_ar:.0f}")
    if ar["61-90"]["total"] > 0:
        alerts.append(f"AR 61-90 days: ${ar['61-90']['total']:.0f}")

    return {
        "total_receivable": round(total_ar, 2),
        "total_payable": round(total_ap, 2),
        "weekly_payments_received": round(weekly_recv, 2),
        "bills_due_soon": len(due_soon),
        "ar_aging": {k: {"count": v["count"], "total": v["total"]} for k, v in ar.items()},
        "alerts": alerts,
    }


def get_customers(active_only: bool = True) -> list[dict]:
    from quickbooks.objects.customer import Customer
    qb = _get_qb_client()
    customers = Customer.filter(Active=True, qb=qb) if active_only else Customer.all(qb=qb)
    return [{
        "id": c.Id,
        "name": getattr(c, "DisplayName", None) or getattr(c, "CompanyName", None),
        "email": getattr(c.PrimaryEmailAddr, "Address", None) if getattr(c, "PrimaryEmailAddr", None) else None,
        "phone": getattr(c.PrimaryPhone, "FreeFormNumber", None) if getattr(c, "PrimaryPhone", None) else None,
        "balance": getattr(c, "Balance", 0),
    } for c in customers]


def get_items(active_only: bool = True) -> list[dict]:
    from quickbooks.objects.item import Item
    qb = _get_qb_client()
    items = Item.filter(Active=True, qb=qb) if active_only else Item.all(qb=qb)
    return [{
        "id": i.Id,
        "name": getattr(i, "Name", None),
        "description": getattr(i, "Description", None),
        "unit_price": getattr(i, "UnitPrice", None),
        "type": getattr(i, "Type", None),
    } for i in items]


def find_or_create_customer(name: str, email: str = None, phone: str = None) -> dict:
    """Find QB customer by display name, or create one. Returns {id, name, created}."""
    from quickbooks.objects.customer import Customer
    from quickbooks.objects.base import EmailAddress, PhoneNumber
    qb = _get_qb_client()
    safe_name = name.replace("'", "\\'")
    matches = Customer.query(
        f"SELECT * FROM Customer WHERE DisplayName = '{safe_name}' MAXRESULTS 1",
        qb=qb,
    )
    if matches:
        c = matches[0]
        return {"id": c.Id, "name": getattr(c, "DisplayName", name), "created": False}

    c = Customer()
    c.DisplayName = name
    if email:
        addr = EmailAddress()
        addr.Address = email
        c.PrimaryEmailAddr = addr
    if phone:
        ph = PhoneNumber()
        ph.FreeFormNumber = phone
        c.PrimaryPhone = ph
    saved = c.save(qb=qb)
    return {"id": saved.Id, "name": name, "created": True}


def create_invoice(
    customer_id: str,
    line_items: list[dict],
    due_date: str = None,
    memo: str = None,
) -> dict:
    """
    Create a QB invoice.
    line_items: [{"description": str, "amount": float, "qty": int, "unit_price": float, "item_id": str}]
    Returns {id, doc_number, total, due_date, status}.
    """
    from quickbooks.objects.invoice import Invoice
    from quickbooks.objects.detailline import SalesItemLine, SalesItemLineDetail
    from quickbooks.objects.base import Ref, CustomerMemo
    qb = _get_qb_client()

    invoice = Invoice()
    customer_ref = Ref()
    customer_ref.value = str(customer_id)
    invoice.CustomerRef = customer_ref

    if due_date:
        invoice.DueDate = due_date
    if memo:
        memo_obj = CustomerMemo()
        memo_obj.value = memo
        invoice.CustomerMemo = memo_obj

    for i, item in enumerate(line_items, 1):
        line = SalesItemLine()
        line.LineNum = i
        line.Amount = float(item["amount"])
        line.Description = item.get("description", "")
        detail = SalesItemLineDetail()
        detail.UnitPrice = float(item.get("unit_price", item["amount"]))
        detail.Qty = int(item.get("qty", 1))
        if item.get("item_id"):
            item_ref = Ref()
            item_ref.value = str(item["item_id"])
            detail.ItemRef = item_ref
        line.SalesItemLineDetail = detail
        invoice.Line.append(line)

    saved = invoice.save(qb=qb)
    return {
        "id": saved.Id,
        "doc_number": getattr(saved, "DocNumber", None),
        "total": getattr(saved, "TotalAmt", None),
        "due_date": getattr(saved, "DueDate", due_date),
        "status": "created",
    }


def is_connected() -> bool:
    return os.path.exists(TOKEN_FILE)


# ── CLI ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "summary"
    try:
        if cmd == "status":
            t = _load_tokens()
            if t:
                print(f"Connected — Realm: {t['realm_id']}  Saved: {t['saved_at']}")
            else:
                print("Not connected. Run: node qb-auth.js connect")
        elif cmd == "summary":
            s = get_daily_summary()
            print(f"AR: ${s['total_receivable']:,.2f}  AP: ${s['total_payable']:,.2f}  "
                  f"7-day recv: ${s['weekly_payments_received']:,.2f}")
            for a in s["alerts"]:
                print(f"  {a}")
        elif cmd == "ar":
            for bucket, data in get_ar_aging().items():
                if data["total"] > 0:
                    print(f"{bucket}: {data['count']} invoices  ${data['total']:,.2f}")
        elif cmd == "ap":
            for b in get_unpaid_bills():
                flag = " ⚠️ SOON" if 0 <= b["days_until_due"] <= 7 else " 🚨 OVERDUE" if b["days_until_due"] < 0 else ""
                print(f"{b['vendor']}: ${b['balance']:.2f} due {b['due_date']}{flag}")
        elif cmd == "pl":
            pl = get_pl_mtd()
            print(f"P&L MTD ({pl['period_start']} → {pl['period_end']})")
            print(f"  Revenue:    ${pl['revenue_mtd']:,.2f}" if pl['revenue_mtd'] is not None else "  Revenue:    n/a")
            print(f"  Expenses:   ${pl['expenses_mtd']:,.2f}" if pl['expenses_mtd'] is not None else "  Expenses:   n/a")
            print(f"  Net Income: ${pl['net_income_mtd']:,.2f}" if pl['net_income_mtd'] is not None else "  Net Income: n/a")
        elif cmd == "cash":
            cash = get_cash_on_hand()
            print(f"Cash on Hand: ${cash:,.2f}" if cash is not None else "Cash on Hand: n/a")
        elif cmd == "test":
            info = get_company_info()
            print(f"Connected to: {info['name']}  ({info['industry']})")
        else:
            print("Usage: python qb_tool.py [status|summary|ar|ap|pl|cash|test]")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
