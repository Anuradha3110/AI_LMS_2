"""
Notifications Workspace Router — MongoDB
Employee-facing smart notification centre with AI-powered insights.
Collections: employee_notifications, notifications_ai_summary
Auto-seeds rich demo data if empty. Auto-syncs AI summary every 5 minutes.
"""
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from app.mongodb.connection import webx_db

router = APIRouter(prefix="/api/mongo/notifications", tags=["Notifications Workspace"])

_sync_task: Optional[asyncio.Task] = None


# ── Collection accessors ──────────────────────────────────────────────────────

def _notif_col():
    return webx_db()["employee_notifications"]


def _summary_col():
    return webx_db()["notifications_ai_summary"]


# ── Serialiser ────────────────────────────────────────────────────────────────

def _s(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _s(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_s(i) for i in obj]
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


# ── Seed data ─────────────────────────────────────────────────────────────────

_SEED_NOTIFICATIONS: List[Dict[str, Any]] = [
    {
        "category": "learning",
        "title": "Mandatory Cybersecurity Training Due Tomorrow",
        "description": "Your Cybersecurity Fundamentals course must be completed by tomorrow 5 PM. This is required for compliance. 68% of your cohort has already completed it — don't fall behind.",
        "priority": "high",
        "action_type": "start_course",
        "action_label": "Start Course",
        "due_date_offset_hours": 24,
        "sender_name": "Learning Admin",
        "sender_avatar": "LA",
        "is_read": False,
        "is_archived": False,
    },
    {
        "category": "ai",
        "title": "AI Recommends: Leadership & Management Certification",
        "description": "Based on your role trajectory, recent performance metrics, and learning history, our AI engine highly recommends the Leadership & Management Certification to accelerate your career growth.",
        "priority": "medium",
        "action_type": "start_course",
        "action_label": "View Course",
        "due_date_offset_hours": None,
        "sender_name": "AI Assistant",
        "sender_avatar": "AI",
        "is_read": False,
        "is_archived": False,
    },
    {
        "category": "hr",
        "title": "Company Townhall Scheduled — Friday 4 PM",
        "description": "All-hands meeting this Friday at 4 PM IST. The CEO will share Q3 results, growth plans, and open the floor for Q&A. Video conferencing link will be shared 30 mins before. Attendance is mandatory.",
        "priority": "high",
        "action_type": "view_calendar",
        "action_label": "Add to Calendar",
        "due_date_offset_hours": 72,
        "sender_name": "HR Team",
        "sender_avatar": "HR",
        "is_read": False,
        "is_archived": False,
    },
    {
        "category": "team",
        "title": "Manager Left Feedback on Your Assessment",
        "description": "Sarah Miller reviewed your Sales Pitch Simulation assessment and left detailed feedback. Your score improved by 12 points this month — great progress! Read the comments to understand areas for further growth.",
        "priority": "medium",
        "action_type": "view_feedback",
        "action_label": "View Feedback",
        "due_date_offset_hours": None,
        "sender_name": "Sarah Miller",
        "sender_avatar": "SM",
        "is_read": False,
        "is_archived": False,
    },
    {
        "category": "system",
        "title": "Password Reset Required — Security Compliance",
        "description": "Your password is 90+ days old and must be reset immediately to comply with your organization's security policy. This is required to maintain access to the platform.",
        "priority": "high",
        "action_type": "read_more",
        "action_label": "Reset Password",
        "due_date_offset_hours": 2,
        "sender_name": "Security System",
        "sender_avatar": "SS",
        "is_read": False,
        "is_archived": False,
    },
    {
        "category": "hr",
        "title": "Annual Performance Review Period Open",
        "description": "The Q4 annual performance review is now open. Complete your self-assessment by December 31. Your responses will be reviewed by your manager within 5 business days. Be thorough and honest.",
        "priority": "high",
        "action_type": "read_more",
        "action_label": "Start Review",
        "due_date_offset_hours": 336,
        "sender_name": "HR Team",
        "sender_avatar": "HR",
        "is_read": False,
        "is_archived": False,
    },
    {
        "category": "learning",
        "title": "New Course Available: Advanced Data Analysis with Python",
        "description": "The 'Advanced Data Analysis with Python' course is now live in your learning library. Highly recommended for Operations team members. Earn 50 XP upon completion.",
        "priority": "low",
        "action_type": "start_course",
        "action_label": "Enroll Now",
        "due_date_offset_hours": None,
        "sender_name": "Learning Admin",
        "sender_avatar": "LA",
        "is_read": True,
        "is_archived": False,
    },
    {
        "category": "team",
        "title": "Team Sprint Review — Monday 10 AM",
        "description": "Your team's weekly sprint review is scheduled for Monday 10 AM. Please prepare a brief 3-minute progress update covering your 3 assigned modules and any blockers you face.",
        "priority": "medium",
        "action_type": "view_calendar",
        "action_label": "Add to Calendar",
        "due_date_offset_hours": 48,
        "sender_name": "Team Lead",
        "sender_avatar": "TL",
        "is_read": True,
        "is_archived": False,
    },
    {
        "category": "ai",
        "title": "Skill Gap Detected: Business Communication",
        "description": "AI analysis of your last 3 assessments reveals a skill gap in business communication. Employees who addressed this gap saw 34% better performance reviews. We recommend the Executive Communication course.",
        "priority": "medium",
        "action_type": "start_course",
        "action_label": "Start Learning",
        "due_date_offset_hours": None,
        "sender_name": "AI Assistant",
        "sender_avatar": "AI",
        "is_read": True,
        "is_archived": False,
    },
    {
        "category": "system",
        "title": "Platform Maintenance — Sunday 2 AM to 4 AM",
        "description": "Scheduled platform maintenance this Sunday from 2 AM to 4 AM IST. The learning platform will be unavailable during this window. Please save your progress before the maintenance window starts.",
        "priority": "low",
        "action_type": "read_more",
        "action_label": "Read More",
        "due_date_offset_hours": 96,
        "sender_name": "System Admin",
        "sender_avatar": "SY",
        "is_read": True,
        "is_archived": False,
    },
    {
        "category": "learning",
        "title": "Course Deadline Extended: Operations Fundamentals",
        "description": "Good news! The deadline for Operations Fundamentals has been extended by 7 days following popular request. You now have until next Friday to complete the remaining 3 modules.",
        "priority": "low",
        "action_type": "start_course",
        "action_label": "Resume Course",
        "due_date_offset_hours": 168,
        "sender_name": "Learning Admin",
        "sender_avatar": "LA",
        "is_read": True,
        "is_archived": False,
    },
    {
        "category": "ai",
        "title": "You're on a 5-Day Learning Streak!",
        "description": "Impressive consistency! You've logged learning activity for 5 consecutive days. Keep it up and earn the 'Learning Champion' badge by end of this week. You're in the top 15% of active learners this month.",
        "priority": "low",
        "action_type": "start_course",
        "action_label": "Continue Streak",
        "due_date_offset_hours": None,
        "sender_name": "AI Assistant",
        "sender_avatar": "AI",
        "is_read": True,
        "is_archived": False,
    },
    {
        "category": "team",
        "title": "Peer Recognition: Outstanding Contribution",
        "description": "Your colleague James Wilson has recognised your outstanding contribution to the Q3 Sales training rollout. You've been nominated for the 'Team Player of the Month' award.",
        "priority": "low",
        "action_type": "view_feedback",
        "action_label": "View Recognition",
        "due_date_offset_hours": None,
        "sender_name": "James Wilson",
        "sender_avatar": "JW",
        "is_read": True,
        "is_archived": False,
    },
]

_SEED_SUMMARY: Dict[str, Any] = {
    "urgent_tasks": [
        {"title": "Complete Cybersecurity Training", "due": "Tomorrow 5 PM", "priority": "high"},
        {"title": "Password Reset Required", "due": "Today", "priority": "high"},
        {"title": "Annual Performance Self-Review", "due": "Dec 31", "priority": "high"},
    ],
    "deadlines_approaching": [
        {"title": "Cybersecurity Fundamentals", "deadline": "Tomorrow", "course": "Security"},
        {"title": "Operations Fundamentals", "deadline": "Next Friday", "course": "Operations"},
        {"title": "Leadership Certification", "deadline": "End of Month", "course": "Leadership"},
    ],
    "suggested_course": {
        "title": "Leadership & Management Certification",
        "reason": "Matches your role trajectory and recent performance metrics — 89% of promoted employees completed this.",
        "category": "Leadership",
        "duration": "4 weeks · 12 lessons",
    },
    "productivity_tip": "Block 30 minutes each morning for focused learning. Employees who follow this routine complete 2.4x more courses and receive better performance scores.",
    "skill_opportunities": [
        "Advanced Communication — High demand in your department",
        "Data-Driven Decision Making — Aligns with your promotion path",
        "Project Management Basics — 3 colleagues completed this recently",
    ],
    "low_engagement_reminder": "Your learning activity is below this week's target. Complete one module today to stay on track and maintain your streak!",
    "promotion_ready": "You're 78% ready for a Senior role. Complete 2 more certifications to qualify for the next promotion cycle.",
}


async def _seed_if_empty():
    col = _notif_col()
    count = await col.count_documents({})
    if count == 0:
        now = datetime.utcnow()
        docs = []
        for i, n in enumerate(_SEED_NOTIFICATIONS):
            offset = n.get("due_date_offset_hours")
            doc = {k: v for k, v in n.items() if k != "due_date_offset_hours"}
            doc.update({
                "employee_id": "all",
                "due_date": (now + timedelta(hours=offset)).isoformat() if offset else None,
                "created_at": now - timedelta(hours=i * 3),
                "updated_at": now - timedelta(hours=i * 3),
            })
            docs.append(doc)
        await col.insert_many(docs)

    scol = _summary_col()
    scount = await scol.count_documents({})
    if scount == 0:
        await scol.insert_one({
            **_SEED_SUMMARY,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })


# ── Background auto-sync ──────────────────────────────────────────────────────

async def _auto_sync_loop():
    while True:
        try:
            await _seed_if_empty()
            scol = _summary_col()
            await scol.update_one(
                {},
                {"$set": {"updated_at": datetime.utcnow()}},
                upsert=False,
            )
        except Exception:
            pass
        await asyncio.sleep(300)


def start_auto_sync():
    global _sync_task
    if _sync_task is None or _sync_task.done():
        _sync_task = asyncio.ensure_future(_auto_sync_loop())


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/list")
async def list_notifications(
    skip: int = Query(0),
    limit: int = Query(100),
):
    """Return all non-archived notifications with counts per category."""
    await _seed_if_empty()
    col = _notif_col()

    total   = await col.count_documents({"is_archived": False})
    unread  = await col.count_documents({"is_archived": False, "is_read": False})
    urgent  = await col.count_documents({"is_archived": False, "priority": "high"})

    cat_counts: Dict[str, int] = {}
    for cat in ["learning", "hr", "team", "ai", "system"]:
        cat_counts[cat] = await col.count_documents({"is_archived": False, "category": cat})

    cursor = (
        col.find({"is_archived": False})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)

    return {
        "notifications": _s(docs),
        "total": total,
        "unread": unread,
        "urgent": urgent,
        "category_counts": cat_counts,
    }


@router.patch("/{notif_id}/read")
async def mark_read(notif_id: str):
    col = _notif_col()
    try:
        result = await col.update_one(
            {"_id": ObjectId(notif_id)},
            {"$set": {"is_read": True, "updated_at": datetime.utcnow()}},
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


@router.post("/mark-all-read")
async def mark_all_read():
    col = _notif_col()
    await col.update_many(
        {"is_read": False, "is_archived": False},
        {"$set": {"is_read": True, "updated_at": datetime.utcnow()}},
    )
    return {"success": True}


@router.patch("/{notif_id}/archive")
async def archive_notification(notif_id: str):
    col = _notif_col()
    try:
        result = await col.update_one(
            {"_id": ObjectId(notif_id)},
            {"$set": {"is_archived": True, "updated_at": datetime.utcnow()}},
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


@router.get("/ai-summary")
async def get_ai_summary():
    await _seed_if_empty()
    scol = _summary_col()
    doc = await scol.find_one({})
    if not doc:
        return _s({**_SEED_SUMMARY, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()})
    return _s(doc)


@router.post("/sync")
async def sync_notifications():
    await _seed_if_empty()
    scol = _summary_col()
    await scol.update_one(
        {},
        {"$set": {"updated_at": datetime.utcnow()}},
        upsert=False,
    )
    col = _notif_col()
    total  = await col.count_documents({"is_archived": False})
    unread = await col.count_documents({"is_archived": False, "is_read": False})
    return {"success": True, "total": total, "unread": unread, "synced_at": datetime.utcnow().isoformat()}
