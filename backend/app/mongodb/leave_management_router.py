"""
Leave Management Router — Employee-facing leave workspace
Collections: Leave_requests (existing), Leave_balances (new), Leave_policies (new)
Auto-sync: recalculates balances from approved Leave_requests every 30s
"""
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.mongodb.connection import webx_db

router = APIRouter(prefix="/api/mongo/leave", tags=["Leave Management"])

# ── Collection accessors ─────────────────────────────────────────────────────
def _leave_requests():  return webx_db()["Leave_requests"]
def _leave_balances():  return webx_db()["Leave_balances"]
def _leave_policies():  return webx_db()["Leave_policies"]
def _users():           return webx_db()["users"]


# ── Serialiser ───────────────────────────────────────────────────────────────
def _s(doc: dict) -> dict:
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    for f in ["created_at", "updated_at", "reviewed_at"]:
        if isinstance(doc.get(f), datetime):
            doc[f] = doc[f].isoformat()
    return doc


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid id: {id_str}")


# ── Pydantic Schemas ─────────────────────────────────────────────────────────
class LeaveApplyRequest(BaseModel):
    employee_name: str
    leave_type: str       # "Casual Leave" | "Sick Leave" | "Earned Leave"
    start_date: str       # ISO: "2025-05-10"
    end_date: str         # ISO: "2025-05-12"
    days: int
    reason: str


# ── Static Config ────────────────────────────────────────────────────────────
_LEAVE_TYPES_CONFIG = {
    "Casual Leave": {"total": 12, "color": "#0891b2"},
    "Sick Leave":   {"total": 12, "color": "#dc2626"},
    "Earned Leave": {"total": 15, "color": "#059669"},
}

_POLICY_SEED = [
    {
        "leave_type": "Casual Leave",
        "total_days": 12,
        "carry_forward": False,
        "max_carry_forward": 0,
        "eligibility": "All confirmed employees",
        "notice_required_days": 1,
        "can_take_consecutive": True,
        "color": "#0891b2",
        "description": "For personal or family needs. Requires 1-day prior notice. Cannot be combined with other leave types without manager approval.",
        "approval_flow": ["Employee submits", "Manager reviews within 24h", "HR records approved leave"],
    },
    {
        "leave_type": "Sick Leave",
        "total_days": 12,
        "carry_forward": False,
        "max_carry_forward": 0,
        "eligibility": "All employees from day one",
        "notice_required_days": 0,
        "can_take_consecutive": True,
        "color": "#dc2626",
        "description": "For medical illness or injury. Medical certificate required for 3+ consecutive days. Can be applied retrospectively within 2 working days.",
        "approval_flow": ["Employee submits (same day allowed)", "Manager reviews", "HR records"],
    },
    {
        "leave_type": "Earned Leave",
        "total_days": 15,
        "carry_forward": True,
        "max_carry_forward": 15,
        "eligibility": "Employees with 6+ months of service",
        "notice_required_days": 7,
        "can_take_consecutive": True,
        "color": "#059669",
        "description": "Accrued leave for planned vacations. Requires 7-day advance notice. Unused balance carries forward up to 15 days into the next year.",
        "approval_flow": ["Employee submits (7 days ahead)", "Manager reviews", "HR approval", "Leave recorded"],
    },
]

