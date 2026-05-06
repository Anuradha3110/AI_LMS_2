"""
Admin Audit Logs Workspace — MongoDB Router.
Enterprise-grade audit logging with real-time auto-sync.
New Collections: admin_audit_logs, admin_security_alerts
"""
import asyncio
import csv
import io
import random
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.mongodb.connection import webx_db

router = APIRouter(prefix="/api/mongo/audit-logs", tags=["Audit Logs Workspace"])

# ── Collection accessors ────────────────────────────────────────────

def _logs_col():
    return webx_db()["admin_audit_logs"]

def _alerts_col():
    return webx_db()["admin_security_alerts"]

def _users_col():
    return webx_db()["users"]

# ── Seed data templates ─────────────────────────────────────────────

_USERS = [
    {"id": "u1", "email": "admin@demo.com",    "name": "Alex Chen",      "role": "admin",           "avatar": "AC"},
    {"id": "u2", "email": "manager@demo.com",  "name": "Sarah Miller",   "role": "manager",         "avatar": "SM"},
    {"id": "u3", "email": "employee@demo.com", "name": "James Wilson",   "role": "employee",        "avatar": "JW"},
    {"id": "u4", "email": "hr@demo.com",       "name": "Priya Sharma",   "role": "hr-admin",        "avatar": "PS"},
    {"id": "u5", "email": "content@demo.com",  "name": "David Kim",      "role": "content-creator", "avatar": "DK"},
    {"id": "u6", "email": "viewer@demo.com",   "name": "Emma Davis",     "role": "viewer",          "avatar": "ED"},
    {"id": "u7", "email": "senior@demo.com",   "name": "Michael Brown",  "role": "senior-employee", "avatar": "MB"},
    {"id": "u8", "email": "newuser@demo.com",  "name": "Lisa Zhang",     "role": "employee",        "avatar": "LZ"},
]

_ACTIONS = [
    {"action": "login",            "category": "auth",     "page": "Login",          "module": "auth",           "severity": "info"},
    {"action": "logout",           "category": "auth",     "page": "Dashboard",      "module": "auth",           "severity": "info"},
    {"action": "failed_login",     "category": "auth",     "page": "Login",          "module": "auth",           "severity": "warning"},
    {"action": "view_course",      "category": "learning", "page": "Courses",        "module": "courses",        "severity": "info"},
    {"action": "start_course",     "category": "learning", "page": "Courses",        "module": "courses",        "severity": "info"},
    {"action": "complete_course",  "category": "learning", "page": "Courses",        "module": "courses",        "severity": "info"},
    {"action": "create_course",    "category": "content",  "page": "AI Studio",      "module": "ai_studio",      "severity": "info"},
    {"action": "edit_course",      "category": "content",  "page": "Courses",        "module": "courses",        "severity": "info"},
    {"action": "delete_course",    "category": "content",  "page": "Courses",        "module": "courses",        "severity": "warning"},
    {"action": "take_assessment",  "category": "learning", "page": "Assessments",    "module": "assessments",    "severity": "info"},
    {"action": "submit_assessment","category": "learning", "page": "Assessments",    "module": "assessments",    "severity": "info"},
    {"action": "view_dashboard",   "category": "admin",    "page": "Dashboard",      "module": "dashboard",      "severity": "info"},
    {"action": "export_data",      "category": "admin",    "page": "Analytics",      "module": "analytics",      "severity": "warning"},
    {"action": "update_user",      "category": "admin",    "page": "Users",          "module": "users",          "severity": "info"},
    {"action": "create_user",      "category": "admin",    "page": "Users",          "module": "users",          "severity": "info"},
    {"action": "delete_user",      "category": "admin",    "page": "Users",          "module": "users",          "severity": "critical"},
    {"action": "change_role",      "category": "security", "page": "Access Control", "module": "access_control", "severity": "warning"},
    {"action": "view_audit_log",   "category": "security", "page": "Audit Logs",     "module": "audit",          "severity": "info"},
    {"action": "update_settings",  "category": "admin",    "page": "Settings",       "module": "settings",       "severity": "info"},
    {"action": "view_analytics",   "category": "admin",    "page": "Analytics",      "module": "analytics",      "severity": "info"},
    {"action": "upload_content",   "category": "content",  "page": "Knowledge Base", "module": "knowledge",      "severity": "info"},
    {"action": "ai_generate",      "category": "content",  "page": "AI Studio",      "module": "ai_studio",      "severity": "info"},
    {"action": "password_change",  "category": "security", "page": "Settings",       "module": "auth",           "severity": "warning"},
    {"action": "api_access",       "category": "security", "page": "Integrations",   "module": "integrations",   "severity": "info"},
    {"action": "bulk_import",      "category": "admin",    "page": "Users",          "module": "users",          "severity": "warning"},
]

