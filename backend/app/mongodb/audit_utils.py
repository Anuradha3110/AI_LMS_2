"""Shared audit-log writer — inserts a real entry into admin_audit_logs."""
import uuid
from datetime import datetime
from typing import Optional

from app.mongodb.connection import webx_db


async def log_activity(
    *,
    user_id: str,
    user_email: str,
    user_name: str,
    user_role: str,
    tenant_id: str = "",
    action: str,
    category: str,
    page: str,
    module: str,
    severity: str = "info",
    status: str = "success",
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    entity_name: Optional[str] = None,
    ip_address: str = "unknown",
    details: Optional[str] = None,
) -> None:
    """Write one audit log entry. Safe to call from any async router via background_tasks."""
    initials = "".join(w[0].upper() for w in user_name.split()[:2]) if user_name.strip() else "?"
    await webx_db()["admin_audit_logs"].insert_one({
        "log_id":          str(uuid.uuid4()),
        "timestamp":       datetime.utcnow(),
        "user_id":         user_id,
        "user_email":      user_email,
        "user_name":       user_name,
        "user_role":       user_role,
        "user_avatar":     initials,
        "tenant_id":       tenant_id,
        "action":          action,
        "action_category": category,
        "page":            page,
        "module":          module,
        "severity":        severity,
        "status":          status,
        "entity_type":     entity_type,
        "entity_id":       entity_id,
        "entity_name":     entity_name,
        "duration_ms":     0,
        "browser":         "Web",
        "os":              "Unknown",
        "device_type":     "desktop",
        "ip_address":      ip_address,
        "details":         details,
    })
