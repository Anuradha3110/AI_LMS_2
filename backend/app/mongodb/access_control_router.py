"""
Access Control Centre — MongoDB router.
Manages RBAC role hierarchy, permissions, audit logging, and security analytics.
Collections: ac_roles, ac_audit_log, ac_security_alerts
"""
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.mongodb.connection import webx_db

router = APIRouter(prefix="/api/mongo/access-control", tags=["Access Control"])

# ── Static metadata ────────────────────────────────────────────────

RESOURCES = [
    ("courses",        "Courses",        "📚"),
    ("users",          "Users",          "👥"),
    ("assessments",    "Assessments",    "📋"),
    ("knowledge",      "Knowledge Base", "📖"),
    ("ai_studio",      "AI Studio",      "✨"),
    ("analytics",      "Analytics",      "📊"),
    ("settings",       "Settings",       "⚙️"),
    ("billing",        "Billing",        "💳"),
    ("integrations",   "Integrations",   "🔗"),
    ("adaptive_rules", "Adaptive Rules", "🎯"),
    ("notifications",  "Notifications",  "🔔"),
    ("audit_log",      "Audit Log",      "🔍"),
]

PERM_TYPES = ["view", "create", "edit", "delete", "approve"]


def _full(exclude: List[str] = None) -> Dict[str, Any]:
    exclude = exclude or []
    return {
        r[0]: {
            "view": True,
            "create": r[0] not in exclude,
            "edit": r[0] not in exclude,
            "delete": r[0] not in exclude,
            "approve": r[0] not in exclude,
        }
        for r in RESOURCES
    }


def _view_only() -> Dict[str, Any]:
    return {r[0]: {"view": True, "create": False, "edit": False, "delete": False, "approve": False} for r in RESOURCES}


def _manager_perms() -> Dict[str, Any]:
    full = ["courses", "assessments", "knowledge", "ai_studio", "notifications"]
    view = ["analytics", "audit_log"]
    limited = ["users"]
    result = {}
    for r in RESOURCES:
        if r[0] in full:
            result[r[0]] = {"view": True, "create": True, "edit": True, "delete": False, "approve": True}
        elif r[0] in view:
            result[r[0]] = {"view": True, "create": False, "edit": False, "delete": False, "approve": False}
        elif r[0] in limited:
            result[r[0]] = {"view": True, "create": True, "edit": True, "delete": False, "approve": False}
        else:
            result[r[0]] = {"view": False, "create": False, "edit": False, "delete": False, "approve": False}
    return result


def _employee_perms() -> Dict[str, Any]:
    result = {}
    for r in RESOURCES:
        if r[0] in ["courses", "assessments", "knowledge", "notifications"]:
            result[r[0]] = {"view": True, "create": False, "edit": False, "delete": False, "approve": False}
        else:
            result[r[0]] = {"view": False, "create": False, "edit": False, "delete": False, "approve": False}
    return result


def _senior_employee_perms() -> Dict[str, Any]:
    result = _employee_perms()
    result["assessments"] = {"view": True, "create": True, "edit": False, "delete": False, "approve": False}
    result["analytics"] = {"view": True, "create": False, "edit": False, "delete": False, "approve": False}
    return result