_LEAVE_SEED = [
    {"name": "Arjun Verma",  "avatar": "AV", "type": "Sick Leave",   "startDate": "Apr 15, 2025", "endDate": "Apr 17, 2025", "days": 3, "reason": "Fever and flu recovery.",              "status": "pending",  "appliedDate": "Apr 13, 2025", "comment": None, "start_date_iso": "2025-04-15", "end_date_iso": "2025-04-17"},
    {"name": "Karan Patel",  "avatar": "KP", "type": "Casual Leave", "startDate": "Apr 18, 2025", "endDate": "Apr 18, 2025", "days": 1, "reason": "Family function.",                     "status": "approved", "appliedDate": "Apr 12, 2025", "comment": "Approved. Enjoy!", "start_date_iso": "2025-04-18", "end_date_iso": "2025-04-18"},
    {"name": "Simran Kaur",  "avatar": "SK", "type": "Earned Leave",  "startDate": "Apr 22, 2025", "endDate": "Apr 26, 2025", "days": 5, "reason": "Annual vacation trip.",                "status": "pending",  "appliedDate": "Apr 11, 2025", "comment": None, "start_date_iso": "2025-04-22", "end_date_iso": "2025-04-26"},
    {"name": "Raju Sharma",  "avatar": "RS", "type": "Sick Leave",   "startDate": "Apr 05, 2025", "endDate": "Apr 06, 2025", "days": 2, "reason": "Migraine — doctor visit.",              "status": "rejected", "appliedDate": "Apr 04, 2025", "comment": "Critical deadline week. Please reschedule.", "start_date_iso": "2025-04-05", "end_date_iso": "2025-04-06"},
    {"name": "Neha Singh",   "avatar": "NS", "type": "Casual Leave", "startDate": "Apr 28, 2025", "endDate": "Apr 28, 2025", "days": 1, "reason": "Personal errand.",                     "status": "pending",  "appliedDate": "Apr 13, 2025", "comment": None, "start_date_iso": "2025-04-28", "end_date_iso": "2025-04-28"},
    {"name": "Priya Mehta",  "avatar": "PM", "type": "Earned Leave",  "startDate": "May 05, 2025", "endDate": "May 09, 2025", "days": 5, "reason": "Pre-planned international trip.",      "status": "approved", "appliedDate": "Apr 20, 2025", "comment": "Approved — all targets met ahead of schedule.", "start_date_iso": "2025-05-05", "end_date_iso": "2025-05-09"},
    {"name": "Raju Sharma",  "avatar": "RS", "type": "Casual Leave", "startDate": "May 02, 2025", "endDate": "May 02, 2025", "days": 1, "reason": "Attending sibling's wedding.",          "status": "pending",  "appliedDate": "Apr 22, 2025", "comment": None, "start_date_iso": "2025-05-02", "end_date_iso": "2025-05-02"},
    {"name": "Arjun Verma",  "avatar": "AV", "type": "Casual Leave", "startDate": "May 12, 2025", "endDate": "May 12, 2025", "days": 1, "reason": "Bank-related personal work.",           "status": "pending",  "appliedDate": "Apr 23, 2025", "comment": None, "start_date_iso": "2025-05-12", "end_date_iso": "2025-05-12"},
    {"name": "Simran Kaur",  "avatar": "SK", "type": "Sick Leave",   "startDate": "Apr 29, 2025", "endDate": "Apr 30, 2025", "days": 2, "reason": "Severe cold and sore throat.",          "status": "approved", "appliedDate": "Apr 28, 2025", "comment": "Get well soon!", "start_date_iso": "2025-04-29", "end_date_iso": "2025-04-30"},
    {"name": "Neha Singh",   "avatar": "NS", "type": "Earned Leave",  "startDate": "May 19, 2025", "endDate": "May 23, 2025", "days": 5, "reason": "Annual family vacation.",               "status": "pending",  "appliedDate": "Apr 25, 2025", "comment": None, "start_date_iso": "2025-05-19", "end_date_iso": "2025-05-23"},
]


# ════════════════════════════════════════════════════════════════════════════
# LEAVE BALANCE  —  /api/mongo/leave/balance
# ════════════════════════════════════════════════════════════════════════════

@router.get("/balance", response_model=Dict[str, Any])
async def get_leave_balance(employee_name: str = Query(...)):
    """Get leave balance for a specific employee. Auto-creates if missing."""
    col = _leave_balances()
    doc = await col.find_one({"employee_name": employee_name})
    if not doc:
        doc = await _create_or_sync_balance(employee_name)
    return _s(doc)


