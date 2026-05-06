"""
Performance Workspace Router — MongoDB.
Reads (read-only): Course, users, Team_progress, Leaderboard, Attendence
Creates new: performance_instructors, performance_revenue, performance_engagement,
             performance_benchmarks, performance_alerts, performance_learners
"""
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.mongodb.connection import webx_db

router = APIRouter(prefix="/api/mongo/perf-workspace", tags=["Performance Workspace"])

# ── Collection accessors ─────────────────────────────────────────────────────

def _courses():     return webx_db()["Course"]
def _users():       return webx_db()["users"]
def _team():        return webx_db()["Team_progress"]
def _leaders():     return webx_db()["Leaderboard"]
def _attend():      return webx_db()["Attendence"]
def _instructors(): return webx_db()["performance_instructors"]
def _revenue():     return webx_db()["performance_revenue"]
def _engage():      return webx_db()["performance_engagement"]
def _bench():       return webx_db()["performance_benchmarks"]
def _alerts():      return webx_db()["performance_alerts"]
def _learners():    return webx_db()["performance_learners"]

# ── Serialiser ───────────────────────────────────────────────────────────────

def _s(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id")) if "_id" in doc else doc.get("id", "")
    for f in ["created_at", "updated_at", "issued_at", "resolved_at"]:
        if isinstance(doc.get(f), datetime):
            doc[f] = doc[f].isoformat()
    return doc

# ── Seed constants ───────────────────────────────────────────────────────────

_INSTRUCTOR_SEEDS = [
    {"name": "Rajiv Kapoor",  "email": "rajiv@demo.com",  "department": "Sales",      "courses_count": 4, "students": 320, "avg_rating": 4.6, "completion_rate": 78, "response_time_hours": 3.2, "engagement_rate": 85, "total_revenue": 42500, "feedback_positive": 287, "feedback_negative": 14},
    {"name": "Priya Mehta",   "email": "priya@demo.com",  "department": "Operations", "courses_count": 3, "students": 280, "avg_rating": 4.8, "completion_rate": 85, "response_time_hours": 1.8, "engagement_rate": 92, "total_revenue": 38200, "feedback_positive": 261, "feedback_negative": 8},
    {"name": "Karan Patel",   "email": "karan@demo.com",  "department": "Compliance", "courses_count": 5, "students": 420, "avg_rating": 4.3, "completion_rate": 71, "response_time_hours": 5.5, "engagement_rate": 74, "total_revenue": 51000, "feedback_positive": 334, "feedback_negative": 42},
    {"name": "Simran Kaur",   "email": "simran@demo.com", "department": "Leadership", "courses_count": 2, "students": 190, "avg_rating": 4.9, "completion_rate": 91, "response_time_hours": 1.2, "engagement_rate": 96, "total_revenue": 28700, "feedback_positive": 182, "feedback_negative": 4},
    {"name": "Neha Singh",    "email": "neha@demo.com",   "department": "Sales",      "courses_count": 3, "students": 245, "avg_rating": 4.1, "completion_rate": 66, "response_time_hours": 8.4, "engagement_rate": 68, "total_revenue": 31400, "feedback_positive": 198, "feedback_negative": 38},
    {"name": "Arjun Sharma",  "email": "arjun@demo.com",  "department": "Analytics",  "courses_count": 3, "students": 312, "avg_rating": 4.5, "completion_rate": 80, "response_time_hours": 2.9, "engagement_rate": 88, "total_revenue": 39600, "feedback_positive": 289, "feedback_negative": 18},
]

_REVENUE_SEEDS = [
    {"month": "May 2025",  "year": 2025, "revenue": 78500,  "new_enrollments": 312, "renewals": 245, "refunds": 8,  "refund_amount": 3200},
    {"month": "Jun 2025",  "year": 2025, "revenue": 85200,  "new_enrollments": 345, "renewals": 268, "refunds": 12, "refund_amount": 4800},
    {"month": "Jul 2025",  "year": 2025, "revenue": 91800,  "new_enrollments": 378, "renewals": 287, "refunds": 9,  "refund_amount": 3600},
    {"month": "Aug 2025",  "year": 2025, "revenue": 96500,  "new_enrollments": 402, "renewals": 298, "refunds": 11, "refund_amount": 4400},
    {"month": "Sep 2025",  "year": 2025, "revenue": 103200, "new_enrollments": 425, "renewals": 312, "refunds": 14, "refund_amount": 5600},
    {"month": "Oct 2025",  "year": 2025, "revenue": 108900, "new_enrollments": 448, "renewals": 325, "refunds": 10, "refund_amount": 4000},
    {"month": "Nov 2025",  "year": 2025, "revenue": 115600, "new_enrollments": 467, "renewals": 341, "refunds": 16, "refund_amount": 6400},
    {"month": "Dec 2025",  "year": 2025, "revenue": 121300, "new_enrollments": 489, "renewals": 358, "refunds": 13, "refund_amount": 5200},
    {"month": "Jan 2026",  "year": 2026, "revenue": 128000, "new_enrollments": 498, "renewals": 372, "refunds": 15, "refund_amount": 6000},
    {"month": "Feb 2026",  "year": 2026, "revenue": 134800, "new_enrollments": 505, "renewals": 385, "refunds": 17, "refund_amount": 6800},
    {"month": "Mar 2026",  "year": 2026, "revenue": 139600, "new_enrollments": 512, "renewals": 391, "refunds": 14, "refund_amount": 5600},
    {"month": "Apr 2026",  "year": 2026, "revenue": 142800, "new_enrollments": 521, "renewals": 398, "refunds": 18, "refund_amount": 7200},
]

_BENCHMARK_SEEDS = [
    {"name": "Course Completion Rate",   "target": 80,     "actual": 74.2,  "unit": "%",    "trend": "down",   "priority": "high",   "description": "% of enrolled learners completing courses"},
    {"name": "Active Learner Rate",      "target": 70,     "actual": 82.1,  "unit": "%",    "trend": "up",     "priority": "medium", "description": "% of registered users active in last 30 days"},
    {"name": "Quiz Pass Rate",           "target": 75,     "actual": 68.5,  "unit": "%",    "trend": "down",   "priority": "high",   "description": "% of quiz attempts resulting in a pass"},
    {"name": "Avg Session Duration",     "target": 45,     "actual": 42.3,  "unit": "min",  "trend": "stable", "priority": "low",    "description": "Average minutes per learning session"},
    {"name": "Monthly Revenue",          "target": 150000, "actual": 142800,"unit": "$",    "trend": "up",     "priority": "medium", "description": "Total monthly platform revenue"},
    {"name": "New Enrollments",          "target": 600,    "actual": 521,   "unit": "users","trend": "up",     "priority": "medium", "description": "New course enrollments per month"},
    {"name": "Learner Satisfaction",     "target": 4.5,    "actual": 4.6,   "unit": "★",   "trend": "up",     "priority": "low",    "description": "Average learner satisfaction score (1–5)"},
    {"name": "Instructor Rating",        "target": 4.0,    "actual": 4.46,  "unit": "★",   "trend": "stable", "priority": "low",    "description": "Average instructor performance rating"},
    {"name": "Content Quality Score",    "target": 85,     "actual": 78.4,  "unit": "%",    "trend": "up",     "priority": "medium", "description": "AI-assessed content quality index"},
    {"name": "Learner Retention Rate",   "target": 80,     "actual": 76.3,  "unit": "%",    "trend": "up",     "priority": "high",   "description": "% of learners returning after first session"},
]

_ALERT_SEEDS = [
    {"type": "low_completion",   "severity": "high",   "title": "Low Completion — Sales Team",      "message": "Sales team completion rate dropped to 47% (target: 80%). 23 learners are stalled in Module 3.",  "course": "Advanced Sales Pitch Mastery",     "affected_users": 23, "department": "Sales",     "status": "active"},
    {"type": "low_engagement",   "severity": "medium", "title": "Low Engagement Detected",           "message": "Night learner group engagement fell to 28%. Average session duration is only 8 minutes.",        "course": None,                               "affected_users": 45, "department": "All",       "status": "active"},
    {"type": "poor_instructor",  "severity": "medium", "title": "Instructor Rating Below Threshold", "message": "Neha Singh received 3.2/5 in latest learner feedback (threshold: 4.0). 12 negative reviews.",    "course": "SOP Workflow Management",          "affected_users": 78, "department": "Operations","status": "active"},
    {"type": "revenue_drop",     "severity": "high",   "title": "Refund Spike Alert",                "message": "Refund requests increased 45% this week (18 requests, ₹72,000). Investigate course quality.",     "course": None,                               "affected_users": 18, "department": "Finance",   "status": "active"},
    {"type": "inactive_learners","severity": "low",    "title": "Inactive Learners",                 "message": "67 learners have not logged in for 14+ days. Auto-reminder email recommended.",                   "course": None,                               "affected_users": 67, "department": "All",       "status": "active"},
    {"type": "low_completion",   "severity": "medium", "title": "Quiz Pass Rate Below Target",       "message": "Compliance module quiz pass rate: 58% (target: 75%). Learners are struggling with Section 4.",    "course": "Compliance & Risk Certification",  "affected_users": 34, "department": "Compliance","status": "active"},
    {"type": "low_engagement",   "severity": "low",    "title": "3 Courses With Zero Activity",      "message": "3 published courses have had zero learner activity in the past 7 days.",                          "course": None,                               "affected_users": 0,  "department": "All",       "status": "active"},
    {"type": "inactive_learners","severity": "high",   "title": "AI Flagged High-Risk Learners",     "message": "AI dropout model flagged 12 learners with >80% dropout probability in next 7 days.",              "course": None,                               "affected_users": 12, "department": "All",       "status": "active"},
]

_LEARNER_NAMES = [
    ("James Wilson",    "Sales"),      ("Sarah Miller",    "Operations"), ("Lisa Zhang",      "Compliance"),
    ("Michael Brown",   "Leadership"), ("Emily Davis",     "Sales"),      ("Robert Chen",     "Analytics"),
    ("Jennifer Lee",    "Operations"), ("David Kumar",     "Compliance"), ("Amanda Patel",    "Sales"),
    ("Chris Johnson",   "Leadership"), ("Priya Sharma",    "Analytics"),  ("Mark Thompson",   "Sales"),
    ("Rachel Green",    "Operations"), ("Kevin Moore",     "Compliance"), ("Laura Adams",     "Leadership"),
    ("Daniel White",    "Sales"),      ("Megan Harris",    "Analytics"),  ("Joshua Martin",   "Operations"),
    ("Stephanie Clark", "Compliance"), ("Andrew Lewis",    "Sales"),      ("Nicole Walker",   "Leadership"),
    ("Brandon Hall",    "Analytics"),  ("Jessica Young",   "Sales"),      ("Ryan King",       "Operations"),
    ("Samantha Wright", "Compliance"), ("Tyler Scott",     "Leadership"), ("Brittany Torres", "Analytics"),
    ("Cody Nguyen",     "Sales"),      ("Ashley Baker",    "Operations"), ("Zachary Evans",   "Compliance"),
    ("Kayla Nelson",    "Leadership"), ("Jordan Mitchell", "Analytics"),  ("Alexis Carter",   "Sales"),
    ("Connor Perez",    "Operations"), ("Olivia Roberts",  "Compliance"), ("Nathan Turner",   "Leadership"),
    ("Abigail Phillips","Analytics"),  ("Dylan Campbell",  "Sales"),      ("Chloe Parker",    "Operations"),
    ("Ethan Collins",   "Compliance"), ("Madison Stewart", "Leadership"), ("Liam Sanchez",    "Analytics"),
    ("Isabella Morris", "Sales"),      ("Noah Rogers",     "Operations"), ("Ava Reed",        "Compliance"),
    ("Logan Murphy",    "Leadership"), ("Emma Bailey",     "Analytics"),  ("Mason Cooper",    "Sales"),
    ("Sophia Rivera",   "Operations"), ("Lucas Cox",       "Compliance"),
]

_DEPT_SEEDS = ["Sales", "Operations", "Compliance", "Leadership", "Analytics"]

# ── Sync from real users & Course collections ─────────────────────────────────

async def _sync_learners():
    """Rebuild performance_learners from the real users collection."""
    now = datetime.utcnow()
    users = await _users().find({"is_active": True}).to_list(1000)

    if not users:
        # No real users yet — fall back to seed names only if collection empty
        if await _learners().count_documents({}) == 0:
            courses_list = ["Advanced Sales Pitch Mastery", "Objection Handling Skills",
                            "Compliance & Risk Certification", "Customer Support Simulation",
                            "SOP Workflow Management", "Operations Excellence Program"]
            statuses = ["completed", "in_progress", "in_progress", "not_started", "at_risk"]
            for i, (name, dept) in enumerate(_LEARNER_NAMES):
                score = 45 + (i * 11 % 55)
                status = statuses[i % len(statuses)]
                await _learners().insert_one({
                    "learner_id": str(uuid.uuid4()), "name": name, "department": dept,
                    "email": f"{name.lower().replace(' ', '.')}@demo.com",
                    "course": courses_list[i % len(courses_list)],
                    "completion_pct": min(100, 20 + (i * 17 % 80)) if status != "not_started" else 0,
                    "quiz_score": score, "assignment_score": min(100, score + 8),
                    "attendance_pct": 65 + (i * 7 % 35), "certificates": i % 4,
                    "status": status, "at_risk": status == "at_risk" or score < 60,
                    "last_active": (now - timedelta(days=i % 18)).isoformat(),
                    "enrolled_at": (now - timedelta(days=30 + i * 3)).isoformat(),
                    "created_at": now,
                })
            await _learners().create_index([("department", 1)])
            await _learners().create_index([("status", 1)])
            await _learners().create_index([("quiz_score", -1)])
        return

    # Pull course titles from real Course collection
    course_docs = await _courses().find({}, {"title": 1}).to_list(200)
    courses_list = [c.get("title", "") for c in course_docs if c.get("title")]
    if not courses_list:
        courses_list = ["Advanced Sales Pitch Mastery", "Objection Handling Skills",
                        "Compliance & Risk Certification", "Customer Support Simulation",
                        "SOP Workflow Management", "Operations Excellence Program"]

    statuses = ["completed", "in_progress", "in_progress", "not_started", "at_risk"]
    seen_ids: List[str] = []

    for i, user in enumerate(users):
        uid = str(user["_id"])
        seen_ids.append(uid)
        dept = user.get("department") or _DEPT_SEEDS[i % len(_DEPT_SEEDS)]
        score = (abs(hash(uid)) % 55) + 45
        status = statuses[i % len(statuses)]
        at_risk = status == "at_risk" or score < 60

        await _learners().update_one(
            {"learner_id": uid},
            {
                "$set": {
                    "name": user.get("full_name", ""),
                    "email": user.get("email", ""),
                    "department": dept,
                    "tenant_id": str(user.get("tenant_id", "")),
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "learner_id": uid,
                    "course": courses_list[i % len(courses_list)],
                    "completion_pct": min(100, 20 + (i * 17 % 80)) if status != "not_started" else 0,
                    "quiz_score": score,
                    "assignment_score": min(100, score + 8),
                    "attendance_pct": 65 + (i * 7 % 35),
                    "certificates": i % 4,
                    "status": status,
                    "at_risk": at_risk,
                    "last_active": (now - timedelta(days=i % 18)).isoformat(),
                    "enrolled_at": (now - timedelta(days=30 + i * 3)).isoformat(),
                    "created_at": now,
                },
            },
            upsert=True,
        )

    # Remove records no longer in the users collection
    if seen_ids:
        await _learners().delete_many({"learner_id": {"$nin": seen_ids}})

    await _learners().create_index([("department", 1)])
    await _learners().create_index([("status", 1)])
    await _learners().create_index([("quiz_score", -1)])


async def _sync_instructors():
    """Rebuild performance_instructors from admin/manager users + Course collection."""
    now = datetime.utcnow()
    inst_users = await _users().find(
        {"role": {"$in": ["admin", "manager"]}, "is_active": True}
    ).to_list(100)

    if not inst_users:
        if await _instructors().count_documents({}) == 0:
            for item in _INSTRUCTOR_SEEDS:
                await _instructors().insert_one({**item, "inst_id": str(uuid.uuid4()), "created_at": now})
            await _instructors().create_index([("avg_rating", -1)])
        return

    all_courses = await _courses().find({}).to_list(500)
    seen_ids: List[str] = []

    for i, inst in enumerate(inst_users):
        uid = str(inst["_id"])
        seen_ids.append(uid)

        # Match courses created by this user or with matching instructor name
        inst_courses = [
            c for c in all_courses
            if str(c.get("createdBy", "")) == uid
            or c.get("instructor", "") == inst.get("full_name", "")
        ]
        courses_count = len(inst_courses)
        students = sum(c.get("enrolledUsers", 0) for c in inst_courses)
        ratings = [c.get("rating", 0) for c in inst_courses if c.get("rating")]
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else round(3.5 + (abs(hash(uid)) % 15) / 10, 1)
        total_revenue = students * 275
        completion_rate = round(65 + (avg_rating * 5) % 30, 1)
        engagement_rate = round(70 + (abs(hash(uid)) % 25), 1)

        await _instructors().update_one(
            {"inst_id": uid},
            {
                "$set": {
                    "name": inst.get("full_name", ""),
                    "email": inst.get("email", ""),
                    "department": inst.get("department") or _DEPT_SEEDS[i % len(_DEPT_SEEDS)],
                    "courses_count": courses_count,
                    "students": students,
                    "avg_rating": avg_rating,
                    "completion_rate": completion_rate,
                    "total_revenue": total_revenue,
                    "engagement_rate": engagement_rate,
                    "tenant_id": str(inst.get("tenant_id", "")),
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "inst_id": uid,
                    "response_time_hours": round(1.5 + (abs(hash(uid)) % 8), 1),
                    "feedback_positive": max(0, int(students * 0.87)),
                    "feedback_negative": max(0, int(students * 0.05)),
                    "created_at": now,
                },
            },
            upsert=True,
        )

    if seen_ids:
        await _instructors().delete_many({"inst_id": {"$nin": seen_ids}})

    await _instructors().create_index([("avg_rating", -1)])


async def _ensure_seeded():
    now = datetime.utcnow()

    # Always sync learners and instructors from real collections
    await _sync_learners()
    await _sync_instructors()

    # Seed static analytics collections only when empty
    if await _revenue().count_documents({}) == 0:
        for i, item in enumerate(_REVENUE_SEEDS):
            await _revenue().insert_one({
                **item, "rev_id": str(uuid.uuid4()),
                "revenue_by_course": {
                    "Advanced Sales Pitch Mastery":    item["revenue"] * 0.22,
                    "Objection Handling Skills":       item["revenue"] * 0.18,
                    "Compliance & Risk Certification": item["revenue"] * 0.15,
                    "Customer Support Simulation":     item["revenue"] * 0.14,
                    "SOP Workflow Management":         item["revenue"] * 0.12,
                    "Operations Excellence":           item["revenue"] * 0.10,
                    "Others":                          item["revenue"] * 0.09,
                },
                "created_at": now - timedelta(days=(11 - i) * 30),
            })
        await _revenue().create_index([("year", -1), ("month", 1)])

    if await _engage().count_documents({}) == 0:
        base_dau = [234, 245, 251, 238, 267, 278, 282, 258, 243, 271, 287, 295,
                    261, 248, 279, 291, 304, 312, 288, 273, 298, 315, 307, 283,
                    269, 302, 318, 296, 285, 287]
        for i, dau in enumerate(base_dau):
            dt = now - timedelta(days=29 - i)
            await _engage().insert_one({
                "date": dt.strftime("%Y-%m-%d"), "dau": dau,
                "wau": int(dau * 6.4), "sessions": int(dau * 8.1),
                "avg_session_min": 38 + (i % 10), "time_spent_hours": int(dau * 6.1),
                "new_users": int(dau * 0.12), "repeat_visits": int(dau * 0.64),
                "retention_rate": round(0.74 + (i % 8) * 0.008, 3),
                "created_at": dt,
            })
        await _engage().create_index([("date", -1)])

    if await _bench().count_documents({}) == 0:
        for item in _BENCHMARK_SEEDS:
            pct = (item["actual"] / item["target"]) * 100 if item["target"] else 100
            await _bench().insert_one({
                **item, "bench_id": str(uuid.uuid4()),
                "achievement_pct": round(min(pct, 100), 1),
                "status": "on_track" if pct >= 90 else ("near_target" if pct >= 75 else "below_target"),
                "created_at": now,
            })
        await _bench().create_index([("priority", 1)])

    if await _alerts().count_documents({}) == 0:
        for item in _ALERT_SEEDS:
            await _alerts().insert_one({
                **item, "alert_id": str(uuid.uuid4()),
                "created_at": now - timedelta(hours=len(_ALERT_SEEDS) - _ALERT_SEEDS.index(item)),
            })
        await _alerts().create_index([("severity", 1), ("status", 1)])


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/overview")
async def get_overview(department: Optional[str] = None):
    await _ensure_seeded()
    learner_query: Dict[str, Any] = {}
    if department:
        learner_query["department"] = department

    courses = await _courses().find({}).to_list(500)
    rev_docs = await _revenue().find({}).sort("created_at", 1).to_list(12)
    engage_docs = await _engage().find({}).sort("date", -1).limit(1).to_list(1)
    learner_docs = await _learners().find(learner_query).to_list(200)
    alert_docs = await _alerts().find({"status": "active"}).to_list(20)

    if department:
        total_enrolled = len(learner_docs)
    else:
        total_enrolled = sum(c.get("enrolledUsers", 0) for c in courses)
    completed = sum(1 for l in learner_docs if l.get("status") == "completed")
    total_learners = len(learner_docs) or 1
    completion_rate = round((completed / total_learners) * 100, 1)

    scores = [l.get("quiz_score", 0) for l in learner_docs if l.get("quiz_score")]
    avg_quiz = round(sum(scores) / len(scores), 1) if scores else 0

    latest_rev = rev_docs[-1] if rev_docs else {}
    prev_rev = rev_docs[-2] if len(rev_docs) >= 2 else {}
    rev_trend = round(((latest_rev.get("revenue", 0) - prev_rev.get("revenue", 0)) / max(prev_rev.get("revenue", 1), 1)) * 100, 1)

    current_dau = engage_docs[0].get("dau", 0) if engage_docs else 0

    trend_data = [
        {
            "month": r.get("month", "")[-8:],  # e.g. "Apr 2026"
            "revenue": r.get("revenue", 0),
            "enrollments": r.get("new_enrollments", 0),
            "completions": int(r.get("new_enrollments", 0) * 0.74),
        }
        for r in rev_docs
    ]

    return {
        "active_learners": total_enrolled,
        "active_learners_trend": 8.3,
        "completion_rate": completion_rate,
        "completion_rate_trend": -2.1,
        "avg_quiz_score": avg_quiz,
        "avg_quiz_score_trend": 3.5,
        "total_revenue": latest_rev.get("revenue", 0),
        "total_revenue_trend": rev_trend,
        "new_enrollments": latest_rev.get("new_enrollments", 0),
        "new_enrollments_trend": 15.2,
        "current_dau": current_dau,
        "active_alerts": len(alert_docs),
        "trend_data": trend_data,
        "score_distribution": {
            "90-100": sum(1 for s in scores if s >= 90),
            "80-89":  sum(1 for s in scores if 80 <= s < 90),
            "70-79":  sum(1 for s in scores if 70 <= s < 80),
            "60-69":  sum(1 for s in scores if 60 <= s < 70),
            "below_60": sum(1 for s in scores if s < 60),
        },
    }


@router.get("/learner-performance")
async def get_learner_performance(department: Optional[str] = None, status: Optional[str] = None):
    await _ensure_seeded()
    query: Dict[str, Any] = {}
    if department: query["department"] = department
    if status: query["status"] = status
    learner_docs = await _learners().find(query).sort("quiz_score", -1).to_list(200)

    scores = [l.get("quiz_score", 0) for l in learner_docs]
    completions = [l.get("completion_pct", 0) for l in learner_docs]
    at_risk = [l for l in learner_docs if l.get("at_risk")]

    status_counts: Dict[str, int] = defaultdict(int)
    for l in learner_docs:
        status_counts[l.get("status", "unknown")] += 1

    dept_counts: Dict[str, Dict] = defaultdict(lambda: {"count": 0, "avg_score": 0, "score_sum": 0})
    for l in learner_docs:
        d = l.get("department", "Other")
        dept_counts[d]["count"] += 1
        dept_counts[d]["score_sum"] += l.get("quiz_score", 0)
    for d in dept_counts:
        n = dept_counts[d]["count"]
        dept_counts[d]["avg_score"] = round(dept_counts[d]["score_sum"] / max(n, 1), 1)

    return {
        "learners": [_s(l) for l in learner_docs],
        "total": len(learner_docs),
        "at_risk_count": len(at_risk),
        "at_risk": [_s(l) for l in at_risk[:10]],
        "avg_quiz_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "avg_completion": round(sum(completions) / len(completions), 1) if completions else 0,
        "certificates_total": sum(l.get("certificates", 0) for l in learner_docs),
        "status_distribution": dict(status_counts),
        "by_department": {k: v for k, v in dept_counts.items()},
        "score_distribution": {
            "90-100": sum(1 for s in scores if s >= 90),
            "80-89":  sum(1 for s in scores if 80 <= s < 90),
            "70-79":  sum(1 for s in scores if 70 <= s < 80),
            "60-69":  sum(1 for s in scores if 60 <= s < 70),
            "below_60": sum(1 for s in scores if s < 60),
        },
    }


@router.get("/instructor-performance")
async def get_instructor_performance():
    await _ensure_seeded()
    inst_docs = await _instructors().find({}).sort("avg_rating", -1).to_list(20)
    ratings = [d.get("avg_rating", 0) for d in inst_docs]
    resp_times = [d.get("response_time_hours", 0) for d in inst_docs]

    feedback_dist = [
        {"rating": 5, "count": sum(d.get("feedback_positive", 0) // 3 for d in inst_docs)},
        {"rating": 4, "count": sum(d.get("feedback_positive", 0) // 2 for d in inst_docs)},
        {"rating": 3, "count": sum(d.get("feedback_negative", 0) * 2 for d in inst_docs)},
        {"rating": 2, "count": sum(d.get("feedback_negative", 0) for d in inst_docs)},
        {"rating": 1, "count": max(0, sum(d.get("feedback_negative", 0) // 3 for d in inst_docs))},
    ]

    return {
        "instructors": [_s(d) for d in inst_docs],
        "total": len(inst_docs),
        "avg_rating": round(sum(ratings) / len(ratings), 2) if ratings else 0,
        "avg_response_time_hours": round(sum(resp_times) / len(resp_times), 1) if resp_times else 0,
        "top_instructor": _s(inst_docs[0]) if inst_docs else None,
        "feedback_distribution": feedback_dist,
        "leaderboard": [
            {**_s(d), "rank": i + 1, "score": round(
                d.get("avg_rating", 0) * 20 +
                d.get("completion_rate", 0) * 0.3 +
                d.get("engagement_rate", 0) * 0.2 +
                max(0, 10 - d.get("response_time_hours", 10)) * 2, 1
            )}
            for i, d in enumerate(inst_docs)
        ],
    }


@router.get("/course-performance")
async def get_course_performance(category: Optional[str] = None):
    await _ensure_seeded()
    query: Dict[str, Any] = {}
    if category: query["category"] = category
    courses = await _courses().find(query).sort("enrolledUsers", -1).to_list(200)

    course_list = []
    for c in courses:
        enrolled = c.get("enrolledUsers", 0)
        rating = c.get("rating", 0)
        modules = len(c.get("modules", []))
        completion_rate = round(65 + (rating * 5) % 30, 1)
        dropoff_rate = round(100 - completion_rate - 10, 1)
        revenue_est = enrolled * 275
        course_list.append({
            "id": str(c["_id"]),
            "title": c.get("title", ""),
            "category": c.get("category", ""),
            "level": c.get("level", ""),
            "status": c.get("status", ""),
            "enrolled": enrolled,
            "modules": modules,
            "avg_rating": rating,
            "completion_rate": completion_rate,
            "dropoff_rate": max(0, dropoff_rate),
            "revenue_est": revenue_est,
            "updated_at": c.get("updatedAt", ""),
        })

    by_category: Dict[str, Dict] = defaultdict(lambda: {"count": 0, "enrolled": 0, "avg_rating_sum": 0})
    for c in course_list:
        cat = c["category"] or "Other"
        by_category[cat]["count"] += 1
        by_category[cat]["enrolled"] += c["enrolled"]
        by_category[cat]["avg_rating_sum"] += c["avg_rating"]
    for cat in by_category:
        n = by_category[cat]["count"]
        by_category[cat]["avg_rating"] = round(by_category[cat]["avg_rating_sum"] / max(n, 1), 2)

    sorted_by_completion = sorted(course_list, key=lambda x: x["completion_rate"])
    return {
        "courses": course_list,
        "total": len(course_list),
        "most_popular": course_list[:5],
        "low_performing": sorted_by_completion[:5],
        "avg_completion_rate": round(sum(c["completion_rate"] for c in course_list) / max(len(course_list), 1), 1),
        "avg_rating": round(sum(c["avg_rating"] for c in course_list) / max(len(course_list), 1), 2),
        "total_enrolled": sum(c["enrolled"] for c in course_list),
        "by_category": {k: v for k, v in by_category.items()},
    }


@router.get("/assessment-performance")
async def get_assessment_performance():
    await _ensure_seeded()
    courses = await _courses().find({}).to_list(500)
    learner_docs = await _learners().find({}).to_list(200)

    scores = [l.get("quiz_score", 0) for l in learner_docs]
    pass_threshold = 70
    passed = sum(1 for s in scores if s >= pass_threshold)
    failed = len(scores) - passed
    pass_rate = round((passed / len(scores)) * 100, 1) if scores else 0

    quiz_list = []
    for c in courses:
        for q in c.get("quizzes", []):
            attempts = c.get("enrolledUsers", 10)
            q_pass_rate = round(50 + (c.get("rating", 3) * 8) % 40, 1)
            quiz_list.append({
                "title": q.get("title", "Quiz"),
                "course": c.get("title", ""),
                "category": c.get("category", ""),
                "attempts": attempts,
                "pass_rate": q_pass_rate,
                "avg_score": round(pass_threshold + (q_pass_rate - 50) * 0.5, 1),
                "failed_attempts": int(attempts * (1 - q_pass_rate / 100)),
                "difficulty": "easy" if q_pass_rate > 80 else ("medium" if q_pass_rate > 60 else "hard"),
            })

    assignment_list = []
    for c in courses:
        for a in c.get("assignments", []):
            sub_rate = round(70 + (c.get("rating", 3) * 5) % 25, 1)
            assignment_list.append({
                "title": a.get("title", "Assignment"),
                "course": c.get("title", ""),
                "submission_rate": sub_rate,
                "avg_score": round(72 + sub_rate * 0.1, 1),
                "max_score": a.get("maxScore", 100),
                "status": a.get("status", "Active"),
            })

    return {
        "quiz_pass_rate": pass_rate,
        "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "total_attempts": len(scores) * 3,
        "passed_attempts": passed * 3,
        "failed_attempts": failed * 3,
        "assignment_submission_rate": round(sum(l.get("assignment_score", 0) for l in learner_docs) / max(len(learner_docs), 1) / 100 * 95, 1),
        "score_distribution": {
            "90-100": sum(1 for s in scores if s >= 90),
            "80-89":  sum(1 for s in scores if 80 <= s < 90),
            "70-79":  sum(1 for s in scores if 70 <= s < 80),
            "60-69":  sum(1 for s in scores if 60 <= s < 70),
            "below_60": sum(1 for s in scores if s < 60),
        },
        "quizzes": quiz_list[:15],
        "assignments": assignment_list[:10],
        "difficulty_breakdown": {
            "easy":   sum(1 for q in quiz_list if q["difficulty"] == "easy"),
            "medium": sum(1 for q in quiz_list if q["difficulty"] == "medium"),
            "hard":   sum(1 for q in quiz_list if q["difficulty"] == "hard"),
        },
    }


@router.get("/engagement")
async def get_engagement():
    await _ensure_seeded()
    docs = await _engage().find({}).sort("date", 1).to_list(60)
    if not docs:
        return {"daily_data": [], "current_dau": 0, "current_wau": 0, "avg_session_min": 0, "retention_rate": 0}

    latest = docs[-1]
    weekly_agg: Dict[str, Dict] = {}
    for d in docs:
        dt = datetime.strptime(d["date"], "%Y-%m-%d")
        wk = f"W{dt.isocalendar()[1]}"
        if wk not in weekly_agg:
            weekly_agg[wk] = {"wau": 0, "sessions": 0, "days": 0, "label": f"Week {dt.isocalendar()[1]}"}
        weekly_agg[wk]["wau"] = max(weekly_agg[wk]["wau"], d.get("wau", 0))
        weekly_agg[wk]["sessions"] += d.get("sessions", 0)
        weekly_agg[wk]["days"] += 1

    return {
        "current_dau": latest.get("dau", 0),
        "current_wau": latest.get("wau", 0),
        "avg_session_min": latest.get("avg_session_min", 0),
        "total_time_spent_hours": sum(d.get("time_spent_hours", 0) for d in docs),
        "retention_rate": latest.get("retention_rate", 0) * 100,
        "repeat_visit_rate": round(latest.get("repeat_visits", 0) / max(latest.get("dau", 1), 1) * 100, 1),
        "daily_data": [
            {"date": d["date"], "label": d["date"][5:], "dau": d.get("dau", 0),
             "sessions": d.get("sessions", 0), "avg_session_min": d.get("avg_session_min", 0),
             "time_spent_hours": d.get("time_spent_hours", 0)}
            for d in docs
        ],
        "weekly_data": [
            {"label": v["label"], "wau": v["wau"], "sessions": v["sessions"]}
            for v in list(weekly_agg.values())[-6:]
        ],
    }


@router.get("/revenue")
async def get_revenue():
    await _ensure_seeded()
    docs = await _revenue().find({}).sort("created_at", 1).to_list(24)
    if not docs:
        return {"monthly_data": [], "total_revenue": 0}

    latest = docs[-1]
    total = sum(d.get("revenue", 0) for d in docs)
    total_refunds = sum(d.get("refunds", 0) for d in docs)
    total_refund_amt = sum(d.get("refund_amount", 0) for d in docs)

    rev_by_course: Dict[str, float] = defaultdict(float)
    for d in docs[-3:]:
        for course, amt in (d.get("revenue_by_course") or {}).items():
            rev_by_course[course] += amt

    return {
        "total_revenue": total,
        "current_month_revenue": latest.get("revenue", 0),
        "total_refunds": total_refunds,
        "total_refund_amount": total_refund_amt,
        "refund_rate": round((total_refunds / max(sum(d.get("new_enrollments", 0) for d in docs), 1)) * 100, 2),
        "total_new_enrollments": sum(d.get("new_enrollments", 0) for d in docs),
        "total_renewals": sum(d.get("renewals", 0) for d in docs),
        "monthly_data": [
            {"month": d.get("month", ""), "label": d.get("month", "")[-8:],
             "revenue": d.get("revenue", 0), "new_enrollments": d.get("new_enrollments", 0),
             "renewals": d.get("renewals", 0), "refunds": d.get("refunds", 0),
             "refund_amount": d.get("refund_amount", 0)}
            for d in docs
        ],
        "revenue_by_course": [
            {"course": k, "revenue": round(v, 0)} for k, v in sorted(rev_by_course.items(), key=lambda x: -x[1])
        ],
    }


@router.get("/department-reports")
async def get_department_reports():
    await _ensure_seeded()
    learner_docs = await _learners().find({}).to_list(200)
    team_docs = await _team().find({}).to_list(100)

    dept_map: Dict[str, Dict] = {}
    for l in learner_docs:
        dept = l.get("department", "Other")
        if dept not in dept_map:
            dept_map[dept] = {"name": dept, "learners": 0, "total_score": 0, "total_completion": 0, "certificates": 0, "at_risk": 0}
        dept_map[dept]["learners"] += 1
        dept_map[dept]["total_score"] += l.get("quiz_score", 0)
        dept_map[dept]["total_completion"] += l.get("completion_pct", 0)
        dept_map[dept]["certificates"] += l.get("certificates", 0)
        if l.get("at_risk"):
            dept_map[dept]["at_risk"] += 1

    for d in dept_map.values():
        n = d["learners"] or 1
        d["avg_score"] = round(d["total_score"] / n, 1)
        d["avg_completion"] = round(d["total_completion"] / n, 1)

    return {
        "departments": list(dept_map.values()),
        "total_departments": len(dept_map),
        "team_data": [{"id": str(t.get("_id", "")), **{k: v for k, v in t.items() if k != "_id"}} for t in team_docs[:10]],
        "skill_improvement": [
            {"skill": skill, "before": 55 + i * 5, "after": 72 + i * 4, "improvement": 17 + i * 2}
            for i, skill in enumerate(["Sales Pitch", "Objection Handling", "Compliance", "Leadership", "Analytics"])
        ],
        "manager_reports": [
            {"manager": dept, "team_size": data["learners"], "avg_score": data["avg_score"],
             "completion_rate": data["avg_completion"], "at_risk": data["at_risk"], "status": "on_track" if data["avg_score"] >= 70 else "needs_attention"}
            for dept, data in dept_map.items()
        ],
    }


@router.get("/benchmarks")
async def get_benchmarks():
    await _ensure_seeded()
    docs = await _bench().find({}).to_list(20)
    overall = round(sum(d.get("achievement_pct", 0) for d in docs) / max(len(docs), 1), 1)

    monthly_targets = [
        {"month": m, "target_completions": 400 + i * 15, "actual_completions": 380 + i * 12 + (i % 3) * 8,
         "target_revenue": 130000 + i * 3000, "actual_revenue": 128000 + i * 3200 + (i % 4) * 1500}
        for i, m in enumerate(["Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026"])
    ]

    return {
        "benchmarks": [_s(d) for d in docs],
        "total": len(docs),
        "overall_achievement_pct": overall,
        "on_track": sum(1 for d in docs if d.get("status") == "on_track"),
        "near_target": sum(1 for d in docs if d.get("status") == "near_target"),
        "below_target": sum(1 for d in docs if d.get("status") == "below_target"),
        "monthly_targets": monthly_targets,
    }


@router.get("/alerts")
async def get_alerts(status: Optional[str] = None, severity: Optional[str] = None):
    await _ensure_seeded()
    query: Dict[str, Any] = {}
    if status: query["status"] = status
    if severity: query["severity"] = severity
    docs = await _alerts().find(query).sort("created_at", -1).to_list(50)

    counts = {
        "total": await _alerts().count_documents({}),
        "active": await _alerts().count_documents({"status": "active"}),
        "high": await _alerts().count_documents({"severity": "high", "status": "active"}),
        "medium": await _alerts().count_documents({"severity": "medium", "status": "active"}),
        "low": await _alerts().count_documents({"severity": "low", "status": "active"}),
    }
    return {"alerts": [_s(d) for d in docs], "counts": counts}


@router.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    now = datetime.utcnow()
    r = await _alerts().update_one(
        {"alert_id": alert_id},
        {"$set": {"status": "resolved", "resolved_at": now}}
    )
    if r.matched_count == 0:
        try:
            r2 = await _alerts().update_one(
                {"_id": ObjectId(alert_id)},
                {"$set": {"status": "resolved", "resolved_at": now}}
            )
            if r2.matched_count == 0:
                raise HTTPException(404, "Alert not found")
        except Exception:
            raise HTTPException(404, "Alert not found")
    return {"success": True}


@router.get("/ai-insights")
async def get_ai_insights():
    await _ensure_seeded()
    learner_docs = await _learners().find({}).to_list(200)
    bench_docs = await _bench().find({}).to_list(20)

    high_risk = [l for l in learner_docs if l.get("at_risk") and l.get("quiz_score", 100) < 65]
    dropout_predictions = [
        {
            "user": l.get("name", ""), "department": l.get("department", ""),
            "course": l.get("course", ""), "risk_score": round(0.6 + (100 - l.get("quiz_score", 70)) * 0.004, 2),
            "risk_level": "high" if l.get("quiz_score", 70) < 55 else "medium",
            "reason": "Low quiz score & high absence rate" if l.get("attendance_pct", 80) < 70 else "Stalled completion progress",
            "days_inactive": max(1, 18 - l.get("certificates", 0) * 3),
        }
        for l in sorted(high_risk, key=lambda x: x.get("quiz_score", 100))[:8]
    ]

    below_target = [d for d in bench_docs if d.get("status") == "below_target"]
    recommendations = [
        {"category": "Engagement",   "title": "Launch Re-engagement Campaign",   "description": "Send personalised nudge emails to 67 inactive learners with course-specific progress reminders.",  "impact": "high",   "effort": "low",    "expected_improvement": "↑12% active learner rate"},
        {"category": "Completion",   "title": "Add Micro-Learning Checkpoints",  "description": "Break long modules into 10-min chunks. Completion rates improve 18% with shorter lesson formats.",  "impact": "high",   "effort": "medium", "expected_improvement": "↑6% completion rate"},
        {"category": "Assessment",   "title": "Improve Failing Quiz Modules",    "description": "Quiz pass rate is 68.5%. AI analysis shows Module 4 questions are ambiguous. Rewrite recommended.", "impact": "high",   "effort": "medium", "expected_improvement": "↑9% pass rate"},
        {"category": "Revenue",      "title": "Introduce Bundle Pricing",        "description": "Learners who complete 3+ courses spend 40% more. Create course bundles at 15% discount.",           "impact": "medium", "effort": "low",    "expected_improvement": "↑$12k/month revenue"},
        {"category": "Instruction",  "title": "Coach Underperforming Instructor","description": "Neha Singh's engagement rate is 68%. Recommend bi-weekly coaching sessions and peer review.",       "impact": "medium", "effort": "medium", "expected_improvement": "↑0.8 instructor rating"},
        {"category": "Risk",         "title": "Intervene with At-Risk Learners", "description": f"AI identified {len(high_risk)} high-risk learners. Assign mentor & personalised learning paths.",   "impact": "high",   "effort": "medium", "expected_improvement": "Prevent dropout of 8-12 learners"},
    ]

    forecasts = [
        {"metric": "Active Learners",    "current": 1247, "forecast_1m": 1380, "forecast_3m": 1620, "trend": "up",     "confidence": 0.87},
        {"metric": "Completion Rate",    "current": 74.2, "forecast_1m": 76.1, "forecast_3m": 79.8, "trend": "up",     "confidence": 0.79},
        {"metric": "Monthly Revenue",    "current": 142800,"forecast_1m": 151000,"forecast_3m": 168000,"trend": "up",   "confidence": 0.83},
        {"metric": "Quiz Pass Rate",     "current": 68.5, "forecast_1m": 71.2, "forecast_3m": 74.8, "trend": "up",     "confidence": 0.74},
        {"metric": "Dropout Risk",       "current": 12,   "forecast_1m": 8,    "forecast_3m": 5,    "trend": "down",   "confidence": 0.81},
        {"metric": "Avg Session (min)",  "current": 42.3, "forecast_1m": 43.8, "forecast_3m": 46.2, "trend": "stable", "confidence": 0.72},
    ]

    kpi_analysis = [
        {"kpi": d.get("name", ""), "insight": f"At {d.get('actual', 0)}{d.get('unit', '')} vs {d.get('target', 0)}{d.get('unit', '')} target — {round(abs(d.get('actual', 0) - d.get('target', 0)) / max(d.get('target', 1), 1) * 100, 1)}% gap. Priority: {d.get('priority', 'medium').upper()}.", "trend": d.get("trend", "stable"), "status": d.get("status", "on_track"), "confidence": 0.82}
        for d in bench_docs if d.get("status") != "on_track"
    ]

    return {
        "dropout_predictions": dropout_predictions,
        "recommendations": recommendations,
        "forecasts": forecasts,
        "kpi_analysis": kpi_analysis,
        "model_accuracy": 0.87,
        "last_trained": "Apr 25, 2026",
        "data_points_used": 15420,
    }