DEFAULT_ROLES = [
    {
        "role_id": "super-admin",
        "name": "Super Admin",
        "description": "Unrestricted access to all system features and settings",
        "color": "#dc2626",
        "icon": "👑",
        "parent_id": None,
        "order": 0,
        "permissions": _full(),
        "scope": {"type": "global", "departments": [], "inherited_from": None},
        "metadata": {
            "is_system_role": True,
            "is_locked": True,
            "tags": ["system", "root"],
            "user_count": 1,
        },
    },
    {
        "role_id": "admin",
        "name": "Administrator",
        "description": "Full platform access — manages users, courses, and settings",
        "color": "#6366f1",
        "icon": "🛡️",
        "parent_id": "super-admin",
        "order": 1,
        "permissions": _full(exclude=["billing"]),
        "scope": {"type": "global", "departments": [], "inherited_from": None},
        "metadata": {
            "is_system_role": True,
            "is_locked": False,
            "tags": ["system"],
            "user_count": 3,
        },
    },
    {
        "role_id": "manager",
        "name": "Manager",
        "description": "Manages teams and training — creates courses, tracks performance",
        "color": "#0891b2",
        "icon": "👔",
        "parent_id": "admin",
        "order": 2,
        "permissions": _manager_perms(),
        "scope": {"type": "department", "departments": [], "inherited_from": None},
        "metadata": {
            "is_system_role": True,
            "is_locked": False,
            "tags": ["management"],
            "user_count": 8,
        },
    },
    {
        "role_id": "senior-employee",
        "name": "Senior Employee",
        "description": "Experienced learner with content creation and peer mentoring rights",
        "color": "#059669",
        "icon": "⭐",
        "parent_id": "manager",
        "order": 3,
        "permissions": _senior_employee_perms(),
        "scope": {"type": "department", "departments": [], "inherited_from": None},
        "metadata": {
            "is_system_role": False,
            "is_locked": False,
            "tags": ["senior", "learner"],
            "user_count": 15,
        },
    },
    {
        "role_id": "employee",
        "name": "Employee",
        "description": "Standard learner — accesses courses, assessments, and learning materials",
        "color": "#d97706",
        "icon": "👤",
        "parent_id": "senior-employee",
        "order": 4,
        "permissions": _employee_perms(),
        "scope": {"type": "department", "departments": [], "inherited_from": None},
        "metadata": {
            "is_system_role": True,
            "is_locked": False,
            "tags": ["default", "learner"],
            "user_count": 45,
        },
    },
    {
        "role_id": "viewer",
        "name": "Viewer",
        "description": "Read-only access to public courses, reports, and announcements",
        "color": "#64748b",
        "icon": "👁️",
        "parent_id": "admin",
        "order": 5,
        "permissions": _view_only(),
        "scope": {"type": "global", "departments": [], "inherited_from": None},
        "metadata": {
            "is_system_role": False,
            "is_locked": False,
            "tags": ["readonly", "guest"],
            "user_count": 12,
        },
    },
    {
        "role_id": "content-creator",
        "name": "Content Creator",
        "description": "Creates and publishes training courses, quizzes, and knowledge articles",
        "color": "#7c3aed",
        "icon": "✍️",
        "parent_id": "manager",
        "order": 6,
        "permissions": {
            r[0]: {"view": True, "create": r[0] in ["courses", "assessments", "knowledge", "ai_studio", "notifications"], "edit": r[0] in ["courses", "assessments", "knowledge", "ai_studio"], "delete": r[0] in ["courses", "assessments", "knowledge"], "approve": False}
            for r in RESOURCES
        },
        "scope": {"type": "global", "departments": [], "inherited_from": None},
        "metadata": {
            "is_system_role": False,
            "is_locked": False,
            "tags": ["content", "creator"],
            "user_count": 6,
        },
    },
    {
        "role_id": "hr-admin",
        "name": "HR Admin",
        "description": "Manages user accounts, onboarding workflows, and HR-related courses",
        "color": "#ec4899",
        "icon": "🏢",
        "parent_id": "admin",
        "order": 7,
        "permissions": {
            r[0]: {"view": True, "create": r[0] in ["users", "notifications", "courses"], "edit": r[0] in ["users", "notifications"], "delete": r[0] == "users", "approve": r[0] in ["users", "courses"]}
            for r in RESOURCES
        },
        "scope": {"type": "global", "departments": [], "inherited_from": None},
        "metadata": {
            "is_system_role": False,
            "is_locked": False,
            "tags": ["hr", "admin"],
            "user_count": 4,
        },
    },
]

DEFAULT_ALERTS = [
    {
        "alert_id": "alert-001",
        "type": "privilege_escalation",
        "severity": "high",
        "title": "Excessive Delete Permissions",
        "description": "3 non-admin roles have delete access on sensitive resources. Review and restrict.",
        "role_id": "manager",
        "created_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
        "resolved": False,
    },
    {
        "alert_id": "alert-002",
        "type": "orphaned_users",
        "severity": "medium",
        "title": "Unassigned Role Users",
        "description": "12 users have the 'viewer' role — verify these accounts are intentional.",
        "role_id": "viewer",
        "created_at": (datetime.utcnow() - timedelta(hours=6)).isoformat(),
        "resolved": False,
    },
    {
        "alert_id": "alert-003",
        "type": "role_unused",
        "severity": "low",
        "title": "Inactive Role Detected",
        "description": "The 'content-creator' role has had no logins in the past 30 days.",
        "role_id": "content-creator",
        "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
        "resolved": False,
    },
    {
        "alert_id": "alert-004",
        "type": "audit_gap",
        "severity": "medium",
        "title": "Permission Changes Without Approval",
        "description": "5 permission updates were made in the last 7 days without dual-approval sign-off.",
        "role_id": None,
        "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
        "resolved": True,
    },
]