_ENTITIES = [
    {"type": "course",     "name": "Python for Data Science"},
    {"type": "course",     "name": "Leadership Fundamentals"},
    {"type": "course",     "name": "Advanced React Development"},
    {"type": "course",     "name": "Cloud Computing Essentials"},
    {"type": "assessment", "name": "Q4 Compliance Quiz"},
    {"type": "assessment", "name": "Technical Skills Evaluation"},
    {"type": "user",       "name": "New Employee Onboarding"},
    {"type": "report",     "name": "Monthly Analytics Report"},
    {"type": "knowledge",  "name": "HR Policy Document"},
    {"type": "ai_content", "name": "Sales Training Module"},
]

_BROWSERS     = ["Chrome 120", "Firefox 121", "Safari 17", "Edge 120", "Chrome 119"]
_OS_LIST      = ["Windows 11", "macOS 14", "Ubuntu 22.04", "iOS 17", "Android 14"]
_DEVICE_TYPES = ["desktop", "desktop", "desktop", "mobile", "tablet"]
_IPS          = ["192.168.1.10", "10.0.0.5", "172.16.0.12", "192.168.0.25", "10.0.1.100"]

_DEFAULT_ALERTS = [
    {
        "alert_id": "audit-sec-001",
        "type": "brute_force",
        "severity": "critical",
        "title": "Brute Force Attack Detected",
        "description": "5 failed login attempts from IP 203.0.113.42 in the last 10 minutes.",
        "user_email": "admin@demo.com",
        "ip_address": "203.0.113.42",
        "recommended_action": "Block IP address and enforce 2FA for the affected account immediately.",
        "status": "active",
    },
    {
        "alert_id": "audit-sec-002",
        "type": "suspicious_login",
        "severity": "high",
        "title": "Login from Unusual Location",
        "description": "manager@demo.com logged in from a new country (Singapore). Previous location: USA.",
        "user_email": "manager@demo.com",
        "ip_address": "103.24.65.18",
        "recommended_action": "Verify with the user and review all recent activity in this session.",
        "status": "active",
    },
    {
        "alert_id": "audit-sec-003",
        "type": "data_export",
        "severity": "high",
        "title": "Large Data Export Triggered",
        "description": "hr@demo.com exported 1,200+ user records within the last hour.",
        "user_email": "hr@demo.com",
        "ip_address": "192.168.1.10",
        "recommended_action": "Verify authorization for this export and review data handling policy compliance.",
        "status": "active",
    },
    {
        "alert_id": "audit-sec-004",
        "type": "privilege_escalation",
        "severity": "high",
        "title": "Unauthorized Admin Access Attempt",
        "description": "employee@demo.com attempted to access the admin panel — returned 403 Forbidden.",
        "user_email": "employee@demo.com",
        "ip_address": "10.0.0.5",
        "recommended_action": "Review user permissions and investigate the access attempt intent.",
        "status": "active",
    },
    {
        "alert_id": "audit-sec-005",
        "type": "multiple_sessions",
        "severity": "medium",
        "title": "Concurrent Session Anomaly",
        "description": "content@demo.com has 4 active sessions simultaneously from different devices.",
        "user_email": "content@demo.com",
        "ip_address": "multiple",
        "recommended_action": "Force logout all sessions and require re-authentication.",
        "status": "active",
    },
    {
        "alert_id": "audit-sec-006",
        "type": "off_hours_access",
        "severity": "medium",
        "title": "Off-Hours System Access",
        "description": "Admin activities detected at 3:47 AM — potential unauthorized access.",
        "user_email": "admin@demo.com",
        "ip_address": "192.168.1.10",
        "recommended_action": "Verify admin session and check for possible account compromise.",
        "status": "active",
    },
    {
        "alert_id": "audit-sec-007",
        "type": "bulk_delete",
        "severity": "critical",
        "title": "Bulk Course Deletion Detected",
        "description": "12 courses were deleted within 3 minutes by a single admin account.",
        "user_email": "admin@demo.com",
        "ip_address": "172.16.0.12",
        "recommended_action": "Restore deleted courses from backup and audit admin permissions immediately.",
        "status": "active",
    },
    {
        "alert_id": "audit-sec-008",
        "type": "api_abuse",
        "severity": "medium",
        "title": "High API Request Rate",
        "description": "API endpoint /api/mongo/courses hit 500 times in 60 seconds from a single token.",
        "user_email": "viewer@demo.com",
        "ip_address": "203.0.113.42",
        "recommended_action": "Implement rate limiting and review API token usage patterns.",
        "status": "resolved",
    },
]

