"""
Employee Workspace Router — MongoDB
6 workspaces: Progress, Performance, Leaderboard, Schedule, Role Access, Idea Hub
Auto-sync: syncs from existing Course / Leaderboard / Team_progress collections every 30s
         + syncs emp_ideas user_names → users collection every 30s
"""
import asyncio
import random
import re
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.mongodb.connection import webx_db
from app.core.security import hash_password

router = APIRouter(prefix="/api/mongo/emp-workspace", tags=["Employee Workspace"])

# ── Collection accessors ─────────────────────────────────────────────────────

def _db():             return webx_db()
def _courses():        return _db()["Course"]
def _leaderboard():    return _db()["Leaderboard"]
def _team():           return _db()["Team_progress"]
def _users():          return _db()["users"]

def _progress():       return _db()["emp_progress"]
def _performance():    return _db()["emp_performance"]
def _emp_lb():         return _db()["emp_leaderboard"]
def _schedule():       return _db()["emp_schedule"]
def _role_access():    return _db()["emp_role_access"]
def _ideas():          return _db()["emp_ideas"]

# ── Serialiser ───────────────────────────────────────────────────────────────

def _s(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id")) if "_id" in doc else doc.get("id", str(uuid.uuid4()))
    for f in ["created_at", "updated_at", "last_activity", "due_date", "last_attempt_at", "submitted_at"]:
        if isinstance(doc.get(f), datetime):
            doc[f] = doc[f].isoformat()
    return doc

# ── Seed constants ───────────────────────────────────────────────────────────

_COURSE_TITLES = [
    "Advanced Sales Pitch Mastery", "Objection Handling & Negotiation Skills",
    "High Conversion Sales Training", "Inside Sales Executive Certification",
    "Customer Support Ticket Simulation", "Escalation Management Specialist",
    "Helpdesk Support Professional Certification",
    "SOP Workflow Management Professional", "Compliance & Risk Certification",
    "Operations Excellence Program",
]
_CATEGORIES = ["Sales", "Operations", "Compliance", "Leadership", "Analytics", "Support"]
_DEPARTMENTS = ["Sales", "Operations", "Compliance", "Leadership", "Analytics", "Support", "HR", "Finance"]
_ROLES = ["Sales Executive", "Operations Analyst", "Compliance Officer", "Team Lead", "Data Analyst", "Support Specialist"]

_ROLE_ACCESS_SEEDS = [
    {
        "role": "Sales Executive",
        "department": "Sales",
        "color": "#0891b2",
        "accessible_courses": ["Advanced Sales Pitch Mastery", "Product Knowledge Bootcamp", "Communication Skills Pro", "Digital Marketing Essentials"],
        "restricted_courses": ["Data Analytics for Operations", "Compliance & Risk Certification", "SOP Workflow Management"],
        "permissions": {
            "view_courses": True, "take_assessments": True, "view_own_reports": True,
            "view_team_reports": False, "manage_users": False, "manage_content": False, "export_data": False,
        },
        "accessible_modules_count": 18,
        "total_modules_count": 32,
    },
    {
        "role": "Operations Analyst",
        "department": "Operations",
        "color": "#059669",
        "accessible_courses": ["SOP Workflow Management", "Data Analytics for Operations", "Compliance & Risk Certification", "Communication Skills Pro"],
        "restricted_courses": ["Advanced Sales Pitch Mastery", "Digital Marketing Essentials"],
        "permissions": {
            "view_courses": True, "take_assessments": True, "view_own_reports": True,
            "view_team_reports": True, "manage_users": False, "manage_content": False, "export_data": True,
        },
        "accessible_modules_count": 22,
        "total_modules_count": 32,
    },
    {
        "role": "Compliance Officer",
        "department": "Compliance",
        "color": "#dc2626",
        "accessible_courses": ["Compliance & Risk Certification", "SOP Workflow Management", "Leadership & Team Dynamics", "Communication Skills Pro"],
        "restricted_courses": ["Digital Marketing Essentials", "Advanced Sales Pitch Mastery"],
        "permissions": {
            "view_courses": True, "take_assessments": True, "view_own_reports": True,
            "view_team_reports": True, "manage_users": False, "manage_content": True, "export_data": True,
        },
        "accessible_modules_count": 20,
        "total_modules_count": 32,
    },
    {
        "role": "Team Lead",
        "department": "Leadership",
        "color": "#7c3aed",
        "accessible_courses": ["Leadership & Team Dynamics", "Communication Skills Pro", "Data Analytics for Operations", "Compliance & Risk Certification", "SOP Workflow Management"],
        "restricted_courses": [],
        "permissions": {
            "view_courses": True, "take_assessments": True, "view_own_reports": True,
            "view_team_reports": True, "manage_users": True, "manage_content": False, "export_data": True,
        },
        "accessible_modules_count": 28,
        "total_modules_count": 32,
    },
    {
        "role": "Data Analyst",
        "department": "Analytics",
        "color": "#f59e0b",
        "accessible_courses": ["Data Analytics for Operations", "AI Tools for Professionals", "Compliance & Risk Certification", "Communication Skills Pro"],
        "restricted_courses": ["Advanced Sales Pitch Mastery", "Customer Success Fundamentals"],
        "permissions": {
            "view_courses": True, "take_assessments": True, "view_own_reports": True,
            "view_team_reports": True, "manage_users": False, "manage_content": False, "export_data": True,
        },
        "accessible_modules_count": 24,
        "total_modules_count": 32,
    },
    {
        "role": "Support Specialist",
        "department": "Support",
        "color": "#ec4899",
        "accessible_courses": ["Customer Success Fundamentals", "Communication Skills Pro", "Product Knowledge Bootcamp"],
        "restricted_courses": ["Data Analytics for Operations", "Leadership & Team Dynamics", "Compliance & Risk Certification"],
        "permissions": {
            "view_courses": True, "take_assessments": True, "view_own_reports": True,
            "view_team_reports": False, "manage_users": False, "manage_content": False, "export_data": False,
        },
        "accessible_modules_count": 14,
        "total_modules_count": 32,
    },
]

_IDEA_SEEDS = [
    {
        "user_name": "Priya Sharma", "department": "Sales",
        "title": "Gamified Sales Training Challenges",
        "description": "Introduce weekly sales challenges with leaderboard points to boost engagement. Each challenge covers a key product knowledge area and auto-grades based on simulation results.",
        "category": "training", "status": "under_review", "upvotes": 18,
        "tags": ["gamification", "sales", "engagement"],
    },
    {
        "user_name": "Rahul Verma", "department": "Operations",
        "title": "Automated Onboarding Checklist",
        "description": "Create a digital onboarding checklist that auto-assigns courses based on role, tracks completion, and notifies managers when new hires complete each stage.",
        "category": "process_improvement", "status": "approved", "upvotes": 32,
        "tags": ["onboarding", "automation", "HR"],
    },
    {
        "user_name": "Anjali Singh", "department": "Compliance",
        "title": "AI-Powered Policy Q&A Bot",
        "description": "Deploy an AI chatbot that answers compliance policy questions, cites the relevant policy document, and tracks which policies employees struggle with most.",
        "category": "tools", "status": "submitted", "upvotes": 27,
        "tags": ["AI", "compliance", "chatbot"],
    },
    {
        "user_name": "Arjun Patel", "department": "Analytics",
        "title": "Peer Learning Study Groups",
        "description": "Allow employees to form study groups within the platform, share notes, and schedule virtual sessions. Group completion rates should be tracked and rewarded.",
        "category": "training", "status": "submitted", "upvotes": 14,
        "tags": ["collaboration", "learning", "community"],
    },
    {
        "user_name": "Meera Krishnan", "department": "Support",
        "title": "Monthly Skills Gap Report",
        "description": "Auto-generate a monthly report showing each employee's skills gap vs. their role requirements, with recommended courses to close the gap.",
        "category": "process_improvement", "status": "under_review", "upvotes": 21,
        "tags": ["skills", "reporting", "personalization"],
    },
    {
        "user_name": "Vikram Nair", "department": "Leadership",
        "title": "360° Feedback Integration",
        "description": "Integrate 360-degree feedback collection into the LMS so managers and peers can give structured feedback after each training module completion.",
        "category": "tools", "status": "submitted", "upvotes": 9,
        "tags": ["feedback", "360", "performance"],
    },
    {
        "user_name": "Sunita Rao", "department": "HR",
        "title": "Micro-Learning Daily Bites",
        "description": "Deliver 5-minute daily learning cards via push notification covering company values, product updates, or compliance tips. Track engagement per card.",
        "category": "training", "status": "approved", "upvotes": 41,
        "tags": ["micro-learning", "engagement", "mobile"],
    },
    {
        "user_name": "Dev Kapoor", "department": "Finance",
        "title": "Cross-Department Knowledge Sharing Sessions",
        "description": "Host monthly virtual knowledge-sharing sessions where teams present their expertise to other departments, recorded and uploaded as learning content.",
        "category": "other", "status": "submitted", "upvotes": 16,
        "tags": ["knowledge-sharing", "collaboration", "culture"],
    },
]

_SCHEDULE_SEEDS = [
    {"title": "Complete Module 3: Objection Handling", "type": "learning", "priority": "high", "status": "in_progress", "course_title": "Advanced Sales Pitch Mastery", "days_from_now": 3},
    {"title": "Sales Certification Assessment", "type": "assessment", "priority": "high", "status": "pending", "course_title": "Advanced Sales Pitch Mastery", "days_from_now": 7},
    {"title": "Q2 Performance Review Preparation", "type": "operational", "priority": "medium", "status": "pending", "course_title": None, "days_from_now": 10},
    {"title": "Complete Product Knowledge Bootcamp", "type": "learning", "priority": "medium", "status": "not_started", "course_title": "Product Knowledge Bootcamp", "days_from_now": 14},
    {"title": "Compliance Module: Data Privacy", "type": "learning", "priority": "high", "status": "pending", "course_title": "Compliance & Risk Certification", "days_from_now": 5},
    {"title": "Weekly Team Sync Preparation", "type": "operational", "priority": "low", "status": "pending", "course_title": None, "days_from_now": 2},
    {"title": "Customer Communication Skills Quiz", "type": "assessment", "priority": "medium", "status": "pending", "course_title": "Communication Skills Pro", "days_from_now": 6},
    {"title": "AI Tools Workshop Module 1", "type": "learning", "priority": "low", "status": "not_started", "course_title": "AI Tools for Professionals", "days_from_now": 21},
]

# ── Department → courses mapping — uses exact titles from the Course collection ──
_DEPT_COURSES: Dict[str, List[str]] = {
    "Sales":      ["Advanced Sales Pitch Mastery", "Objection Handling & Negotiation Skills", "High Conversion Sales Training", "Inside Sales Executive Certification"],
    "Support":    ["Customer Support Ticket Simulation", "Escalation Management Specialist", "Helpdesk Support Professional Certification"],
    "Operations": ["SOP Workflow Management Professional", "Compliance & Risk Certification", "Operations Excellence Program"],
    "Compliance": ["Compliance & Risk Certification", "SOP Workflow Management Professional", "Operations Excellence Program"],
    "Leadership": ["Advanced Sales Pitch Mastery", "Objection Handling & Negotiation Skills", "Operations Excellence Program"],
    "Analytics":  ["Operations Excellence Program", "Compliance & Risk Certification", "High Conversion Sales Training"],
    "HR":         ["Helpdesk Support Professional Certification", "Customer Support Ticket Simulation", "Escalation Management Specialist"],
    "Finance":    ["Compliance & Risk Certification", "Operations Excellence Program", "SOP Workflow Management Professional"],
}

_COURSE_CATEGORY: Dict[str, str] = {
    "Advanced Sales Pitch Mastery": "Sales",
    "Objection Handling & Negotiation Skills": "Sales",
    "High Conversion Sales Training": "Sales",
    "Inside Sales Executive Certification": "Sales",
    "Customer Support Ticket Simulation": "Support",
    "Escalation Management Specialist": "Support",
    "Helpdesk Support Professional Certification": "Support",
    "SOP Workflow Management Professional": "Operations",
    "Compliance & Risk Certification": "Operations",
    "Operations Excellence Program": "Operations",
}

_COURSE_THUMBNAIL: Dict[str, str] = {
    "Advanced Sales Pitch Mastery": "🎯",
    "Objection Handling & Negotiation Skills": "🤝",
    "High Conversion Sales Training": "📈",
    "Inside Sales Executive Certification": "💼",
    "Customer Support Ticket Simulation": "🎫",
    "Escalation Management Specialist": "⚡",
    "Helpdesk Support Professional Certification": "🛠️",
    "SOP Workflow Management Professional": "📋",
    "Compliance & Risk Certification": "⚖️",
    "Operations Excellence Program": "🏆",
}

# ── Department → schedule/task seeds ─────────────────────────────────────────
_DEPT_SCHEDULE_SEEDS: Dict[str, List[Dict]] = {
    "Sales": [
        {"title": "Complete Module: Objection Handling", "type": "learning", "priority": "high", "status": "in_progress", "course_title": "Advanced Sales Pitch Mastery", "days_from_now": 3},
        {"title": "Sales Certification Assessment", "type": "assessment", "priority": "high", "status": "pending", "course_title": "Advanced Sales Pitch Mastery", "days_from_now": 7},
        {"title": "Q2 Performance Review Preparation", "type": "operational", "priority": "medium", "status": "pending", "course_title": None, "days_from_now": 10},
        {"title": "Complete Product Knowledge Bootcamp", "type": "learning", "priority": "medium", "status": "not_started", "course_title": "Product Knowledge Bootcamp", "days_from_now": 14},
        {"title": "Digital Marketing Essentials Quiz", "type": "assessment", "priority": "medium", "status": "pending", "course_title": "Digital Marketing Essentials", "days_from_now": 6},
        {"title": "Weekly Team Sync Preparation", "type": "operational", "priority": "low", "status": "pending", "course_title": None, "days_from_now": 2},
    ],
    "Operations": [
        {"title": "Complete SOP Workflow Module 2", "type": "learning", "priority": "high", "status": "in_progress", "course_title": "SOP Workflow Management", "days_from_now": 3},
        {"title": "Operations Compliance Assessment", "type": "assessment", "priority": "high", "status": "pending", "course_title": "Compliance & Risk Certification", "days_from_now": 7},
        {"title": "Monthly Operations Review", "type": "operational", "priority": "medium", "status": "pending", "course_title": None, "days_from_now": 10},
        {"title": "Data Analytics for Operations Course", "type": "learning", "priority": "medium", "status": "not_started", "course_title": "Data Analytics for Operations", "days_from_now": 14},
        {"title": "Communication Skills Pro Quiz", "type": "assessment", "priority": "medium", "status": "pending", "course_title": "Communication Skills Pro", "days_from_now": 6},
        {"title": "Process Audit Preparation", "type": "operational", "priority": "low", "status": "pending", "course_title": None, "days_from_now": 2},
    ],
    "Compliance": [
        {"title": "Complete Compliance Risk Module", "type": "learning", "priority": "high", "status": "in_progress", "course_title": "Compliance & Risk Certification", "days_from_now": 3},
        {"title": "Compliance Certification Assessment", "type": "assessment", "priority": "high", "status": "pending", "course_title": "Compliance & Risk Certification", "days_from_now": 7},
        {"title": "Policy Review Meeting Preparation", "type": "operational", "priority": "medium", "status": "pending", "course_title": None, "days_from_now": 5},
        {"title": "SOP Workflow Management Training", "type": "learning", "priority": "medium", "status": "not_started", "course_title": "SOP Workflow Management", "days_from_now": 14},
        {"title": "Leadership & Team Dynamics Quiz", "type": "assessment", "priority": "medium", "status": "pending", "course_title": "Leadership & Team Dynamics", "days_from_now": 6},
        {"title": "Regulatory Compliance Audit Prep", "type": "operational", "priority": "high", "status": "pending", "course_title": None, "days_from_now": 4},
    ],
    "Leadership": [
        {"title": "Complete Leadership Dynamics Module", "type": "learning", "priority": "high", "status": "in_progress", "course_title": "Leadership & Team Dynamics", "days_from_now": 3},
        {"title": "Leadership Certification Assessment", "type": "assessment", "priority": "high", "status": "pending", "course_title": "Leadership & Team Dynamics", "days_from_now": 7},
        {"title": "Team Performance Review Preparation", "type": "operational", "priority": "medium", "status": "pending", "course_title": None, "days_from_now": 5},
        {"title": "Compliance & Risk Certification Course", "type": "learning", "priority": "medium", "status": "not_started", "course_title": "Compliance & Risk Certification", "days_from_now": 14},
        {"title": "SOP Workflow Training Module", "type": "learning", "priority": "low", "status": "not_started", "course_title": "SOP Workflow Management", "days_from_now": 21},
        {"title": "Monthly Team Strategy Session", "type": "operational", "priority": "high", "status": "pending", "course_title": None, "days_from_now": 2},
    ],
    "Analytics": [
        {"title": "Complete Data Analytics Module", "type": "learning", "priority": "high", "status": "in_progress", "course_title": "Data Analytics for Operations", "days_from_now": 3},
        {"title": "Analytics Certification Assessment", "type": "assessment", "priority": "high", "status": "pending", "course_title": "Data Analytics for Operations", "days_from_now": 7},
        {"title": "Monthly Analytics Report Preparation", "type": "operational", "priority": "medium", "status": "pending", "course_title": None, "days_from_now": 10},
        {"title": "AI Tools for Professionals Course", "type": "learning", "priority": "medium", "status": "not_started", "course_title": "AI Tools for Professionals", "days_from_now": 14},
        {"title": "Compliance & Risk Assessment", "type": "assessment", "priority": "medium", "status": "pending", "course_title": "Compliance & Risk Certification", "days_from_now": 6},
        {"title": "Data Review Meeting Preparation", "type": "operational", "priority": "low", "status": "pending", "course_title": None, "days_from_now": 2},
    ],
    "Support": [
        {"title": "Complete Customer Success Module", "type": "learning", "priority": "high", "status": "in_progress", "course_title": "Customer Success Fundamentals", "days_from_now": 3},
        {"title": "Customer Support Certification Assessment", "type": "assessment", "priority": "high", "status": "pending", "course_title": "Customer Success Fundamentals", "days_from_now": 7},
        {"title": "Weekly Support Review Preparation", "type": "operational", "priority": "medium", "status": "pending", "course_title": None, "days_from_now": 5},
        {"title": "Product Knowledge Bootcamp Course", "type": "learning", "priority": "medium", "status": "not_started", "course_title": "Product Knowledge Bootcamp", "days_from_now": 14},
        {"title": "Communication Skills Quiz", "type": "assessment", "priority": "medium", "status": "pending", "course_title": "Communication Skills Pro", "days_from_now": 6},
        {"title": "Support Ticket Backlog Review", "type": "operational", "priority": "low", "status": "pending", "course_title": None, "days_from_now": 2},
    ],
    "HR": [
        {"title": "Complete Communication Skills Module", "type": "learning", "priority": "high", "status": "in_progress", "course_title": "Communication Skills Pro", "days_from_now": 3},
        {"title": "HR Leadership Assessment", "type": "assessment", "priority": "high", "status": "pending", "course_title": "Leadership & Team Dynamics", "days_from_now": 7},
        {"title": "Monthly HR Review Preparation", "type": "operational", "priority": "medium", "status": "pending", "course_title": None, "days_from_now": 10},
        {"title": "AI Tools for Professionals Course", "type": "learning", "priority": "medium", "status": "not_started", "course_title": "AI Tools for Professionals", "days_from_now": 14},
        {"title": "Compliance Certification Assessment", "type": "assessment", "priority": "medium", "status": "pending", "course_title": "Compliance & Risk Certification", "days_from_now": 6},
        {"title": "Recruitment Planning Session", "type": "operational", "priority": "low", "status": "pending", "course_title": None, "days_from_now": 2},
    ],
    "Finance": [
        {"title": "Complete Compliance Risk Module", "type": "learning", "priority": "high", "status": "in_progress", "course_title": "Compliance & Risk Certification", "days_from_now": 3},
        {"title": "Finance Compliance Assessment", "type": "assessment", "priority": "high", "status": "pending", "course_title": "Compliance & Risk Certification", "days_from_now": 7},
        {"title": "Monthly Finance Report Preparation", "type": "operational", "priority": "medium", "status": "pending", "course_title": None, "days_from_now": 10},
        {"title": "Data Analytics for Finance Course", "type": "learning", "priority": "medium", "status": "not_started", "course_title": "Data Analytics for Operations", "days_from_now": 14},
        {"title": "AI Tools Assessment", "type": "assessment", "priority": "medium", "status": "pending", "course_title": "AI Tools for Professionals", "days_from_now": 6},
        {"title": "Budget Review Meeting", "type": "operational", "priority": "high", "status": "pending", "course_title": None, "days_from_now": 2},
    ],
}

# ── Seed helpers ─────────────────────────────────────────────────────────────

async def _ensure_seeded():
    now = datetime.utcnow()

    # ── Progress ─────────────────────────────────────────────────────
    if await _progress().count_documents({}) == 0:
        docs = []
        for i, title in enumerate(_COURSE_TITLES):
            total_mods = 6  # all courses have 6 modules with lesson data
            completed_mods = random.randint(0, total_mods)
            completed_lessons = completed_mods * 5  # 5 lessons per module
            total_lessons = total_mods * 5
            pct = round((completed_mods / total_mods) * 100)
            status = "completed" if pct == 100 else ("in_progress" if pct > 0 else "not_started")
            docs.append({
                "user_id": "demo_user",
                "course_id": f"course_{i}",
                "course_title": title,
                "course_category": _COURSE_CATEGORY.get(title, "General"),
                "total_modules": total_mods,
                "completed_modules": completed_mods,
                "total_lessons": total_lessons,
                "completed_lessons": completed_lessons,
                "progress_pct": pct,
                "last_activity": now - timedelta(hours=random.randint(1, 72)),
                "status": status,
                "resume_module_idx": max(0, completed_mods - 1) if status == "in_progress" else 0,
                "resume_module_id": None,
                "resume_lesson_id": None,
                "thumbnail": _COURSE_THUMBNAIL.get(title, "📚"),
                "created_at": now - timedelta(days=random.randint(7, 60)),
                "updated_at": now - timedelta(hours=random.randint(1, 24)),
            })
        await _progress().insert_many(docs)
        await _progress().create_index([("user_id", 1)])
        await _progress().create_index([("course_id", 1)])

    # ── Performance ──────────────────────────────────────────────────
    if await _performance().count_documents({}) == 0:
        docs = []
        for i, title in enumerate(_COURSE_TITLES[:7]):
            attempts = random.randint(1, 4)
            scores = sorted([random.randint(45, 98) for _ in range(attempts)])
            best = max(scores)
            avg = round(sum(scores) / len(scores))
            pass_score = 70
            weak_areas = []
            if best < 80:
                weak_areas = [f"Module {random.randint(2, 6)}: {random.choice(['Risk Assessment', 'Compliance Rules', 'Sales Techniques', 'Data Handling', 'Communication'])}"]
            docs.append({
                "user_id": "demo_user",
                "assessment_id": f"assess_{i}",
                "assessment_title": f"{title} — Final Quiz",
                "course_id": f"course_{i}",
                "course_title": title,
                "category": _CATEGORIES[i % len(_CATEGORIES)],
                "scores": scores,
                "best_score": best,
                "avg_score": avg,
                "latest_score": scores[-1],
                "attempts": attempts,
                "pass_score": pass_score,
                "passed": best >= pass_score,
                "weak_areas": weak_areas,
                "ai_suggestion": _ai_suggestion(avg, weak_areas),
                "trend": "improving" if len(scores) > 1 and scores[-1] >= scores[0] else "declining",
                "last_attempt_at": now - timedelta(days=random.randint(0, 14)),
                "created_at": now - timedelta(days=random.randint(14, 60)),
            })
        await _performance().insert_many(docs)
        await _performance().create_index([("user_id", 1)])

    # ── Leaderboard ──────────────────────────────────────────────────
    if await _emp_lb().count_documents({}) == 0:
        names = [
            ("Priya Sharma", "Sales"), ("Rahul Verma", "Operations"), ("Anjali Singh", "Compliance"),
            ("Arjun Patel", "Analytics"), ("Meera Krishnan", "Support"), ("Vikram Nair", "Leadership"),
            ("Sunita Rao", "HR"), ("Dev Kapoor", "Finance"), ("Karan Mehta", "Sales"),
            ("Nisha Gupta", "Operations"), ("Rohan Das", "Compliance"), ("Pooja Iyer", "Leadership"),
            ("Aditya Kumar", "Analytics"), ("Sonia Malhotra", "Sales"), ("Manish Tripathi", "Support"),
        ]
        docs = []
        xp_base = 2800
        for rank, (name, dept) in enumerate(names, 1):
            xp = max(100, xp_base - rank * random.randint(80, 150))
            docs.append({
                "rank": rank,
                "user_name": name,
                "department": dept,
                "xp_points": xp,
                "level": max(1, xp // 500),
                "badges": random.randint(2, 12),
                "courses_completed": random.randint(1, 8),
                "avg_score": round(random.uniform(65, 98), 1),
                "streak_days": random.randint(0, 30),
                "avatar": name[0].upper(),
                "trend": random.choice(["up", "down", "stable"]),
                "change": random.randint(0, 5) * random.choice([-1, 1, 0]),
                "updated_at": now,
            })
        await _emp_lb().insert_many(docs)
        await _emp_lb().create_index([("rank", 1)])
        await _emp_lb().create_index([("department", 1)])

    # ── Schedule ─────────────────────────────────────────────────────
    if await _schedule().count_documents({}) == 0:
        docs = []
        now_d = datetime.utcnow()
        for seed in _SCHEDULE_SEEDS:
            docs.append({
                "user_id": "demo_user",
                "title": seed["title"],
                "description": "",
                "type": seed["type"],
                "priority": seed["priority"],
                "status": seed["status"],
                "course_title": seed["course_title"],
                "course_id": None,
                "due_date": now_d + timedelta(days=seed["days_from_now"]),
                "reminder_sent": False,
                "created_at": now_d - timedelta(days=random.randint(1, 7)),
                "updated_at": now_d,
            })
        await _schedule().insert_many(docs)
        await _schedule().create_index([("user_id", 1)])
        await _schedule().create_index([("due_date", 1)])
        await _schedule().create_index([("status", 1)])

    # ── Role Access ──────────────────────────────────────────────────
    if await _role_access().count_documents({}) == 0:
        docs = []
        for seed in _ROLE_ACCESS_SEEDS:
            docs.append({**seed, "created_at": now, "updated_at": now})
        await _role_access().insert_many(docs)
        await _role_access().create_index([("role", 1)])
        await _role_access().create_index([("department", 1)])

    # ── Ideas ────────────────────────────────────────────────────────
    if await _ideas().count_documents({}) == 0:
        docs = []
        for i, seed in enumerate(_IDEA_SEEDS):
            offset_days = random.randint(1, 30)
            docs.append({
                **seed,
                "user_id": f"user_{i}",
                "upvoted_by": [f"user_{j}" for j in range(seed["upvotes"])],
                "comments": [],
                "submitted_at": now - timedelta(days=offset_days),
                "created_at": now - timedelta(days=offset_days),
                "updated_at": now - timedelta(days=random.randint(0, offset_days)),
            })
        await _ideas().insert_many(docs)
        await _ideas().create_index([("status", 1)])
        await _ideas().create_index([("category", 1)])
        await _ideas().create_index([("upvotes", -1)])

def _ai_suggestion(avg: float, weak_areas: list) -> str:
    if avg >= 90:
        return "Excellent performance! Consider mentoring peers or taking advanced modules."
    if avg >= 75:
        if weak_areas:
            return f"Good work. Focus on: {weak_areas[0]}. Re-attempt for a perfect score."
        return "Good performance. Maintain consistency across all modules."
    if avg >= 60:
        return f"Needs improvement. Review module materials and practice with AI simulations before retrying."
    return "Below passing threshold. Complete all lesson content and use AI Coach before next attempt."

# ── Auto-sync background task ─────────────────────────────────────────────────

_sync_task: Optional[asyncio.Task] = None

async def _auto_sync_loop():
    """Full workspace sync every 30s: leaderboard source, emp_ideas → users, users → workspace collections."""
    await asyncio.sleep(5)
    await _ensure_seeded()
    await _sync_ideas_to_users()                  # populate users collection from emp_ideas
    await _sync_users_to_workspace_collections()  # replace demo data with real user data
    while True:
        try:
            await asyncio.sleep(30)
            await _sync_leaderboard_from_source()
            await _sync_ideas_to_users()
            await _sync_users_to_workspace_collections()
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(10)

async def _sync_ideas_to_users():
    """
    Reads all unique user_name + department entries from emp_ideas and
    creates corresponding employee records in the users collection.
    Skips names that already have an email entry. Idempotent.
    """
    try:
        db = webx_db()
        ideas_col = db["emp_ideas"]
        users_col = db["users"]

        # Resolve tenant_id from any existing user (prefer admin)
        anchor = await users_col.find_one({"role": "admin"})
        if not anchor:
            anchor = await users_col.find_one({})
        if not anchor:
            return  # No tenant yet — nothing to attach to
        tenant_id = str(anchor["tenant_id"])

        # Collect all unique (user_name, department) pairs from emp_ideas
        ideas = await ideas_col.find({}, {"user_name": 1, "department": 1}).to_list(length=1000)
        seen: Dict[str, str] = {}  # user_name → department
        for idea in ideas:
            name = (idea.get("user_name") or "").strip()
            dept = (idea.get("department") or "").strip()
            if name and name not in seen:
                seen[name] = dept

        inserted = 0
        for full_name, department in seen.items():
            # Derive email: "First Last" → "first.last@webisdom.com"
            parts = re.sub(r"[^a-zA-Z\s]", "", full_name).lower().split()
            if len(parts) < 2:
                email = f"{parts[0]}@webisdom.com" if parts else None
            else:
                email = f"{parts[0]}.{parts[-1]}@webisdom.com"
            if not email:
                continue

            # Skip if email already exists in users collection
            existing = await users_col.find_one({"email": email})
            if existing:
                continue

            # Derive avatar initials
            avatar = "".join(w[0].upper() for w in full_name.split()[:2])

            user_doc = {
                "tenant_id": tenant_id,
                "email": email,
                "full_name": full_name,
                "password_hash": hash_password("Employee@123"),
                "role": "employee",
                "department": department,
                "job_title": f"{department} Specialist",
                "avatar": avatar,
                "is_active": True,
                "source": "emp_ideas",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            await users_col.insert_one(user_doc)
            inserted += 1

        if inserted:
            # Ensure unique index exists
            try:
                await users_col.create_index([("email", 1)], unique=True, background=True)
            except Exception:
                pass

    except Exception:
        pass


async def _sync_leaderboard_from_source():
    """Pull latest XP/level data from existing Leaderboard collection into emp_leaderboard."""
    try:
        source_docs = await _leaderboard().find({}).to_list(length=100)
        if not source_docs:
            return
        now = datetime.utcnow()
        for i, doc in enumerate(sorted(source_docs, key=lambda d: d.get("xp_points", 0), reverse=True), 1):
            await _emp_lb().update_one(
                {"user_name": doc.get("name", "")},
                {"$set": {
                    "rank": i,
                    "xp_points": doc.get("xp_points", 0),
                    "level": doc.get("level", 1),
                    "badges": doc.get("badges_count", 0),
                    "streak_days": doc.get("streak_days", 0),
                    "updated_at": now,
                }},
                upsert=False,
            )
    except Exception:
        pass

async def _sync_users_to_workspace_collections():
    """
    Keeps emp_progress, emp_performance, emp_schedule, emp_leaderboard in sync
    with the real employees in the users collection.

    Steps:
      1. Remove all demo_user placeholder data from the three per-user collections.
      2. Remove emp_leaderboard entries whose user_name has no matching user.
      3. For every real employee, create missing entries in all four collections.
      4. Recalculate emp_leaderboard ranks by XP.

    Idempotent — safe to call on every sync tick.
    """
    try:
        db = webx_db()
        users_col  = db["users"]
        prog_col   = _progress()
        perf_col   = _performance()
        sched_col  = _schedule()
        lb_col     = _emp_lb()

        # ── fetch real employees ──────────────────────────────────────────────
        real_employees = await users_col.find(
            {"role": "employee", "is_active": True}
        ).to_list(length=500)

        if not real_employees:
            return

        now        = datetime.utcnow()
        real_names = {u["full_name"] for u in real_employees}
        real_ids   = {str(u["_id"]) for u in real_employees}

        # ── 1. Remove demo_user placeholder data ─────────────────────────────
        await prog_col.delete_many({"user_id": "demo_user"})
        await perf_col.delete_many({"user_id": "demo_user"})
        await sched_col.delete_many({"user_id": "demo_user"})

        # Also remove any progress/performance/schedule rows whose user_id is
        # not a real employee _id (catches old stale data).
        all_prog_ids = await prog_col.distinct("user_id")
        stale_ids = [uid for uid in all_prog_ids if uid not in real_ids]
        if stale_ids:
            await prog_col.delete_many({"user_id": {"$in": stale_ids}})
            await perf_col.delete_many({"user_id": {"$in": stale_ids}})
            await sched_col.delete_many({"user_id": {"$in": stale_ids}})

        # ── 2. Remove leaderboard entries for non-real users ─────────────────
        await lb_col.delete_many({"user_name": {"$nin": list(real_names)}})

        # ── 3. Create missing entries for each real employee ─────────────────
        for user in real_employees:
            uid        = str(user["_id"])
            full_name  = user["full_name"]
            department = user.get("department", "General")

            # Resolve department-specific courses and schedule seeds
            dept_courses   = _DEPT_COURSES.get(department, _COURSE_TITLES)
            dept_schedules = _DEPT_SCHEDULE_SEEDS.get(department, _SCHEDULE_SEEDS)

            # ── emp_progress ─────────────────────────────────────────────────
            # Re-seed when: no data, department changed, OR titles don't match
            # the real Course collection (detects stale legacy data)
            existing_prog = await prog_col.find_one({"user_id": uid})
            if existing_prog:
                dept_changed   = existing_prog.get("department") != department
                title_is_stale = existing_prog.get("course_title", "") not in _COURSE_CATEGORY
                if dept_changed or title_is_stale:
                    await prog_col.delete_many({"user_id": uid})
                    existing_prog = None

            if not existing_prog:
                docs = []
                for i, title in enumerate(dept_courses):
                    total_mods        = 6   # every course has 6 modules with lesson data
                    completed_mods    = random.randint(0, total_mods)
                    completed_lessons = completed_mods * 5   # 5 lessons per module
                    total_lessons     = total_mods * 5
                    pct    = round((completed_mods / total_mods) * 100)
                    status = "completed" if pct == 100 else ("in_progress" if pct > 0 else "not_started")
                    docs.append({
                        "user_id":           uid,
                        "department":        department,
                        "course_id":         f"course_{i}",
                        "course_title":      title,
                        "course_category":   _COURSE_CATEGORY.get(title, department),
                        "total_modules":     total_mods,
                        "completed_modules": completed_mods,
                        "total_lessons":     total_lessons,
                        "completed_lessons": completed_lessons,
                        "progress_pct":      pct,
                        "last_activity":     now - timedelta(hours=random.randint(1, 72)),
                        "status":            status,
                        "resume_module_idx": max(0, completed_mods - 1) if status == "in_progress" else 0,
                        "resume_module_id":  None,
                        "resume_lesson_id":  None,
                        "thumbnail":         _COURSE_THUMBNAIL.get(title, "📚"),
                        "created_at":        now - timedelta(days=random.randint(7, 60)),
                        "updated_at":        now - timedelta(hours=random.randint(1, 24)),
                    })
                await prog_col.insert_many(docs)

            # ── emp_performance ──────────────────────────────────────────────
            # Re-seed when no data exists OR department has changed since last seed
            existing_perf = await perf_col.find_one({"user_id": uid})
            if existing_perf and existing_perf.get("department") != department:
                await perf_col.delete_many({"user_id": uid})
                existing_perf = None

            if not existing_perf:
                docs = []
                perf_titles = dept_courses[:min(len(dept_courses), 7)]
                for i, title in enumerate(perf_titles):
                    attempts  = random.randint(1, 4)
                    scores    = sorted([random.randint(45, 98) for _ in range(attempts)])
                    best      = max(scores)
                    avg       = round(sum(scores) / len(scores))
                    pass_score = 70
                    weak_areas = (
                        [f"Module {random.randint(2, 6)}: "
                         f"{random.choice(['Risk Assessment','Compliance Rules','Sales Techniques','Data Handling','Communication'])}"]
                        if best < 80 else []
                    )
                    docs.append({
                        "user_id":          uid,
                        "department":       department,
                        "assessment_id":    f"assess_{i}",
                        "assessment_title": f"{title} — Final Quiz",
                        "course_id":        f"course_{i}",
                        "course_title":     title,
                        "category":         _COURSE_CATEGORY.get(title, department),
                        "scores":           scores,
                        "best_score":       best,
                        "avg_score":        avg,
                        "latest_score":     scores[-1],
                        "attempts":         attempts,
                        "pass_score":       pass_score,
                        "passed":           best >= pass_score,
                        "weak_areas":       weak_areas,
                        "ai_suggestion":    _ai_suggestion(avg, weak_areas),
                        "trend":            "improving" if len(scores) > 1 and scores[-1] >= scores[0] else "declining",
                        "last_attempt_at":  now - timedelta(days=random.randint(0, 14)),
                        "created_at":       now - timedelta(days=random.randint(14, 60)),
                    })
                await perf_col.insert_many(docs)

            # ── emp_schedule ─────────────────────────────────────────────────
            # Re-seed when no data exists OR department has changed since last seed
            existing_sched = await sched_col.find_one({"user_id": uid})
            if existing_sched and existing_sched.get("department") != department:
                await sched_col.delete_many({"user_id": uid})
                existing_sched = None

            if not existing_sched:
                docs = []
                for seed in dept_schedules:
                    docs.append({
                        "user_id":       uid,
                        "department":    department,
                        "title":         seed["title"],
                        "description":   "",
                        "type":          seed["type"],
                        "priority":      seed["priority"],
                        "status":        seed["status"],
                        "course_title":  seed["course_title"],
                        "course_id":     None,
                        "due_date":      now + timedelta(days=seed["days_from_now"]),
                        "reminder_sent": False,
                        "created_at":    now - timedelta(days=random.randint(1, 7)),
                        "updated_at":    now,
                    })
                await sched_col.insert_many(docs)

            # ── emp_leaderboard ──────────────────────────────────────────────
            if not await lb_col.find_one({"user_name": full_name}):
                xp = random.randint(400, 3000)
                await lb_col.insert_one({
                    "rank":              0,
                    "user_name":         full_name,
                    "department":        department,
                    "xp_points":         xp,
                    "level":             max(1, xp // 500),
                    "badges":            random.randint(1, 10),
                    "courses_completed": random.randint(1, 8),
                    "avg_score":         round(random.uniform(60, 98), 1),
                    "streak_days":       random.randint(0, 21),
                    "avatar":            "".join(w[0].upper() for w in full_name.split()[:2]),
                    "trend":             random.choice(["up", "stable", "down"]),
                    "change":            random.randint(-3, 3),
                    "updated_at":        now,
                })

        # ── 4. Recalculate leaderboard ranks by XP desc ───────────────────────
        all_lb = await lb_col.find({}).sort("xp_points", -1).to_list(length=500)
        for rank, doc in enumerate(all_lb, 1):
            await lb_col.update_one(
                {"_id": doc["_id"]}, {"$set": {"rank": rank, "updated_at": now}}
            )

    except Exception:
        pass


def start_auto_sync():
    global _sync_task
    if _sync_task is None or _sync_task.done():
        _sync_task = asyncio.ensure_future(_auto_sync_loop())

# ═══════════════════════════════════════════════════════════════════
# 1. PROGRESS WORKSPACE
# ═══════════════════════════════════════════════════════════════════

@router.get("/progress")
async def get_progress(user_id: str = Query("demo_user")):
    await _ensure_seeded()
    docs = await _progress().find({"user_id": user_id}).to_list(length=100)
    items = [_s(d) for d in docs]
    total = len(items)
    completed = sum(1 for d in items if d["status"] == "completed")
    in_progress = sum(1 for d in items if d["status"] == "in_progress")
    not_started = sum(1 for d in items if d["status"] == "not_started")
    overall_pct = round(sum(d["progress_pct"] for d in items) / total) if total else 0
    return {
        "user_id": user_id,
        "summary": {
            "total_courses": total,
            "completed": completed,
            "in_progress": in_progress,
            "not_started": not_started,
            "overall_progress_pct": overall_pct,
        },
        "courses": items,
        "synced_at": datetime.utcnow().isoformat(),
    }

@router.post("/progress/sync")
async def sync_progress(user_id: str = Query("demo_user")):
    """Pull latest progress from Course collection and upsert into emp_progress."""
    now = datetime.utcnow()
    mongo_courses = await _courses().find({}).to_list(length=200)
    synced = 0
    for course in mongo_courses:
        course_id = str(course.get("_id", ""))
        total_mods = len(course.get("modules", []))
        if total_mods == 0:
            continue
        completed_mods = random.randint(0, total_mods)
        pct = round((completed_mods / total_mods) * 100)
        status = "completed" if pct == 100 else ("in_progress" if pct > 0 else "not_started")
        await _progress().update_one(
            {"user_id": user_id, "course_id": course_id},
            {"$set": {
                "course_title": course.get("title", "Untitled"),
                "course_category": course.get("category", "General"),
                "total_modules": total_mods,
                "completed_modules": completed_mods,
                "progress_pct": pct,
                "status": status,
                "last_activity": now,
                "updated_at": now,
            }, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
        synced += 1
    return {"message": f"Synced {synced} courses for user {user_id}", "synced_at": now.isoformat()}


@router.post("/progress/track-lesson")
async def track_lesson_progress(
    user_id: str = Query(...),
    course_title: str = Query(...),
    module_idx: int = Query(...),
    lesson_id: Optional[str] = Query(None),
):
    """Record the last lesson an employee opened so Resume Learning can return them there."""
    now = datetime.utcnow()
    update: Dict[str, Any] = {
        "resume_module_idx": module_idx,
        "resume_lesson_id": lesson_id,
        "status": "in_progress",
        "last_activity": now,
        "updated_at": now,
    }
    await _progress().update_one(
        {"user_id": user_id, "course_title": course_title},
        {"$set": update},
    )
    return {"ok": True}

# ═══════════════════════════════════════════════════════════════════
# 2. PERFORMANCE WORKSPACE
# ═══════════════════════════════════════════════════════════════════

@router.get("/performance")
async def get_performance(user_id: str = Query("demo_user")):
    await _ensure_seeded()
    docs = await _performance().find({"user_id": user_id}).sort("last_attempt_at", -1).to_list(length=100)
    items = [_s(d) for d in docs]
    if not items:
        return {
            "user_id": user_id,
            "summary": {
                "total_assessments": 0,
                "passed": 0,
                "avg_best_score": 0,
                "avg_score": 0,
                "total_attempts": 0,
                "improving_count": 0,
                "weak_areas": [],
                "performance_grade": "—",
            },
            "assessments": [],
            "synced_at": datetime.utcnow().isoformat(),
        }

    avg_best = round(sum(d["best_score"] for d in items) / len(items), 1)
    avg_score = round(sum(d["avg_score"] for d in items) / len(items), 1)
    passed = sum(1 for d in items if d.get("passed"))
    improving = sum(1 for d in items if d.get("trend") == "improving")
    total_attempts = sum(d.get("attempts", 1) for d in items)
    weak_areas = list({wa for d in items for wa in d.get("weak_areas", [])})

    return {
        "user_id": user_id,
        "summary": {
            "total_assessments": len(items),
            "passed": passed,
            "avg_best_score": avg_best,
            "avg_score": avg_score,
            "total_attempts": total_attempts,
            "improving_count": improving,
            "weak_areas": weak_areas[:5],
            "performance_grade": "A" if avg_best >= 90 else "B" if avg_best >= 80 else "C" if avg_best >= 70 else "D",
        },
        "assessments": items,
        "synced_at": datetime.utcnow().isoformat(),
    }

# ═══════════════════════════════════════════════════════════════════
# 3. LEADERBOARD WORKSPACE
# ═══════════════════════════════════════════════════════════════════

@router.get("/leaderboard")
async def get_leaderboard(
    department: str = Query("all"),
    timeframe: str = Query("monthly"),
    limit: int = Query(20),
):
    await _ensure_seeded()
    query: Dict[str, Any] = {}
    if department != "all":
        query["department"] = department
    docs = await _emp_lb().find(query).sort("rank", 1).limit(limit).to_list(length=limit)
    items = [_s(d) for d in docs]
    departments = await _emp_lb().distinct("department")
    return {
        "leaderboard": items,
        "total": len(items),
        "departments": ["all"] + sorted(departments),
        "timeframe": timeframe,
        "synced_at": datetime.utcnow().isoformat(),
    }

@router.get("/leaderboard/rank")
async def get_user_rank(user_name: str = Query("demo_user")):
    await _ensure_seeded()
    doc = await _emp_lb().find_one({"user_name": user_name})
    if not doc:
        total = await _emp_lb().count_documents({})
        return {"rank": total + 1, "user_name": user_name, "percentile": 50, "found": False}
    total = await _emp_lb().count_documents({})
    percentile = round((1 - (doc["rank"] / total)) * 100)
    return {**_s(doc), "total_participants": total, "percentile": percentile, "found": True}

# ═══════════════════════════════════════════════════════════════════
# 4. SCHEDULE / TASKS WORKSPACE
# ═══════════════════════════════════════════════════════════════════

class TaskCreate(BaseModel):
    user_id: str = "demo_user"
    title: str
    description: str = ""
    type: str = "learning"
    priority: str = "medium"
    due_date: Optional[str] = None
    course_title: Optional[str] = None
    course_id: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None

@router.get("/schedule")
async def get_schedule(
    user_id: str = Query("demo_user"),
    status: str = Query("all"),
    type: str = Query("all"),
):
    await _ensure_seeded()
    query: Dict[str, Any] = {"user_id": user_id}
    if status != "all":
        query["status"] = status
    if type != "all":
        query["type"] = type
    docs = await _schedule().find(query).sort("due_date", 1).to_list(length=200)
    items = [_s(d) for d in docs]
    now = datetime.utcnow()
    overdue = [d for d in items if d.get("due_date") and d["due_date"] < now.isoformat() and d["status"] not in ("completed",)]
    upcoming = [d for d in items if d.get("due_date") and d["due_date"] >= now.isoformat() and d["status"] not in ("completed",)]
    completed = [d for d in items if d["status"] == "completed"]
    return {
        "user_id": user_id,
        "tasks": items,
        "summary": {
            "total": len(items),
            "overdue": len(overdue),
            "upcoming": len(upcoming),
            "completed": len(completed),
            "in_progress": sum(1 for d in items if d["status"] == "in_progress"),
        },
        "synced_at": now.isoformat(),
    }

@router.post("/schedule", status_code=201)
async def create_task(body: TaskCreate):
    now = datetime.utcnow()
    due = None
    if body.due_date:
        try:
            due = datetime.fromisoformat(body.due_date)
        except ValueError:
            due = now + timedelta(days=7)
    doc = {
        "user_id": body.user_id,
        "title": body.title,
        "description": body.description,
        "type": body.type,
        "priority": body.priority,
        "status": "pending",
        "course_title": body.course_title,
        "course_id": body.course_id,
        "due_date": due or (now + timedelta(days=7)),
        "reminder_sent": False,
        "created_at": now,
        "updated_at": now,
    }
    result = await _schedule().insert_one(doc)
    doc["_id"] = result.inserted_id
    return _s(doc)

@router.patch("/schedule/{task_id}")
async def update_task(task_id: str, body: TaskUpdate):
    update: Dict[str, Any] = {"updated_at": datetime.utcnow()}
    if body.title is not None:
        update["title"] = body.title
    if body.description is not None:
        update["description"] = body.description
    if body.status is not None:
        update["status"] = body.status
    if body.priority is not None:
        update["priority"] = body.priority
    if body.due_date is not None:
        try:
            update["due_date"] = datetime.fromisoformat(body.due_date)
        except ValueError:
            pass
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task_id")
    result = await _schedule().find_one_and_update(
        {"_id": oid}, {"$set": update}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return _s(result)

@router.delete("/schedule/{task_id}")
async def delete_task(task_id: str):
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task_id")
    result = await _schedule().delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"deleted": True, "id": task_id}

# ═══════════════════════════════════════════════════════════════════
# 5. ROLE & ACCESS WORKSPACE
# ═══════════════════════════════════════════════════════════════════

@router.get("/role-access")
async def get_role_access(
    user_id: str = Query(""),
    role: str = Query("Sales Executive"),
    department: str = Query(""),
):
    await _ensure_seeded()

    # When user_id is provided, restrict to the employee's own department role only
    if user_id:
        try:
            user_doc = await _users().find_one({"_id": ObjectId(user_id)})
            if user_doc:
                user_dept = user_doc.get("department", "")
                dept_doc = await _role_access().find_one({"department": user_dept}) if user_dept else None
                if not dept_doc:
                    dept_doc = await _role_access().find_one({})
                return {
                    "current": _s(dept_doc) if dept_doc else None,
                    "all_roles": [_s(dept_doc)] if dept_doc else [],
                    "synced_at": datetime.utcnow().isoformat(),
                }
        except Exception:
            pass  # fall through to default

    # Default (admin / no user_id): return selected role + all roles
    query: Dict[str, Any] = {}
    if role:
        query["role"] = role
    if department:
        query["department"] = department
    doc = await _role_access().find_one(query)
    if not doc:
        doc = await _role_access().find_one({})
    all_roles_docs = await _role_access().find({}).to_list(length=20)
    return {
        "current": _s(doc) if doc else None,
        "all_roles": [_s(d) for d in all_roles_docs],
        "synced_at": datetime.utcnow().isoformat(),
    }

# ═══════════════════════════════════════════════════════════════════
# 6. IDEA HUB WORKSPACE
# ═══════════════════════════════════════════════════════════════════

class IdeaCreate(BaseModel):
    user_id: str = "demo_user"
    user_name: str
    department: str = ""
    title: str
    description: str
    category: str = "other"
    tags: List[str] = []

@router.get("/ideas")
async def list_ideas(
    category: str = Query("all"),
    status: str = Query("all"),
    sort_by: str = Query("newest"),
    user_id: Optional[str] = Query(None),
):
    await _ensure_seeded()
    query: Dict[str, Any] = {}
    if category != "all":
        query["category"] = category
    if status != "all":
        query["status"] = status
    if user_id:
        query["user_id"] = user_id

    sort_field = "upvotes" if sort_by == "popular" else "created_at"
    sort_dir = -1
    docs = await _ideas().find(query).sort(sort_field, sort_dir).to_list(length=200)
    items = [_s(d) for d in docs]

    categories = await _ideas().distinct("category")
    statuses = await _ideas().distinct("status")
    total_upvotes = sum(d.get("upvotes", 0) for d in items)

    return {
        "ideas": items,
        "total": len(items),
        "total_upvotes": total_upvotes,
        "categories": ["all"] + sorted(categories),
        "statuses": ["all"] + sorted(statuses),
        "synced_at": datetime.utcnow().isoformat(),
    }

@router.post("/ideas", status_code=201)
async def submit_idea(body: IdeaCreate):
    now = datetime.utcnow()
    doc = {
        "user_id": body.user_id,
        "user_name": body.user_name,
        "department": body.department,
        "title": body.title,
        "description": body.description,
        "category": body.category,
        "tags": body.tags,
        "status": "submitted",
        "upvotes": 0,
        "upvoted_by": [],
        "comments": [],
        "submitted_at": now,
        "created_at": now,
        "updated_at": now,
    }
    result = await _ideas().insert_one(doc)
    doc["_id"] = result.inserted_id
    return _s(doc)

@router.patch("/ideas/{idea_id}/vote")
async def toggle_vote(idea_id: str, voter_id: str = Query("demo_user")):
    try:
        oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid idea_id")
    doc = await _ideas().find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Idea not found")
    upvoted_by: list = doc.get("upvoted_by", [])
    if voter_id in upvoted_by:
        upvoted_by.remove(voter_id)
    else:
        upvoted_by.append(voter_id)
    result = await _ideas().find_one_and_update(
        {"_id": oid},
        {"$set": {"upvoted_by": upvoted_by, "upvotes": len(upvoted_by), "updated_at": datetime.utcnow()}},
        return_document=True,
    )
    return _s(result)

@router.post("/ideas/{idea_id}/comment")
async def add_comment(idea_id: str, commenter_name: str = Query(""), text: str = Query("")):
    try:
        oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid idea_id")
    comment = {"id": str(uuid.uuid4()), "commenter": commenter_name, "text": text, "at": datetime.utcnow().isoformat()}
    result = await _ideas().find_one_and_update(
        {"_id": oid},
        {"$push": {"comments": comment}, "$set": {"updated_at": datetime.utcnow()}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Idea not found")
    return _s(result)

# ── Seed endpoint ────────────────────────────────────────────────────────────

@router.post("/seed")
async def seed_all():
    for col in [_progress(), _performance(), _emp_lb(), _schedule(), _role_access(), _ideas()]:
        await col.drop()
    await _ensure_seeded()
    return {"message": "All employee workspace collections re-seeded successfully."}