DEFAULT_AUDIT = [
    {
        "action": "permission_updated",
        "role_id": "manager",
        "role_name": "Manager",
        "changed_by": "admin@company.com",
        "changes": [{"field": "courses.delete", "from": True, "to": False}],
        "timestamp": (datetime.utcnow() - timedelta(minutes=45)).isoformat(),
        "severity": "warning",
        "ip": "192.168.1.10",
    },
    {
        "action": "role_created",
        "role_id": "content-creator",
        "role_name": "Content Creator",
        "changed_by": "admin@company.com",
        "changes": [{"field": "role", "from": None, "to": "content-creator"}],
        "timestamp": (datetime.utcnow() - timedelta(hours=3)).isoformat(),
        "severity": "info",
        "ip": "192.168.1.10",
    },
    {
        "action": "role_moved",
        "role_id": "senior-employee",
        "role_name": "Senior Employee",
        "changed_by": "admin@company.com",
        "changes": [{"field": "parent_id", "from": "employee", "to": "manager"}],
        "timestamp": (datetime.utcnow() - timedelta(days=1)).isoformat(),
        "severity": "info",
        "ip": "10.0.0.5",
    },
    {
        "action": "permission_updated",
        "role_id": "hr-admin",
        "role_name": "HR Admin",
        "changed_by": "super@company.com",
        "changes": [
            {"field": "users.delete", "from": False, "to": True},
            {"field": "billing.view", "from": False, "to": True},
        ],
        "timestamp": (datetime.utcnow() - timedelta(days=2)).isoformat(),
        "severity": "critical",
        "ip": "10.0.0.1",
    },
    {
        "action": "role_locked",
        "role_id": "super-admin",
        "role_name": "Super Admin",
        "changed_by": "system",
        "changes": [{"field": "is_locked", "from": False, "to": True}],
        "timestamp": (datetime.utcnow() - timedelta(days=3)).isoformat(),
        "severity": "info",
        "ip": "system",
    },
]


# ── Helpers ────────────────────────────────────────────────────────

def _col():
    return webx_db()["ac_roles"]


def _audit_col():
    return webx_db()["ac_audit_log"]


def _alerts_col():
    return webx_db()["ac_security_alerts"]


def _ser(doc: dict) -> dict:
    """Serialize MongoDB doc for JSON response."""
    doc.pop("_id", None)
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    if isinstance(doc.get("updated_at"), datetime):
        doc["updated_at"] = doc["updated_at"].isoformat()
    return doc


def _build_tree(roles: List[dict], parent_id=None) -> List[dict]:
    """Build nested tree from flat list."""
    return [
        {
            "role_id": r["role_id"],
            "name": r["name"],
            "color": r["color"],
            "icon": r["icon"],
            "user_count": r.get("metadata", {}).get("user_count", 0),
            "is_system_role": r.get("metadata", {}).get("is_system_role", False),
            "is_locked": r.get("metadata", {}).get("is_locked", False),
            "children": _build_tree(roles, r["role_id"]),
        }
        for r in sorted(roles, key=lambda x: x.get("order", 99))
        if r.get("parent_id") == parent_id
    ]


async def _log_audit(action: str, role_id: str, role_name: str, changes: list,
                     changed_by: str = "admin", severity: str = "info"):
    coll = _audit_col()
    await coll.insert_one({
        "action": action,
        "role_id": role_id,
        "role_name": role_name,
        "changed_by": changed_by,
        "changes": changes,
        "timestamp": datetime.utcnow(),
        "severity": severity,
        "ip": "system",
    })


# ── Request Models ─────────────────────────────────────────────────