# ── Real-user helper ────────────────────────────────────────────────

async def _fetch_real_users() -> List[dict]:
    """Return users from MongoDB users collection, shaped for log generation.
    Falls back to _USERS if the collection is empty."""
    raw = await _users_col().find({"is_active": True}).to_list(500)
    if not raw:
        return _USERS
    return [
        {
            "id":     str(u["_id"]),
            "email":  u.get("email", ""),
            "name":   u.get("full_name", "User"),
            "role":   u.get("role", "employee"),
            "avatar": "".join(w[0].upper() for w in u.get("full_name", "U").split()[:2]),
        }
        for u in raw
    ]

# ── Log entry generator ─────────────────────────────────────────────

def _gen_entry(offset_minutes: int = 0, users_list: Optional[List[dict]] = None) -> dict:
    user   = random.choice(users_list if users_list else _USERS)
    act    = random.choice(_ACTIONS)
    entity = random.choice(_ENTITIES) if random.random() > 0.3 else None

    status = (
        "failed"  if act["action"] == "failed_login" else
        "warning" if act["severity"] in ("warning", "critical") and random.random() > 0.7 else
        "success"
    )
    return {
        "log_id":          str(uuid.uuid4()),
        "timestamp":       datetime.utcnow() - timedelta(minutes=offset_minutes),
        "user_id":         user["id"],
        "user_email":      user["email"],
        "user_name":       user["name"],
        "user_role":       user["role"],
        "user_avatar":     user["avatar"],
        "action":          act["action"],
        "action_category": act["category"],
        "page":            act["page"],
        "module":          act["module"],
        "entity_type":     entity["type"] if entity else None,
        "entity_id":       str(uuid.uuid4())[:8] if entity else None,
        "entity_name":     entity["name"] if entity else None,
        "duration_ms":     random.randint(50, 8000) if act["action"] != "logout" else random.randint(1, 50),
        "browser":         random.choice(_BROWSERS),
        "os":              random.choice(_OS_LIST),
        "device_type":     random.choice(_DEVICE_TYPES),
        "ip_address":      random.choice(_IPS),
        "status":          status,
        "severity":        act["severity"],
        "tenant_id":       "demo-corp",
    }

# ── Auto-sync background task ───────────────────────────────────────

_sync_task: Optional[asyncio.Task] = None

async def _auto_sync_loop():
    """Inserts a realistic log entry every 15 seconds to power the live feed.
    Uses real users from the users collection so names/roles are accurate."""
    while True:
        try:
            await asyncio.sleep(15)
            users_for_gen = await _fetch_real_users()
            await _logs_col().insert_one(_gen_entry(0, users_for_gen))
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(5)


