"""
Manager Dashboard router — CRUD for Team_progress and Leaderboard
collections in the webx MongoDB database.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.mongodb.connection import attendence_col, leaderboard_col, team_progress_col, leave_requests_col, user_profiles_col

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
    """List all Team_progress documents."""
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
    """List all Leaderboard entries sorted by xp_points descending."""
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
    Seed Team_progress and Leaderboard collections with demo data.
    Safe to call multiple times — skips if already seeded.
    """
    tp_col = team_progress_col()
    lb_col = leaderboard_col()

    # ── Team Progress ──────────────────────────────────────────────────────────
    if await tp_col.count_documents({}) == 0:
        team_data = [
            {"name": "Raju Sharma",  "role": "Sales",      "avatar": "RS", "kpi": 68, "completion": 72, "pitchScore": 74, "objectionScore": 62, "escalationScore": 81, "status": "At Risk"},
            {"name": "Priya Mehta",  "role": "Sales",      "avatar": "PM", "kpi": 91, "completion": 95, "pitchScore": 92, "objectionScore": 88, "escalationScore": 90, "status": "Top Performer"},
            {"name": "Arjun Verma",  "role": "Support",    "avatar": "AV", "kpi": 55, "completion": 48, "pitchScore": 52, "objectionScore": 45, "escalationScore": 60, "status": "Needs Training"},
            {"name": "Neha Singh",   "role": "Operations", "avatar": "NS", "kpi": 84, "completion": 88, "pitchScore": 79, "objectionScore": 83, "escalationScore": 87, "status": "On Track"},
            {"name": "Karan Patel",  "role": "Sales",      "avatar": "KP", "kpi": 77, "completion": 80, "pitchScore": 80, "objectionScore": 74, "escalationScore": 76, "status": "On Track"},
            {"name": "Simran Kaur",  "role": "Support",    "avatar": "SK", "kpi": 62, "completion": 65, "pitchScore": 60, "objectionScore": 58, "escalationScore": 67, "status": "At Risk"},
        ]
        now = datetime.utcnow()
        for m in team_data:
            m["created_at"] = now
            m["updated_at"] = now
        await tp_col.insert_many(team_data)
        await tp_col.create_index("name")
        tp_seeded = True
    else:
        tp_seeded = False

    # ── Leaderboard ────────────────────────────────────────────────────────────
    if await lb_col.count_documents({}) == 0:
        lb_data = [
            {"full_name": "Priya Mehta",  "role": "Sales",      "xp_points": 2840, "level": 5, "badges_count": 8, "streak_days": 14, "completion": 95, "kpi": 91},
            {"full_name": "Neha Singh",   "role": "Operations", "xp_points": 2310, "level": 4, "badges_count": 6, "streak_days": 9,  "completion": 88, "kpi": 84},
            {"full_name": "Karan Patel",  "role": "Sales",      "xp_points": 1950, "level": 3, "badges_count": 5, "streak_days": 7,  "completion": 80, "kpi": 77},
            {"full_name": "Raju Sharma",  "role": "Sales",      "xp_points": 1620, "level": 3, "badges_count": 4, "streak_days": 3,  "completion": 72, "kpi": 68},
            {"full_name": "Simran Kaur",  "role": "Support",    "xp_points": 1180, "level": 2, "badges_count": 3, "streak_days": 2,  "completion": 65, "kpi": 62},
            {"full_name": "Arjun Verma",  "role": "Support",    "xp_points": 890,  "level": 2, "badges_count": 2, "streak_days": 0,  "completion": 48, "kpi": 55},
        ]
        now = datetime.utcnow()
        for e in lb_data:
            e["created_at"] = now
            e["updated_at"] = now
        await lb_col.insert_many(lb_data)
        await lb_col.create_index([("xp_points", -1)])
        lb_seeded = True
    else:
        lb_seeded = False

    return {
        "message": "Dashboard seed complete",
        "team_progress_seeded": tp_seeded,
        "leaderboard_seeded": lb_seeded,
        "team_progress_count": await tp_col.count_documents({}),
        "leaderboard_count": await lb_col.count_documents({}),
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
    """List all real employee attendance records (filters out summary rows)."""
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


_LEAVE_SEED = [
    {"name": "Arjun Verma",  "avatar": "AV", "type": "Sick Leave",   "startDate": "Apr 15, 2025", "endDate": "Apr 17, 2025", "days": 3, "reason": "Fever and flu recovery.",                       "status": "pending",  "appliedDate": "Apr 13, 2025", "comment": None},
    {"name": "Karan Patel",  "avatar": "KP", "type": "Casual Leave", "startDate": "Apr 18, 2025", "endDate": "Apr 18, 2025", "days": 1, "reason": "Family function.",                               "status": "approved", "appliedDate": "Apr 12, 2025", "comment": "Approved. Enjoy!"},
    {"name": "Simran Kaur",  "avatar": "SK", "type": "Earned Leave",  "startDate": "Apr 22, 2025", "endDate": "Apr 26, 2025", "days": 5, "reason": "Annual vacation trip.",                          "status": "pending",  "appliedDate": "Apr 11, 2025", "comment": None},
    {"name": "Raju Sharma",  "avatar": "RS", "type": "Sick Leave",   "startDate": "Apr 05, 2025", "endDate": "Apr 06, 2025", "days": 2, "reason": "Migraine — doctor visit.",                       "status": "rejected", "appliedDate": "Apr 04, 2025", "comment": "Critical deadline week. Please reschedule."},
    {"name": "Neha Singh",   "avatar": "NS", "type": "Casual Leave", "startDate": "Apr 28, 2025", "endDate": "Apr 28, 2025", "days": 1, "reason": "Personal errand.",                               "status": "pending",  "appliedDate": "Apr 13, 2025", "comment": None},
    {"name": "Priya Mehta",  "avatar": "PM", "type": "Earned Leave",  "startDate": "May 05, 2025", "endDate": "May 09, 2025", "days": 5, "reason": "Pre-planned international trip.",                "status": "approved", "appliedDate": "Apr 20, 2025", "comment": "Approved — all targets met ahead of schedule."},
    {"name": "Raju Sharma",  "avatar": "RS", "type": "Casual Leave", "startDate": "May 02, 2025", "endDate": "May 02, 2025", "days": 1, "reason": "Attending sibling's wedding.",                   "status": "pending",  "appliedDate": "Apr 22, 2025", "comment": None},
    {"name": "Arjun Verma",  "avatar": "AV", "type": "Casual Leave", "startDate": "May 12, 2025", "endDate": "May 12, 2025", "days": 1, "reason": "Bank-related personal work.",                    "status": "pending",  "appliedDate": "Apr 23, 2025", "comment": None},
    {"name": "Simran Kaur",  "avatar": "SK", "type": "Sick Leave",   "startDate": "Apr 29, 2025", "endDate": "Apr 30, 2025", "days": 2, "reason": "Severe cold and sore throat.",                   "status": "approved", "appliedDate": "Apr 28, 2025", "comment": "Get well soon!"},
    {"name": "Neha Singh",   "avatar": "NS", "type": "Earned Leave",  "startDate": "May 19, 2025", "endDate": "May 23, 2025", "days": 5, "reason": "Annual family vacation.",                        "status": "pending",  "appliedDate": "Apr 25, 2025", "comment": None},
]


@router.get("/leave-requests", response_model=List[Dict[str, Any]])
async def list_leave_requests():
    """List all Leave_requests documents. Auto-seeds with demo data if collection is empty."""
    col = leave_requests_col()
    if await col.count_documents({}) == 0:
        now = datetime.utcnow()
        docs_to_insert = [{**r, "created_at": now, "updated_at": now} for r in _LEAVE_SEED]
        await col.insert_many(docs_to_insert)
        await col.create_index([("created_at", -1)])
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