@router.get("/balance-all", response_model=List[Dict[str, Any]])
async def get_all_balances():
    """List all employee leave balances. Seeds from users collection if empty."""
    col = _leave_balances()
    if await col.count_documents({}) == 0:
        await _seed_balances_from_users()
    docs = await col.find({}).sort("employee_name", 1).to_list(length=500)
    return [_s(d) for d in docs]


# ════════════════════════════════════════════════════════════════════════════
# APPLY LEAVE  —  POST /api/mongo/leave/apply
# ════════════════════════════════════════════════════════════════════════════

@router.post("/apply", response_model=Dict[str, Any], status_code=201)
async def apply_leave(body: LeaveApplyRequest):
    """Employee applies for leave. Validates balance, checks conflicts, saves to Leave_requests."""
    lr_col = _leave_requests()

    # Ensure seed data exists in Leave_requests if empty
    if await lr_col.count_documents({}) == 0:
        now = datetime.utcnow()
        docs_to_insert = [{**r, "created_at": now, "updated_at": now} for r in _LEAVE_SEED]
        await lr_col.insert_many(docs_to_insert)
        await lr_col.create_index([("name", 1)])
        await lr_col.create_index([("created_at", -1)])

    # Conflict check
    conflicts = await _check_conflicts(body.employee_name, body.start_date, body.end_date)
    if conflicts:
        raise HTTPException(
            status_code=409,
            detail=f"Overlapping leave request exists: {conflicts[0]['startDate']} – {conflicts[0]['endDate']}",
        )

    # Balance check
    bal_doc = await _leave_balances().find_one({"employee_name": body.employee_name})
    if not bal_doc:
        bal_doc = await _create_or_sync_balance(body.employee_name)

    remaining = _get_remaining(bal_doc, body.leave_type)
    if body.days > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient {body.leave_type} balance. Remaining: {remaining} day(s), Requested: {body.days} day(s).",
        )

    # Format display dates
    try:
        start_dt = datetime.strptime(body.start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(body.end_date, "%Y-%m-%d")
        start_display = start_dt.strftime("%b %d, %Y")
        end_display = end_dt.strftime("%b %d, %Y")
    except Exception:
        start_display = body.start_date
        end_display = body.end_date

    avatar = "".join(w[0] for w in body.employee_name.split()[:2]).upper()
    applied_display = datetime.utcnow().strftime("%b %d, %Y")

    doc = {
        "name": body.employee_name,
        "avatar": avatar,
        "type": body.leave_type,
        "startDate": start_display,
        "endDate": end_display,
        "start_date_iso": body.start_date,
        "end_date_iso": body.end_date,
        "days": body.days,
        "reason": body.reason,
        "status": "pending",
        "appliedDate": applied_display,
        "comment": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await lr_col.insert_one(doc)
    inserted = await lr_col.find_one({"_id": result.inserted_id})
    return _s(inserted)


# ════════════════════════════════════════════════════════════════════════════
# MY REQUESTS  —  GET /api/mongo/leave/my-requests
# ════════════════════════════════════════════════════════════════════════════

@router.get("/my-requests", response_model=List[Dict[str, Any]])
async def get_my_leave_requests(
    employee_name: str = Query(...),
    status: Optional[str] = Query(None),
):
    """Get all leave requests for a specific employee."""
    lr_col = _leave_requests()

    # Auto-seed if empty
    if await lr_col.count_documents({}) == 0:
        now = datetime.utcnow()
        docs_to_insert = [{**r, "created_at": now, "updated_at": now} for r in _LEAVE_SEED]
        await lr_col.insert_many(docs_to_insert)
        await lr_col.create_index([("name", 1)])
        await lr_col.create_index([("created_at", -1)])

    query: Dict[str, Any] = {"name": employee_name}
    if status and status != "all":
        query["status"] = status

    docs = await lr_col.find(query).sort("created_at", -1).to_list(length=200)
    return [_s(d) for d in docs]


# ════════════════════════════════════════════════════════════════════════════
# CALENDAR  —  GET /api/mongo/leave/calendar
# ════════════════════════════════════════════════════════════════════════════

@router.get("/calendar", response_model=List[Dict[str, Any]])
async def get_leave_calendar(employee_name: str = Query(...)):
    """All pending + approved leaves for calendar view."""
    lr_col = _leave_requests()
    if await lr_col.count_documents({}) == 0:
        now = datetime.utcnow()
        docs_to_insert = [{**r, "created_at": now, "updated_at": now} for r in _LEAVE_SEED]
        await lr_col.insert_many(docs_to_insert)

    docs = await lr_col.find({
        "name": employee_name,
        "status": {"$in": ["approved", "pending"]},
    }).sort("created_at", -1).to_list(length=100)
    return [_s(d) for d in docs]


# ════════════════════════════════════════════════════════════════════════════
# CONFLICT CHECK  —  GET /api/mongo/leave/conflicts
# ════════════════════════════════════════════════════════════════════════════

@router.get("/conflicts", response_model=List[Dict[str, Any]])
async def check_conflicts_endpoint(
    employee_name: str = Query(...),
    start_date: str = Query(...),
    end_date: str = Query(...),
):
    """Returns any conflicting leaves for the given date range."""
    return await _check_conflicts(employee_name, start_date, end_date)


# ════════════════════════════════════════════════════════════════════════════
# POLICIES  —  GET /api/mongo/leave/policies
# ════════════════════════════════════════════════════════════════════════════

@router.get("/policies", response_model=List[Dict[str, Any]])
async def get_leave_policies():
    """Return all leave policies. Auto-seeds if empty."""
    col = _leave_policies()
    if await col.count_documents({}) == 0:
        now = datetime.utcnow()
        docs = [{**p, "created_at": now, "updated_at": now} for p in _POLICY_SEED]
        await col.insert_many(docs)
        await col.create_index("leave_type", unique=True)
    docs = await col.find({}).to_list(length=50)
    return [_s(d) for d in docs]


# ════════════════════════════════════════════════════════════════════════════
# TRENDS  —  GET /api/mongo/leave/trends
# ════════════════════════════════════════════════════════════════════════════

@router.get("/trends", response_model=Dict[str, Any])
async def get_leave_trends(employee_name: str = Query(...)):
    """Monthly usage trends + per-type breakdown for the current year."""
    lr_col = _leave_requests()
    docs = await lr_col.find({"name": employee_name, "status": "approved"}).to_list(length=500)

    current_year = str(datetime.utcnow().year)
    months: Dict[str, int] = {f"{m:02d}": 0 for m in range(1, 13)}
    by_type: Dict[str, int] = {"Casual Leave": 0, "Sick Leave": 0, "Earned Leave": 0}

    for doc in docs:
        iso = doc.get("start_date_iso")
        if not iso:
            try:
                dt = datetime.strptime(doc.get("startDate", ""), "%b %d, %Y")
                iso = dt.strftime("%Y-%m-%d")
            except Exception:
                continue

        if not iso.startswith(current_year):
            continue

        month = iso[5:7]
        days = doc.get("days", 0)
        months[month] = months.get(month, 0) + days
        lt = doc.get("type", "")
        if lt in by_type:
            by_type[lt] += days

    month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return {
        "monthly": [{"month": month_labels[i], "days": months[f"{i+1:02d}"]} for i in range(12)],
        "by_type": [{"type": t, "days": d} for t, d in by_type.items()],
        "total_used_this_year": sum(months.values()),
    }


# ════════════════════════════════════════════════════════════════════════════
# SEED BALANCES  —  POST /api/mongo/leave/seed-balances
# ════════════════════════════════════════════════════════════════════════════

@router.post("/seed-balances", status_code=201)
async def seed_leave_balances():
    """Seed Leave_balances from users collection. Idempotent."""
    count = await _seed_balances_from_users()
    return {"message": f"Seeded {count} balance records", "total": await _leave_balances().count_documents({})}


# ════════════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ════════════════════════════════════════════════════════════════════════════

def _get_remaining(bal_doc: dict, leave_type: str) -> int:
    field_map = {
        "Casual Leave": ("casual_used", "casual_total"),
        "Sick Leave":   ("sick_used",   "sick_total"),
        "Earned Leave": ("earned_used", "earned_total"),
    }
    used_key, total_key = field_map.get(leave_type, ("casual_used", "casual_total"))
    total = bal_doc.get(total_key, _LEAVE_TYPES_CONFIG.get(leave_type, {}).get("total", 12))
    used = bal_doc.get(used_key, 0)
    return max(0, total - used)


async def _check_conflicts(employee_name: str, start_date: str, end_date: str) -> List[Dict]:
    lr_col = _leave_requests()
    existing = await lr_col.find({
        "name": employee_name,
        "status": {"$in": ["pending", "approved"]},
        "start_date_iso": {"$exists": True},
    }).to_list(length=100)

    conflicts = []
    try:
        req_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        req_end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except Exception:
        return []

    for doc in existing:
        try:
            ex_start = datetime.strptime(doc["start_date_iso"], "%Y-%m-%d").date()
            ex_end = datetime.strptime(doc["end_date_iso"], "%Y-%m-%d").date()
            if ex_start <= req_end and ex_end >= req_start:
                conflicts.append(_s(doc))
        except Exception:
            continue

    return conflicts


async def _create_or_sync_balance(employee_name: str) -> dict:
    """Recalculate and upsert leave balance from approved Leave_requests."""
    col = _leave_balances()
    lr_col = _leave_requests()

    approved = await lr_col.find({"name": employee_name, "status": "approved"}).to_list(length=500)
    casual_used = sum(d.get("days", 0) for d in approved if d.get("type") == "Casual Leave")
    sick_used   = sum(d.get("days", 0) for d in approved if d.get("type") == "Sick Leave")
    earned_used = sum(d.get("days", 0) for d in approved if d.get("type") == "Earned Leave")

    doc = {
        "employee_name": employee_name,
        "casual_total": 12,
        "casual_used": casual_used,
        "sick_total": 12,
        "sick_used": sick_used,
        "earned_total": 15,
        "earned_used": earned_used,
        "year": datetime.utcnow().year,
        "updated_at": datetime.utcnow(),
    }

    result = await col.find_one_and_update(
        {"employee_name": employee_name},
        {"$set": doc},
        upsert=True,
        return_document=True,
    )
    return result


async def _seed_balances_from_users() -> int:
    users_col = _users()
    bal_col = _leave_balances()

    users = await users_col.find({"role": "employee"}).to_list(length=500)
    inserted = 0
    for user in users:
        name = user.get("full_name", "")
        if not name:
            continue
        existing = await bal_col.find_one({"employee_name": name})
        if not existing:
            await _create_or_sync_balance(name)
            inserted += 1

    # Also seed from Leave_requests names
    lr_col = _leave_requests()
    lr_docs = await lr_col.distinct("name")
    for name in lr_docs:
        if not name:
            continue
        existing = await bal_col.find_one({"employee_name": name})
        if not existing:
            await _create_or_sync_balance(name)
            inserted += 1

    return inserted


# ════════════════════════════════════════════════════════════════════════════
# AUTO-SYNC  — recalculates all balances every 30s
# ════════════════════════════════════════════════════════════════════════════

_sync_task: Optional[asyncio.Task] = None


async def _run_sync_loop() -> None:
    while True:
        try:
            bal_col = _leave_balances()
            docs = await bal_col.find({}).to_list(length=500)
            for doc in docs:
                name = doc.get("employee_name")
                if name:
                    await _create_or_sync_balance(name)
        except Exception:
            pass
        await asyncio.sleep(30)


def start_auto_sync() -> None:
    global _sync_task
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            _sync_task = loop.create_task(_run_sync_loop())
    except Exception:
        pass