def start_auto_sync():
    global _sync_task
    if _sync_task is None or _sync_task.done():
        _sync_task = asyncio.ensure_future(_auto_sync_loop())

# ── Seed + ensure helpers ───────────────────────────────────────────

_SEED_COUNT = 120

async def _ensure_seeded():
    col    = _logs_col()
    alerts = _alerts_col()

    if await col.count_documents({}) == 0:
        users_for_gen = await _fetch_real_users()
        entries = [_gen_entry(random.randint(0, 7 * 24 * 60), users_for_gen) for _ in range(_SEED_COUNT)]
        entries.sort(key=lambda x: x["timestamp"], reverse=True)
        await col.insert_many(entries)
        await col.create_index([("timestamp", -1)])
        await col.create_index([("user_email", 1)])
        await col.create_index([("action",     1)])
        await col.create_index([("status",     1)])
        await col.create_index([("tenant_id",  1)])

    if await alerts.count_documents({}) == 0:
        now = datetime.utcnow()
        for i, a in enumerate(_DEFAULT_ALERTS):
            ts = now - timedelta(hours=i * 2)
            await alerts.insert_one({**a, "timestamp": ts, "created_at": ts})
        await alerts.create_index([("timestamp", -1)])
        await alerts.create_index([("status",    1)])
        await alerts.create_index([("severity",  1)])


def _ser_log(doc: dict) -> dict:
    doc.pop("_id", None)
    if isinstance(doc.get("timestamp"), datetime):
        doc["timestamp"] = doc["timestamp"].isoformat()
    return doc

def _ser_alert(doc: dict) -> dict:
    doc.pop("_id", None)
    for field in ("timestamp", "created_at", "resolved_at"):
        if isinstance(doc.get(field), datetime):
            doc[field] = doc[field].isoformat()
    return doc

# ── Request models ──────────────────────────────────────────────────

class ResolveAlertBody(BaseModel):
    pass  # alert_id from path param

# ── Endpoints ───────────────────────────────────────────────────────

@router.post("/seed")
async def seed_audit_logs():
    """Seed admin_audit_logs and admin_security_alerts. Idempotent."""
    col    = _logs_col()
    alerts = _alerts_col()

    log_count   = await col.count_documents({})
    alert_count = await alerts.count_documents({})

    if log_count == 0:
        users_for_gen = await _fetch_real_users()
        entries = [_gen_entry(random.randint(0, 7 * 24 * 60), users_for_gen) for _ in range(_SEED_COUNT)]
        entries.sort(key=lambda x: x["timestamp"], reverse=True)
        await col.insert_many(entries)

    if alert_count == 0:
        now = datetime.utcnow()
        for i, a in enumerate(_DEFAULT_ALERTS):
            ts = now - timedelta(hours=i * 2)
            await alerts.insert_one({**a, "timestamp": ts, "created_at": ts})

    return {
        "success":       True,
        "logs_seeded":   0 if log_count   > 0 else _SEED_COUNT,
        "alerts_seeded": 0 if alert_count > 0 else len(_DEFAULT_ALERTS),
    }