class CreateRoleRequest(BaseModel):
    name: str
    description: str = ""
    color: str = "#6366f1"
    icon: str = "👤"
    parent_id: Optional[str] = None
    tags: List[str] = []


class UpdatePermissionsRequest(BaseModel):
    permissions: Dict[str, Dict[str, bool]]
    changed_by: str = "admin"


class MoveRoleRequest(BaseModel):
    new_parent_id: Optional[str] = None


class UpdateRoleRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    tags: Optional[List[str]] = None


class ResolveAlertRequest(BaseModel):
    alert_id: str


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/seed")
async def seed_roles():
    """Seed default roles into MongoDB. Idempotent — skips existing."""
    coll = _col()
    audit = _audit_col()
    alerts = _alerts_col()
    now = datetime.utcnow()

    seeded = 0
    for role in DEFAULT_ROLES:
        existing = await coll.find_one({"role_id": role["role_id"]})
        if not existing:
            await coll.insert_one({**role, "created_at": now, "updated_at": now})
            seeded += 1

    # Seed audit log
    count = await audit.count_documents({})
    if count == 0:
        for entry in DEFAULT_AUDIT:
            ts = entry.pop("timestamp", None)
            await audit.insert_one({
                **entry,
                "timestamp": datetime.fromisoformat(ts) if ts else now,
            })

    # Seed alerts
    count2 = await alerts.count_documents({})
    if count2 == 0:
        for alert in DEFAULT_ALERTS:
            ts = alert.pop("created_at", None)
            await alerts.insert_one({
                **alert,
                "created_at": datetime.fromisoformat(ts) if ts else now,
            })

    return {"seeded": seeded, "message": f"Seeded {seeded} new roles"}


@router.get("/roles")
async def get_roles():
    """Return flat list of roles + nested tree."""
    coll = _col()
    await _ensure_seeded(coll)
    docs = await coll.find({}).sort("order", 1).to_list(200)
    roles = [_ser(d) for d in docs]
    tree = _build_tree(roles)
    return {"roles": roles, "tree": tree, "resources": [{"id": r[0], "label": r[1], "icon": r[2]} for r in RESOURCES]}


async def _ensure_seeded(coll):
    """Auto-seed if collection is empty."""
    count = await coll.count_documents({})
    if count == 0:
        now = datetime.utcnow()
        for role in DEFAULT_ROLES:
            await coll.insert_one({**role, "created_at": now, "updated_at": now})
        audit = webx_db()["ac_audit_log"]
        a_count = await audit.count_documents({})
        if a_count == 0:
            for entry in DEFAULT_AUDIT:
                ts = entry.pop("timestamp", None)
                await audit.insert_one({**entry, "timestamp": datetime.fromisoformat(ts) if ts else now})
        alerts = webx_db()["ac_security_alerts"]
        al_count = await alerts.count_documents({})
        if al_count == 0:
            for alert in DEFAULT_ALERTS:
                ts = alert.pop("created_at", None)
                await alerts.insert_one({**alert, "created_at": datetime.fromisoformat(ts) if ts else now})


