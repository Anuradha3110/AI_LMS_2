"""
Manager Dashboard router — CRUD for Team_progress and Leaderboard
collections in the webx MongoDB database.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.mongodb.connection import (
    attendence_col, leaderboard_col, team_progress_col,
    leave_requests_col, user_profiles_col, webx_db,
)

router = APIRouter(prefix="/api/mongo", tags=["Manager Dashboard"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _serialize(doc: dict) -> dict:
    """Convert ObjectId fields to strings for JSON serialization."""
    out = {k: (str(v) if isinstance(v, ObjectId) else v) for k, v in doc.items()}
    out["_id"] = str(doc["_id"])
    return out


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid id: {id_str}")


def _users_col():
    return webx_db()["users"]


# ── Sync state ────────────────────────────────────────────────────────────────

_last_sync: Optional[datetime] = None
_SYNC_INTERVAL = 300  # seconds between auto-syncs


async def _sync_from_users() -> list:
    """Upsert dashboard collections from employees only (role == 'employee').
    All non-employee records are removed from every managed collection."""
    users = await _users_col().find({"is_active": True, "role": "employee"}).to_list(length=500)

    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")
    tp_col  = team_progress_col()
    lb_col  = leaderboard_col()
    att_col = attendence_col()
    up_col  = user_profiles_col()
    lr_col  = leave_requests_col()

    employee_ids = [str(u["_id"]) for u in users]

    for user in users:
        uid    = str(user["_id"])
        name   = user.get("full_name", "Unknown")
        dept   = user.get("department") or user.get("role", "employee").title()
        email  = user.get("email", "")
        avatar = "".join(w[0].upper() for w in name.split()[:2]) if name.strip() else "?"

        # Team_progress — always refresh identity fields; preserve performance scores
        await tp_col.update_one(
            {"user_id": uid},
            {
                "$set": {"name": name, "role": dept, "avatar": avatar, "email": email, "updated_at": now},
                "$setOnInsert": {
                    "user_id": uid,
                    "kpi": 0, "completion": 0,
                    "pitchScore": 0, "objectionScore": 0, "escalationScore": 0,
                    "status": "New", "created_at": now,
                },
            },
            upsert=True,
        )

        # Leaderboard — always refresh identity fields; preserve XP/level/badges
        await lb_col.update_one(
            {"user_id": uid},
            {
                "$set": {"full_name": name, "role": dept, "email": email, "updated_at": now},
                "$setOnInsert": {
                    "user_id": uid,
                    "xp_points": 0, "level": 1,
                    "badges_count": 0, "streak_days": 0,
                    "completion": 0, "kpi": 0, "created_at": now,
                },
            },
            upsert=True,
        )

        # Attendence — one record per user per day, created only if it doesn't exist
        await att_col.update_one(
            {"user_id": uid, "date": today},
            {
                "$setOnInsert": {
                    "user_id": uid,
                    "Name": name,
                    "Role": dept,
                    "Status": "Present",
                    "Check In": "",
                    "Check Out": "",
                    "Hours Worked": "0h",
                    "Note": "",
                    "date": today,
                    "created_at": now,
                    "updated_at": now,
                },
            },
            upsert=True,
        )

        # User_profiles — seed basic info on first access
        await up_col.update_one(
            {"user_id": uid},
            {
                "$set": {"updated_at": now},
                "$setOnInsert": {
                    "user_id": uid,
                    "full_name": name,
                    "email": email,
                    "created_at": now,
                },
            },
            upsert=True,
        )

    # ── Purge all non-employee records ────────────────────────────────────────
    # Matches: records whose user_id is not an employee, AND old hardcoded records
    # without user_id (e.g. legacy seed data).  $nin on [] matches everything,
    # so if there are no employees every collection is cleared.
    _not_emp = {"$or": [
        {"user_id": {"$exists": False}},
        {"user_id": {"$nin": employee_ids}},
    ]}
    await tp_col.delete_many(_not_emp)
    await lb_col.delete_many(_not_emp)
    await lr_col.delete_many(_not_emp)
    # Attendence: keep manually-added rows without user_id (could be valid employee records)
    await att_col.delete_many({"user_id": {"$exists": True, "$nin": employee_ids}})
    # User_profiles always have user_id (set by the upsert endpoint)
    await up_col.delete_many({"user_id": {"$nin": employee_ids}})

    return users


async def _seed_leave_requests(users: list) -> None:
    """Seed Leave_requests once using real user names (no-op if already has data)."""
    col = leave_requests_col()
    if await col.count_documents({}) > 0:
        return

    if not users:
        return

    now = datetime.utcnow()
    leave_types  = ["Sick Leave",   "Casual Leave",  "Earned Leave",
                    "Sick Leave",   "Casual Leave",  "Earned Leave"]
    reasons      = [
        "Fever and flu recovery.",
        "Family function.",
        "Annual vacation trip.",
        "Migraine — doctor visit.",
        "Personal errand.",
        "Pre-planned trip.",
    ]
    statuses = ["pending", "approved", "pending", "rejected", "pending", "approved"]
    comments = [None, "Approved. Enjoy!", None, "Critical deadline. Please reschedule.", None, "Approved — targets met."]

    docs = []
    for i, user in enumerate(users[:6]):
        name   = user.get("full_name", "User")
        uid    = str(user["_id"])
        avatar = "".join(w[0].upper() for w in name.split()[:2]) if name.strip() else "?"
        docs.append({
            "user_id":     uid,
            "name":        name,
            "avatar":      avatar,
            "type":        leave_types[i],
            "startDate":   "May 15, 2025",
            "endDate":     "May 17, 2025",
            "days":        3,
            "reason":      reasons[i],
            "status":      statuses[i],
            "appliedDate": "May 10, 2025",
            "comment":     comments[i],
            "created_at":  now,
            "updated_at":  now,
        })

    if docs:
        await col.insert_many(docs)
        await col.create_index([("created_at", -1)])


async def _ensure_synced() -> None:
    """Sync from users collection at most once every _SYNC_INTERVAL seconds.
    Uses asyncio's cooperative threading — setting _last_sync before the first
    await prevents concurrent re-entry without needing an asyncio.Lock."""
    global _last_sync
    now = datetime.utcnow()
    if _last_sync and (now - _last_sync).total_seconds() < _SYNC_INTERVAL:
        return
    _last_sync = now  # optimistic write — no other coroutine runs until we await
    try:
        users = await _sync_from_users()
        await _seed_leave_requests(users)
    except Exception:
        _last_sync = None  # allow retry on failure


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class TeamProgressIn(BaseModel):
    name: str
    role: str
    avatar: Optional[str] = None
    kpi: float = 0
    completion: float = 0
    pitchScore: float = 0
    objectionScore: float = 0
    escalationScore: float = 0
    status: str = "New"


class TeamProgressPatch(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    avatar: Optional[str] = None
    kpi: Optional[float] = None
    completion: Optional[float] = None
    pitchScore: Optional[float] = None
    objectionScore: Optional[float] = None
    escalationScore: Optional[float] = None
    status: Optional[str] = None


class LeaderboardIn(BaseModel):
    full_name: str
    role: Optional[str] = None
    xp_points: float = 0
    level: int = 1
    badges_count: int = 0
    streak_days: int = 0
    completion: Optional[float] = None
    kpi: Optional[float] = None


class LeaderboardPatch(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    xp_points: Optional[float] = None
    level: Optional[int] = None
    badges_count: Optional[int] = None
    streak_days: Optional[int] = None
    completion: Optional[float] = None
    kpi: Optional[float] = None


# ════════════════════════════════════════════════════════════════════════════════
# TEAM PROGRESS  —  /api/mongo/team-progress
# ════════════════════════════════════════════════════════════════════════════════

@router.get("/team-progress", response_model=List[Dict[str, Any]])
async def list_team_progress():
    """List all Team_progress documents (synced from users collection)."""
    await _ensure_synced()
    col = team_progress_col()
    docs = await col.find({}).to_list(length=200)
    return [_serialize(d) for d in docs]


@router.post("/team-progress", response_model=Dict[str, Any], status_code=201)
async def create_team_progress(body: TeamProgressIn):
    """Add a new team member to Team_progress collection."""
    col = team_progress_col()
    doc = {
        **body.model_dump(),
        "avatar": body.avatar or "".join(w[0] for w in body.name.split()[:2]).upper(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await col.insert_one(doc)
    inserted = await col.find_one({"_id": result.inserted_id})
    return _serialize(inserted)


@router.put("/team-progress/{id}", response_model=Dict[str, Any])
async def update_team_progress(id: str, body: TeamProgressIn):
    """Full update of a Team_progress document."""
    col = team_progress_col()
    update = {**body.model_dump(), "updated_at": datetime.utcnow()}
    if body.avatar is None:
        update["avatar"] = "".join(w[0] for w in body.name.split()[:2]).upper()
    result = await col.find_one_and_update(
        {"_id": _oid(id)},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Team member not found")
    return _serialize(result)


@router.patch("/team-progress/{id}", response_model=Dict[str, Any])
async def patch_team_progress(id: str, body: TeamProgressPatch):
    """Partial update of a Team_progress document."""
    col = team_progress_col()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.utcnow()
    result = await col.find_one_and_update(
        {"_id": _oid(id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Team member not found")
    return _serialize(result)


@router.delete("/team-progress/{id}", status_code=204)
async def delete_team_progress(id: str):
    """Delete a Team_progress document."""
    col = team_progress_col()
    result = await col.delete_one({"_id": _oid(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")


# ════════════════════════════════════════════════════════════════════════════════
# LEADERBOARD  —  /api/mongo/leaderboard-data
# ════════════════════════════════════════════════════════════════════════════════

@router.get("/leaderboard-data", response_model=List[Dict[str, Any]])
async def list_leaderboard():
    """List all Leaderboard entries sorted by xp_points descending (synced from users collection)."""
    await _ensure_synced()
    col = leaderboard_col()
    docs = await col.find({}).sort("xp_points", -1).to_list(length=200)
    return [_serialize(d) for d in docs]


@router.post("/leaderboard-data", response_model=Dict[str, Any], status_code=201)
async def create_leaderboard_entry(body: LeaderboardIn):
    """Add a new Leaderboard entry."""
    col = leaderboard_col()
    doc = {
        **body.model_dump(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await col.insert_one(doc)
    inserted = await col.find_one({"_id": result.inserted_id})
    return _serialize(inserted)


@router.put("/leaderboard-data/{id}", response_model=Dict[str, Any])
async def update_leaderboard_entry(id: str, body: LeaderboardIn):
    """Full update of a Leaderboard entry."""
    col = leaderboard_col()
    update = {**body.model_dump(), "updated_at": datetime.utcnow()}
    result = await col.find_one_and_update(
        {"_id": _oid(id)},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Leaderboard entry not found")
    return _serialize(result)


@router.patch("/leaderboard-data/{id}", response_model=Dict[str, Any])
async def patch_leaderboard_entry(id: str, body: LeaderboardPatch):
    """Partial update of a Leaderboard entry."""
    col = leaderboard_col()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.utcnow()
    result = await col.find_one_and_update(
        {"_id": _oid(id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Leaderboard entry not found")
    return _serialize(result)


@router.delete("/leaderboard-data/{id}", status_code=204)
async def delete_leaderboard_entry(id: str):
    """Delete a Leaderboard entry."""
    col = leaderboard_col()
    result = await col.delete_one({"_id": _oid(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Leaderboard entry not found")


# ════════════════════════════════════════════════════════════════════════════════
# SEED  —  /api/mongo/seed-dashboard
# ════════════════════════════════════════════════════════════════════════════════

@router.post("/seed-dashboard", status_code=201)
async def seed_dashboard():
    """
    Force-sync all manager dashboard collections from users where role=='employee'.
    Removes any admin/manager/stale records. Safe to call multiple times.
    """
    global _last_sync
    _last_sync = None  # force fresh sync regardless of interval
    users = await _sync_from_users()
    await _seed_leave_requests(users)
    return {
        "message": "Dashboard synced — employees only",
        "users_synced": len(users),
        "team_progress_count": await team_progress_col().count_documents({}),
        "leaderboard_count": await leaderboard_col().count_documents({}),
        "attendance_count": await attendence_col().count_documents({}),
        "leave_requests_count": await leave_requests_col().count_documents({}),
    }


# ════════════════════════════════════════════════════════════════════════════════
# ATTENDANCE  —  /api/mongo/attendance
# ════════════════════════════════════════════════════════════════════════════════

# Valid statuses stored in MongoDB
_VALID_STATUSES = {"Present", "Absent", "Late", "On Leave"}


class AttendenceIn(BaseModel):
    Name: str
    Role: Optional[str] = None
    Status: str = "Present"
    CheckIn: Optional[str] = None   # "9:05 AM"
    CheckOut: Optional[str] = None  # "6:30 PM"
    HoursWorked: Optional[str] = None
    Note: Optional[str] = None
    date: Optional[str] = None      # ISO date string, e.g. "2026-04-21"


class AttendencePatch(BaseModel):
    Name: Optional[str] = None
    Role: Optional[str] = None
    Status: Optional[str] = None
    CheckIn: Optional[str] = None
    CheckOut: Optional[str] = None
    HoursWorked: Optional[str] = None
    Note: Optional[str] = None
    date: Optional[str] = None


def _att_to_doc(body: AttendenceIn) -> dict:
    """Map camelCase input to MongoDB field names used in the Attendence collection."""
    return {
        "Name":         body.Name,
        "Role":         body.Role or "",
        "Status":       body.Status,
        "Check In":     body.CheckIn or ("Ab" if body.Status in ("Absent",) else "Ap" if body.Status == "On Leave" else ""),
        "Check Out":    body.CheckOut or ("Ab" if body.Status in ("Absent",) else "Ap" if body.Status == "On Leave" else ""),
        "Hours Worked": body.HoursWorked or "0h",
        "Note":         body.Note or "",
        "date":         body.date or datetime.utcnow().strftime("%Y-%m-%d"),
        "updated_at":   datetime.utcnow(),
    }


def _is_employee_record(doc: dict) -> bool:
    """Filter out summary/header rows that were imported alongside real records."""
    name = doc.get("Name", "")
    # Skip known summary rows and empty docs
    skip = {"Attendance Summary", "Status", "Present", "Late", "Absent", "On Leave", "Total", ""}
    return bool(name) and name not in skip and doc.get("Role") not in (None, "Count", "Percentage")


@router.get("/attendance", response_model=List[Dict[str, Any]])
async def list_attendance():
    """List all real employee attendance records (synced from users collection)."""
    await _ensure_synced()
    col = attendence_col()
    docs = await col.find({}).sort("Name", 1).to_list(length=500)
    return [_serialize(d) for d in docs if _is_employee_record(d)]


@router.post("/attendance", response_model=Dict[str, Any], status_code=201)
async def create_attendance(body: AttendenceIn):
    """Add a new attendance record."""
    col = attendence_col()
    doc = {**_att_to_doc(body), "created_at": datetime.utcnow()}
    result = await col.insert_one(doc)
    inserted = await col.find_one({"_id": result.inserted_id})
    return _serialize(inserted)


@router.put("/attendance/{id}", response_model=Dict[str, Any])
async def update_attendance(id: str, body: AttendenceIn):
    """Full replacement of an attendance record."""
    col = attendence_col()
    update = _att_to_doc(body)
    result = await col.find_one_and_update(
        {"_id": _oid(id)},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return _serialize(result)


@router.patch("/attendance/{id}", response_model=Dict[str, Any])
async def patch_attendance(id: str, body: AttendencePatch):
    """Partial update of an attendance record."""
    col = attendence_col()
    field_map = {
        "Name": body.Name, "Role": body.Role, "Status": body.Status,
        "Check In": body.CheckIn, "Check Out": body.CheckOut,
        "Hours Worked": body.HoursWorked, "Note": body.Note, "date": body.date,
    }
    updates = {k: v for k, v in field_map.items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.utcnow()
    result = await col.find_one_and_update(
        {"_id": _oid(id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return _serialize(result)


@router.delete("/attendance/{id}", status_code=204)
async def delete_attendance(id: str):
    """Delete an attendance record."""
    col = attendence_col()
    result = await col.delete_one({"_id": _oid(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Attendance record not found")


# ════════════════════════════════════════════════════════════════════════════════
# LEAVE REQUESTS  —  /api/mongo/leave-requests
# ════════════════════════════════════════════════════════════════════════════════

class LeaveRequestStatusPatch(BaseModel):
    status: str          # "approved" | "rejected" | "pending"
    comment: Optional[str] = None


@router.get("/leave-requests", response_model=List[Dict[str, Any]])
async def list_leave_requests():
    """List all Leave_requests documents (seeded from real users if empty)."""
    await _ensure_synced()
    col = leave_requests_col()
    docs = await col.find({}).sort("created_at", -1).to_list(length=500)
    return [_serialize(d) for d in docs]


@router.patch("/leave-requests/{id}", response_model=Dict[str, Any])
async def patch_leave_request(id: str, body: LeaveRequestStatusPatch):
    """Update status (and optional comment) of a Leave_requests document."""
    valid = {"pending", "approved", "rejected"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"status must be one of {valid}")
    col = leave_requests_col()
    updates: Dict[str, Any] = {"status": body.status, "updated_at": datetime.utcnow()}
    if body.comment is not None:
        updates["comment"] = body.comment
    result = await col.find_one_and_update(
        {"_id": _oid(id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return _serialize(result)


# ════════════════════════════════════════════════════════════════════════════════
# USER PROFILES  —  /api/mongo/profile/{user_id}
# ════════════════════════════════════════════════════════════════════════════════

class ProfileAddress(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip: Optional[str] = None


class ProfileLinks(BaseModel):
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None
    twitter: Optional[str] = None


class UserProfileIn(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    department: Optional[str] = None
    title: Optional[str] = None
    address: Optional[ProfileAddress] = None
    links: Optional[ProfileLinks] = None


@router.get("/profile/{user_id}", response_model=Dict[str, Any])
async def get_user_profile(user_id: str):
    """Fetch a user's extended profile from User_profiles collection."""
    col = user_profiles_col()
    doc = await col.find_one({"user_id": user_id})
    if not doc:
        # Return an empty profile rather than 404 so the frontend can display the form
        return {"user_id": user_id}
    return _serialize(doc)


@router.put("/profile/{user_id}", response_model=Dict[str, Any])
async def upsert_user_profile(user_id: str, body: UserProfileIn):
    """Create or update a user's extended profile (upsert by user_id)."""
    col = user_profiles_col()
    update_fields: Dict[str, Any] = {"user_id": user_id, "updated_at": datetime.utcnow()}
    data = body.model_dump()
    for k, v in data.items():
        if v is not None:
            if isinstance(v, dict):
                # Flatten nested dicts into the document as sub-dicts
                update_fields[k] = {sk: sv for sk, sv in v.items() if sv is not None}
            else:
                update_fields[k] = v

    result = await col.find_one_and_update(
        {"user_id": user_id},
        {"$set": update_fields},
        upsert=True,
        return_document=True,
    )
    return _serialize(result)