@router.get("/kpis")
async def get_kpis():
    """KPI metrics for the dashboard header row."""
    await _ensure_seeded()
    col    = _logs_col()
    alerts = _alerts_col()

    now      = datetime.utcnow()
    today    = now.replace(hour=0, minute=0, second=0, microsecond=0)
    last_1h  = now - timedelta(hours=1)
    last_24h = now - timedelta(hours=24)
    yesterday = today - timedelta(days=1)

    total_today     = await col.count_documents({"timestamp": {"$gte": today}})
    total_yesterday = await col.count_documents({"timestamp": {"$gte": yesterday, "$lt": today}})
    total_all       = await col.count_documents({})
    failed_logins   = await col.count_documents({"action": "failed_login", "timestamp": {"$gte": last_24h}})
    active_alerts   = await alerts.count_documents({"status": "active"})
    critical_alerts = await alerts.count_documents({"status": "active", "severity": "critical"})

    active_res = await col.aggregate([
        {"$match": {"timestamp": {"$gte": last_1h}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "count"},
    ]).to_list(1)
    active_users = active_res[0]["count"] if active_res else 0

    dur_res = await col.aggregate([
        {"$match": {"timestamp": {"$gte": last_24h}, "duration_ms": {"$gt": 0}}},
        {"$group": {"_id": None, "avg": {"$avg": "$duration_ms"}}},
    ]).to_list(1)
    avg_duration_sec = round(dur_res[0]["avg"] / 1000, 1) if dur_res else 0

    trend = (
        round(((total_today - total_yesterday) / max(total_yesterday, 1)) * 100, 1)
        if total_yesterday else 0
    )

    return {
        "total_events":       total_all,
        "events_today":       total_today,
        "events_trend":       trend,
        "active_users":       active_users,
        "failed_logins_24h":  failed_logins,
        "avg_session_sec":    avg_duration_sec,
        "active_alerts":      active_alerts,
        "critical_alerts":    critical_alerts,
    }


@router.get("/analytics")
async def get_analytics():
    """Analytics data — trends, distributions, top users."""
    await _ensure_seeded()
    col = _logs_col()
    now = datetime.utcnow()

    hourly = []
    for h in range(23, -1, -1):
        start = now - timedelta(hours=h + 1)
        end   = now - timedelta(hours=h)
        count = await col.count_documents({"timestamp": {"$gte": start, "$lt": end}})
        hourly.append({"hour": (now - timedelta(hours=h)).strftime("%H:00"), "count": count})

    daily = []
    for d in range(6, -1, -1):
        start = (now - timedelta(days=d)).replace(hour=0, minute=0, second=0, microsecond=0)
        end   = start + timedelta(days=1)
        count = await col.count_documents({"timestamp": {"$gte": start, "$lt": end}})
        daily.append({"date": start.strftime("%m/%d"), "count": count})

    action_dist = await col.aggregate([
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort":  {"count": -1}},
        {"$limit": 10},
    ]).to_list(10)

    status_dist = await col.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]).to_list(10)

    cat_dist = await col.aggregate([
        {"$group": {"_id": "$action_category", "count": {"$sum": 1}}},
        {"$sort":  {"count": -1}},
    ]).to_list(10)

    top_users = await col.aggregate([
        {"$match": {"timestamp": {"$gte": now - timedelta(days=7)}}},
        {"$group": {"_id": "$user_email", "name": {"$first": "$user_name"}, "role": {"$first": "$user_role"}, "count": {"$sum": 1}}},
        {"$sort":  {"count": -1}},
        {"$limit": 5},
    ]).to_list(5)

    return {
        "hourly_events":       hourly,
        "daily_events":        daily,
        "action_distribution": [{"action": d["_id"], "count": d["count"]} for d in action_dist],
        "status_distribution": [{"status": d["_id"], "count": d["count"]} for d in status_dist],
        "category_distribution": [{"category": d["_id"], "count": d["count"]} for d in cat_dist],
        "top_users": [
            {"email": d["_id"], "name": d.get("name", ""), "role": d.get("role", ""), "count": d["count"]}
            for d in top_users
        ],
    }


@router.get("/live-feed")
async def get_live_feed(limit: int = Query(20, ge=1, le=50)):
    """Latest log entries for the live activity panel."""
    await _ensure_seeded()
    docs = await _logs_col().find({}).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"entries": [_ser_log(d) for d in docs]}


@router.get("/security-alerts")
async def get_security_alerts(status: Optional[str] = None):
    """Security alerts for the right panel."""
    await _ensure_seeded()
    query = {"status": status} if status else {}
    docs  = await _alerts_col().find(query).sort("timestamp", -1).to_list(100)
    result = [_ser_alert(d) for d in docs]
    return {
        "alerts": result,
        "counts": {
            "total":    len(result),
            "active":   sum(1 for a in result if a["status"] == "active"),
            "critical": sum(1 for a in result if a["severity"] == "critical"),
            "high":     sum(1 for a in result if a["severity"] == "high"),
            "medium":   sum(1 for a in result if a["severity"] == "medium"),
            "low":      sum(1 for a in result if a["severity"] == "low"),
        },
    }