@router.get("/roles/{role_id}")
async def get_role(role_id: str):
    """Get a single role by ID."""
    doc = await _col().find_one({"role_id": role_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
    return _ser(doc)


@router.post("/roles")
async def create_role(body: CreateRoleRequest):
    """Create a new custom role."""
    coll = _col()
    existing = await coll.find_one({"name": body.name})
    if existing:
        raise HTTPException(status_code=409, detail=f"Role '{body.name}' already exists")

    role_id = body.name.lower().replace(" ", "-").replace("/", "-")
    now = datetime.utcnow()
    doc = {
        "role_id": role_id,
        "name": body.name,
        "description": body.description,
        "color": body.color,
        "icon": body.icon,
        "parent_id": body.parent_id,
        "order": 99,
        "permissions": _view_only(),
        "scope": {"type": "department", "departments": [], "inherited_from": body.parent_id},
        "metadata": {
            "is_system_role": False,
            "is_locked": False,
            "tags": body.tags,
            "user_count": 0,
        },
        "created_at": now,
        "updated_at": now,
    }
    await coll.insert_one(doc)
    await _log_audit("role_created", role_id, body.name, [{"field": "role", "from": None, "to": role_id}], severity="info")
    return {"success": True, "role": _ser(doc)}


@router.put("/roles/{role_id}")
async def update_role(role_id: str, body: UpdateRoleRequest):
    """Update role metadata."""
    coll = _col()
    doc = await coll.find_one({"role_id": role_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
    if doc.get("metadata", {}).get("is_locked"):
        raise HTTPException(status_code=403, detail="This role is locked and cannot be modified")

    update = {"updated_at": datetime.utcnow()}
    changes = []
    if body.name is not None:
        changes.append({"field": "name", "from": doc["name"], "to": body.name})
        update["name"] = body.name
    if body.description is not None:
        update["description"] = body.description
    if body.color is not None:
        update["color"] = body.color
    if body.icon is not None:
        update["icon"] = body.icon
    if body.tags is not None:
        update["metadata.tags"] = body.tags

    await coll.update_one({"role_id": role_id}, {"$set": update})
    if changes:
        await _log_audit("role_updated", role_id, doc["name"], changes, severity="info")
    updated = await coll.find_one({"role_id": role_id})
    return {"success": True, "role": _ser(updated)}


@router.delete("/roles/{role_id}")
async def delete_role(role_id: str):
    """Delete a custom role (system roles cannot be deleted)."""
    coll = _col()
    doc = await coll.find_one({"role_id": role_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
    if doc.get("metadata", {}).get("is_system_role"):
        raise HTTPException(status_code=403, detail="System roles cannot be deleted")
    if doc.get("metadata", {}).get("is_locked"):
        raise HTTPException(status_code=403, detail="Locked roles cannot be deleted")

    # Re-parent children to this role's parent
    await coll.update_many(
        {"parent_id": role_id},
        {"$set": {"parent_id": doc.get("parent_id"), "updated_at": datetime.utcnow()}},
    )
    await coll.delete_one({"role_id": role_id})
    await _log_audit("role_deleted", role_id, doc["name"], [{"field": "role", "from": role_id, "to": None}], severity="warning")
    return {"success": True, "message": f"Role '{doc['name']}' deleted"}


@router.patch("/roles/{role_id}/permissions")
async def update_permissions(role_id: str, body: UpdatePermissionsRequest):
    """Update permissions for a role."""
    coll = _col()
    doc = await coll.find_one({"role_id": role_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
    if doc.get("metadata", {}).get("is_locked"):
        raise HTTPException(status_code=403, detail="This role is locked")

    old_perms = doc.get("permissions", {})
    changes = []
    for resource, perms in body.permissions.items():
        for ptype, val in perms.items():
            old_val = old_perms.get(resource, {}).get(ptype, False)
            if old_val != val:
                changes.append({"field": f"{resource}.{ptype}", "from": old_val, "to": val})

    severity = "critical" if any(
        c["field"].endswith(".delete") and c["to"] for c in changes
    ) else "warning" if changes else "info"

    await coll.update_one(
        {"role_id": role_id},
        {"$set": {"permissions": body.permissions, "updated_at": datetime.utcnow()}},
    )
    if changes:
        await _log_audit("permission_updated", role_id, doc["name"], changes, body.changed_by, severity)

    updated = await coll.find_one({"role_id": role_id})
    return {"success": True, "role": _ser(updated), "changes": len(changes)}


@router.patch("/roles/{role_id}/move")
async def move_role(role_id: str, body: MoveRoleRequest):
    """Move a role to a new parent (drag-and-drop hierarchy change)."""
    coll = _col()
    doc = await coll.find_one({"role_id": role_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
    if doc.get("metadata", {}).get("is_locked"):
        raise HTTPException(status_code=403, detail="This role is locked")

    old_parent = doc.get("parent_id")
    await coll.update_one(
        {"role_id": role_id},
        {"$set": {"parent_id": body.new_parent_id, "updated_at": datetime.utcnow()}},
    )
    await _log_audit(
        "role_moved", role_id, doc["name"],
        [{"field": "parent_id", "from": old_parent, "to": body.new_parent_id}],
        severity="info",
    )
    return {"success": True, "message": f"Role moved to '{body.new_parent_id}'"}


@router.get("/audit")
async def get_audit_log(limit: int = 50, role_id: Optional[str] = None):
    """Get audit log entries, optionally filtered by role."""
    coll = _audit_col()
    query = {"role_id": role_id} if role_id else {}
    docs = await coll.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    result = []
    for d in docs:
        d.pop("_id", None)
        if isinstance(d.get("timestamp"), datetime):
            d["timestamp"] = d["timestamp"].isoformat()
        result.append(d)
    return {"entries": result, "total": len(result)}


@router.get("/alerts")
async def get_security_alerts():
    """Get security alerts."""
    coll = _alerts_col()
    if await coll.count_documents({}) == 0:
        now = datetime.utcnow()
        for alert in DEFAULT_ALERTS:
            ts = alert.pop("created_at", None)
            await coll.insert_one({**alert, "created_at": datetime.fromisoformat(ts) if ts else now})

    docs = await coll.find({}).sort("created_at", -1).to_list(50)
    result = []
    for d in docs:
        d.pop("_id", None)
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
        result.append(d)
    return {
        "alerts": result,
        "counts": {
            "critical": sum(1 for a in result if a["severity"] == "critical" and not a["resolved"]),
            "high": sum(1 for a in result if a["severity"] == "high" and not a["resolved"]),
            "medium": sum(1 for a in result if a["severity"] == "medium" and not a["resolved"]),
            "low": sum(1 for a in result if a["severity"] == "low" and not a["resolved"]),
        },
    }


@router.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    """Mark a security alert as resolved."""
    coll = _alerts_col()
    result = await coll.update_one({"alert_id": alert_id}, {"$set": {"resolved": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}


@router.get("/analytics")
async def get_analytics():
    """Return role usage analytics."""
    coll = _col()
    await _ensure_seeded(coll)
    docs = await coll.find({}).sort("order", 1).to_list(200)

    total_users = sum(d.get("metadata", {}).get("user_count", 0) for d in docs)
    most_used = max(docs, key=lambda d: d.get("metadata", {}).get("user_count", 0), default={})

    distribution = [
        {
            "role": d["name"],
            "role_id": d["role_id"],
            "count": d.get("metadata", {}).get("user_count", 0),
            "color": d.get("color", "#6366f1"),
        }
        for d in docs
    ]

    # Permission coverage: % of roles that have each permission type
    coverage = {}
    for pt in PERM_TYPES:
        enabled = sum(
            1 for d in docs
            if any(d.get("permissions", {}).get(r[0], {}).get(pt, False) for r in RESOURCES)
        )
        coverage[pt] = round(enabled / max(len(docs), 1) * 100)

    audit_coll = _audit_col()
    recent_30d = await audit_coll.count_documents({
        "timestamp": {"$gte": datetime.utcnow() - timedelta(days=30)}
    })

    return {
        "total_roles": len(docs),
        "total_users": total_users,
        "most_used_role": most_used.get("name", "—"),
        "permission_coverage": coverage,
        "role_distribution": distribution,
        "activity_last_30d": recent_30d,
        "system_roles": sum(1 for d in docs if d.get("metadata", {}).get("is_system_role")),
        "custom_roles": sum(1 for d in docs if not d.get("metadata", {}).get("is_system_role")),
        "locked_roles": sum(1 for d in docs if d.get("metadata", {}).get("is_locked")),
    }


@router.get("/export")
async def export_roles():
    """Export all roles as JSON."""
    coll = _col()
    docs = await coll.find({}).sort("order", 1).to_list(200)
    roles = [_ser(d) for d in docs]
    return {"version": "1.0", "exported_at": datetime.utcnow().isoformat(), "roles": roles}


@router.post("/import")
async def import_roles(body: Dict[str, Any]):
    """Import roles from exported JSON (upsert by role_id)."""
    coll = _col()
    roles = body.get("roles", [])
    upserted = 0
    for role in roles:
        if not role.get("role_id"):
            continue
        role.pop("_id", None)
        role["updated_at"] = datetime.utcnow()
        if not role.get("created_at"):
            role["created_at"] = datetime.utcnow()
        await coll.update_one({"role_id": role["role_id"]}, {"$set": role}, upsert=True)
        upserted += 1
    return {"success": True, "upserted": upserted}
