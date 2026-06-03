"""
QuickBooks CrewAI tool wrappers.
Import into any agent that needs QB access:
    from shared.qb_crewai_tools import QB_TOOLS
"""
from __future__ import annotations

import json
from crewai.tools import tool


@tool("QB: Get AR Aging")
def qb_get_ar_aging() -> str:
    """Get accounts receivable aging buckets (current, 31-60, 61-90, 90+ days) from QuickBooks."""
    from shared.qb_tool import get_ar_aging
    return json.dumps(get_ar_aging())


@tool("QB: Get Daily Summary")
def qb_get_daily_summary() -> str:
    """Get QuickBooks daily financial summary: total AR, total AP, 7-day payments received, alerts."""
    from shared.qb_tool import get_daily_summary
    return json.dumps(get_daily_summary())


@tool("QB: Get Open Invoices")
def qb_get_open_invoices() -> str:
    """Get all open (unpaid) QuickBooks invoices sorted by due date."""
    from shared.qb_tool import get_open_invoices
    return json.dumps(get_open_invoices())


@tool("QB: Get Unpaid Bills")
def qb_get_unpaid_bills() -> str:
    """Get all unpaid QuickBooks bills (accounts payable) sorted by due date."""
    from shared.qb_tool import get_unpaid_bills
    return json.dumps(get_unpaid_bills())


@tool("QB: Get Recent Payments")
def qb_get_recent_payments() -> str:
    """Get payments received in the last 30 days from QuickBooks."""
    from shared.qb_tool import get_recent_payments
    return json.dumps(get_recent_payments(30))


@tool("QB: Get Customers")
def qb_get_customers() -> str:
    """Get all active QuickBooks customers with id, name, email, phone, and balance."""
    from shared.qb_tool import get_customers
    return json.dumps(get_customers())


@tool("QB: Get Items / Services")
def qb_get_items() -> str:
    """Get QuickBooks product/service items list with id, name, description, and unit price."""
    from shared.qb_tool import get_items
    return json.dumps(get_items())


@tool("QB: Find or Create Customer")
def qb_find_or_create_customer(name: str, email: str = "", phone: str = "") -> str:
    """Find a QuickBooks customer by display name, or create one if not found. Returns {id, name, created}."""
    from shared.qb_tool import find_or_create_customer
    result = find_or_create_customer(name, email or None, phone or None)
    return json.dumps(result)


@tool("QB: Create Invoice")
def qb_create_invoice(customer_id: str, line_items_json: str, due_date: str = "", memo: str = "") -> str:
    """
    Create a QuickBooks invoice.
    customer_id: QB customer ID string.
    line_items_json: JSON array of {description, amount, qty (optional), unit_price (optional), item_id (optional)}.
    due_date: YYYY-MM-DD format (optional).
    memo: customer-visible memo (optional).
    Returns {id, doc_number, total, due_date, status}.
    """
    from shared.qb_tool import create_invoice
    line_items = json.loads(line_items_json)
    result = create_invoice(
        customer_id=customer_id,
        line_items=line_items,
        due_date=due_date or None,
        memo=memo or None,
    )
    return json.dumps(result)


@tool("QB: Get Company Info")
def qb_get_company_info() -> str:
    """Get QuickBooks company name, industry, fiscal year start, and country."""
    from shared.qb_tool import get_company_info
    return json.dumps(get_company_info())


# Convenience list for agent tool registration
QB_TOOLS = [
    qb_get_ar_aging,
    qb_get_daily_summary,
    qb_get_open_invoices,
    qb_get_unpaid_bills,
    qb_get_recent_payments,
    qb_get_customers,
    qb_get_items,
    qb_find_or_create_customer,
    qb_create_invoice,
    qb_get_company_info,
]