@router.patch("/security-alerts/{alert_id}/resolve")
async def resolve_security_alert(alert_id: str):
    """Mark a security alert as resolved."""
    result = await _alerts_col().update_one(
        {"alert_id": alert_id},
        {"$set": {"status": "resolved", "resolved_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}


@router.get("/export/csv")
async def export_csv(
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
    user_role: Optional[str] = None,
    action:    Optional[str] = None,
    status:    Optional[str] = None,
):
    """Export filtered audit logs as a CSV file."""
    await _ensure_seeded()
    query: Dict[str, Any] = {}
    if date_from or date_to:
        query["timestamp"] = {}
        if date_from:
            query["timestamp"]["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            query["timestamp"]["$lte"] = datetime.fromisoformat(date_to)
    if user_role: query["user_role"] = user_role
    if action:    query["action"]    = action
    if status:    query["status"]    = status

    docs = await _logs_col().find(query).sort("timestamp", -1).limit(5000).to_list(5000)

    buf    = io.StringIO()
    fields = ["timestamp","user_name","user_email","user_role","action","page",
              "entity_name","duration_ms","browser","os","device_type","ip_address","status","severity"]
    writer = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for d in docs:
        d.pop("_id", None)
        if isinstance(d.get("timestamp"), datetime):
            d["timestamp"] = d["timestamp"].isoformat()
        writer.writerow({f: d.get(f, "") for f in fields})

    buf.seek(0)
    fname = f"audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={fname}"},
    )


@router.post("/generate")
async def generate_live_log():
    """Insert one synthetic log entry right now (for testing the live feed)."""
    users_for_gen = await _fetch_real_users()
    entry = _gen_entry(0, users_for_gen)
    await _logs_col().insert_one(entry)
    return {"success": True, "entry": _ser_log(entry)}


@router.get("")
async def list_audit_logs(
    page:      int            = Query(1, ge=1),
    limit:     int            = Query(50, ge=1, le=200),
    q:         str            = Query(""),
    date_from: Optional[str]  = None,
    date_to:   Optional[str]  = None,
    user_role: Optional[str]  = None,
    action:    Optional[str]  = None,
    status:    Optional[str]  = None,
    severity:  Optional[str]  = None,
    page_name: Optional[str]  = None,
    sort_by:   str            = Query("timestamp"),
    sort_dir:  int            = Query(-1),
):
    """Paginated, filterable, sortable audit log table data."""
    await _ensure_seeded()
    col   = _logs_col()
    query: Dict[str, Any] = {}

    if q:
        query["$or"] = [
            {"user_email": {"$regex": q, "$options": "i"}},
            {"user_name":  {"$regex": q, "$options": "i"}},
            {"action":     {"$regex": q, "$options": "i"}},
            {"entity_name":{"$regex": q, "$options": "i"}},
            {"page":       {"$regex": q, "$options": "i"}},
        ]

    if date_from or date_to:
        query["timestamp"] = {}
        if date_from:
            query["timestamp"]["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            query["timestamp"]["$lte"] = datetime.fromisoformat(date_to)

    if user_role: query["user_role"] = user_role
    if action:    query["action"]    = action
    if status:    query["status"]    = status
    if severity:  query["severity"]  = severity
    if page_name: query["page"]      = {"$regex": page_name, "$options": "i"}

    total = await col.count_documents(query)
    skip  = (page - 1) * limit
    _VALID_SORTS = {"timestamp", "user_name", "action", "status", "duration_ms", "severity"}
    sf    = sort_by if sort_by in _VALID_SORTS else "timestamp"

    docs = await col.find(query).sort(sf, sort_dir).skip(skip).limit(limit).to_list(limit)
    return {
        "logs":  [_ser_log(d) for d in docs],
        "total": total,
        "page":  page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    }
