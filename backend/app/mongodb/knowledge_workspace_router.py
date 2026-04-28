"""
Knowledge Workspace Router — MongoDB.
Reads from existing Course collection (read-only).
Creates: knowledge_content_library, knowledge_base_articles,
         knowledge_certificates, knowledge_collaboration
"""
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.mongodb.connection import webx_db

router = APIRouter(prefix="/api/mongo/knowledge-workspace", tags=["Knowledge Workspace"])

# ── Collection accessors ────────────────────────────────────────────

def _courses():    return webx_db()["Course"]                   # read-only
def _content():   return webx_db()["knowledge_content_library"]
def _kb():        return webx_db()["knowledge_base_articles"]
def _certs():     return webx_db()["knowledge_certificates"]
def _collab():    return webx_db()["knowledge_collaboration"]

# ── Serialisers ─────────────────────────────────────────────────────

def _s(doc: dict) -> dict:
    doc = dict(doc)
    doc["_id"] = str(doc["_id"]) if "_id" in doc else None
    for f in ("createdAt", "updatedAt", "created_at", "updated_at", "issued_at"):
        if isinstance(doc.get(f), datetime):
            doc[f] = doc[f].isoformat()
    return doc

# ── Default seed data ────────────────────────────────────────────────

_CONTENT_SEEDS = [
    {"type":"video",       "title":"Sales Pitch Mastery – Module 1",         "format":"MP4","size":"142 MB","tags":["sales","pitch"],          "uploaded_by":"Rajiv Kapoor",   "course":"Advanced Sales Pitch Mastery"},
    {"type":"video",       "title":"Objection Handling Walkthrough",          "format":"MP4","size":"98 MB", "tags":["objection","sales"],       "uploaded_by":"Priya Mehta",    "course":"Objection Handling & Negotiation Skills"},
    {"type":"pdf",         "title":"Sales Playbook 2024",                     "format":"PDF","size":"4.2 MB","tags":["sales","reference"],       "uploaded_by":"Karan Patel",    "course":"High Conversion Sales Training"},
    {"type":"pdf",         "title":"Support SOP Handbook",                    "format":"PDF","size":"2.8 MB","tags":["support","sop"],           "uploaded_by":"Simran Kaur",   "course":"Customer Support Ticket Simulation"},
    {"type":"presentation","title":"Leadership Fundamentals Deck",            "format":"PPTX","size":"18 MB","tags":["leadership","management"],"uploaded_by":"Neha Singh",    "course":"SOP Workflow Management Professional"},
    {"type":"presentation","title":"Compliance Training Slides",              "format":"PPTX","size":"22 MB","tags":["compliance","risk"],       "uploaded_by":"Karan Patel",   "course":"Compliance & Risk Certification"},
    {"type":"audio",       "title":"Mindset for Sales Excellence – Podcast",  "format":"MP3","size":"34 MB","tags":["mindset","sales"],          "uploaded_by":"Rajiv Kapoor",  "course":"Advanced Sales Pitch Mastery"},
    {"type":"image",       "title":"Customer Journey Infographic",            "format":"PNG","size":"1.1 MB","tags":["customer","journey"],      "uploaded_by":"Simran Kaur",   "course":"Customer Support Ticket Simulation"},
    {"type":"resource",    "title":"Negotiation Checklist Template",          "format":"DOCX","size":"0.6 MB","tags":["negotiation","template"], "uploaded_by":"Priya Mehta",   "course":"Objection Handling & Negotiation Skills"},
    {"type":"resource",    "title":"Operations KPI Tracker – Excel",          "format":"XLSX","size":"1.4 MB","tags":["operations","kpi"],        "uploaded_by":"Rajiv Kapoor",  "course":"Operations Excellence Program"},
]

_KB_SEEDS = [
    {"type":"faq",       "title":"How do I enrol in a course?",         "content":"Navigate to Courses → Select a course → Click 'Enrol Now'. You will receive a confirmation email once enrolled successfully.","tags":["enrolment","getting-started"],"author":"Admin"},
    {"type":"faq",       "title":"How are assessments graded?",         "content":"Assessments are auto-graded. Each quiz has a defined passing score. Submissions are evaluated immediately and results are visible on your progress dashboard.","tags":["assessments","grades"],"author":"Admin"},
    {"type":"faq",       "title":"Can I download course materials?",    "content":"Yes. Downloadable resources are available in the Content Library tab of each course. PDFs and templates can be saved for offline use.","tags":["downloads","materials"],"author":"Admin"},
    {"type":"article",   "title":"Getting Started with the LMS Platform","content":"Welcome to our AI-powered LMS. This guide covers navigation, course enrollment, assessment submission, and certificate retrieval. Start with the Overview section in your dashboard.","tags":["getting-started","guide"],"author":"Platform Team"},
    {"type":"article",   "title":"Best Practices for Content Creation",  "content":"When creating course content: (1) Keep lessons under 15 minutes. (2) Use visuals for complex topics. (3) Add quizzes every 3–4 lessons. (4) Provide downloadable summaries.","tags":["content","best-practices"],"author":"Curriculum Team"},
    {"type":"policy",    "title":"Content Quality Standards Policy",     "content":"All uploaded content must meet: (1) Minimum 720p video resolution. (2) PDF accessibility compliance. (3) No copyrighted material without licence. Review the style guide before publishing.","tags":["policy","quality"],"author":"Admin"},
    {"type":"policy",    "title":"Data Retention Policy",                "content":"Course data is retained for 3 years post-completion. User progress records are archived after 2 years of inactivity. Content files are retained indefinitely unless manually deleted.","tags":["policy","data"],"author":"Compliance Team"},
    {"type":"guideline", "title":"Instructor Onboarding Guide",          "content":"Step 1: Complete your profile. Step 2: Review the content standards policy. Step 3: Use the AI Studio to generate your first course outline. Step 4: Submit for review via the Approval Workflow.","tags":["instructor","onboarding"],"author":"Admin"},
    {"type":"guide",     "title":"Student Learning Guide",               "content":"To maximise your learning: set daily goals, complete lessons in order, attempt all quizzes before moving on, use the AI Copilot for help, and download certificates upon completion.","tags":["student","learning"],"author":"Platform Team"},
]

_CERT_SEEDS = [
    {"type":"template","name":"Course Completion Certificate","description":"Awarded on 100% course completion","rules":{"min_score":0,"require_all_modules":True},"template_url":"/certs/completion.png","course":"All Courses"},
    {"type":"template","name":"Excellence Certificate",       "description":"Awarded for scoring ≥ 90% in all assessments","rules":{"min_score":90,"require_all_modules":True},"template_url":"/certs/excellence.png","course":"All Courses"},
    {"type":"template","name":"Sales Certification Badge",    "description":"Awarded on completing Sales track courses","rules":{"min_score":75,"require_all_modules":True},"template_url":"/certs/sales.png","course":"Sales Track"},
    {"type":"issued",  "name":"Course Completion Certificate","issued_to":"James Wilson",  "email":"employee@demo.com","course":"Advanced Sales Pitch Mastery",      "score":92,"issued_at": (datetime.utcnow()-timedelta(days=5)).isoformat()},
    {"type":"issued",  "name":"Excellence Certificate",       "issued_to":"Sarah Miller",  "email":"manager@demo.com", "course":"Compliance & Risk Certification",   "score":95,"issued_at": (datetime.utcnow()-timedelta(days=12)).isoformat()},
    {"type":"issued",  "name":"Sales Certification Badge",    "issued_to":"Lisa Zhang",    "email":"newuser@demo.com", "course":"High Conversion Sales Training",    "score":88,"issued_at": (datetime.utcnow()-timedelta(days=3)).isoformat()},
]

_COLLAB_SEEDS = [
    {"type":"note",    "author":"Rajiv Kapoor",  "course":"Advanced Sales Pitch Mastery","content":"Module 3 needs an updated roleplay script reflecting Q1 2025 objections. Assigned to Priya.","status":"open",    "priority":"high"},
    {"type":"review",  "author":"Priya Mehta",   "course":"Objection Handling & Negotiation Skills","content":"Lesson 4 video quality is below standard. Re-record with better lighting. Audio also needs noise cancellation.","status":"pending","priority":"medium"},
    {"type":"review",  "author":"Simran Kaur",   "course":"Customer Support Ticket Simulation","content":"Quiz questions in Module 2 are too easy. Suggest increasing difficulty for Intermediate-level learners.","status":"resolved","priority":"low"},
    {"type":"comment", "author":"Karan Patel",   "course":"Compliance & Risk Certification","content":"New regulatory update (Jan 2025) needs to be incorporated in Chapter 5. See attached circular.","status":"open",    "priority":"high"},
    {"type":"approval","author":"Neha Singh",    "course":"SOP Workflow Management Professional","content":"Content submitted for final review. All modules are complete. Awaiting admin approval for publishing.","status":"pending","priority":"medium"},
]

# ── Ensure seeded ────────────────────────────────────────────────────

async def _ensure_seeded():
    now = datetime.utcnow()

    if await _content().count_documents({}) == 0:
        for i, item in enumerate(_CONTENT_SEEDS):
            await _content().insert_one({
                **item,
                "item_id": str(uuid.uuid4()),
                "status": "active",
                "views": (i + 1) * 14,
                "downloads": (i + 1) * 6,
                "created_at": now - timedelta(days=i * 3),
            })
        await _content().create_index([("type", 1)])
        await _content().create_index([("created_at", -1)])

    if await _kb().count_documents({}) == 0:
        for i, item in enumerate(_KB_SEEDS):
            await _kb().insert_one({
                **item,
                "article_id": str(uuid.uuid4()),
                "status": "published",
                "views": (i + 1) * 22,
                "created_at": now - timedelta(days=i * 5),
            })
        await _kb().create_index([("type", 1)])
        await _kb().create_index([("created_at", -1)])

    if await _certs().count_documents({}) == 0:
        for i, item in enumerate(_CERT_SEEDS):
            ts = item.pop("issued_at", None)
            await _certs().insert_one({
                **item,
                "cert_id": str(uuid.uuid4()),
                "created_at": now - timedelta(days=i * 4),
                **({"issued_at": datetime.fromisoformat(ts)} if ts else {}),
            })
        await _certs().create_index([("type", 1)])

    if await _collab().count_documents({}) == 0:
        for i, item in enumerate(_COLLAB_SEEDS):
            await _collab().insert_one({
                **item,
                "collab_id": str(uuid.uuid4()),
                "created_at": now - timedelta(hours=i * 8),
            })
        await _collab().create_index([("type", 1)])
        await _collab().create_index([("status", 1)])

# ── Pydantic models ──────────────────────────────────────────────────

class ContentItemIn(BaseModel):
    type: str                          # video | pdf | presentation | audio | image | resource
    title: str
    format: Optional[str] = ""
    size: Optional[str] = ""
    tags: Optional[List[str]] = []
    uploaded_by: Optional[str] = ""
    course: Optional[str] = ""

class KBArticleIn(BaseModel):
    type: str                          # faq | article | policy | guideline | guide
    title: str
    content: str
    tags: Optional[List[str]] = []
    author: Optional[str] = "Admin"

class CertificateIn(BaseModel):
    type: str                          # template | issued
    name: str
    description: Optional[str] = ""
    rules: Optional[Dict[str, Any]] = {}
    template_url: Optional[str] = ""
    course: Optional[str] = ""
    issued_to: Optional[str] = ""
    email: Optional[str] = ""
    score: Optional[int] = 0

class CollabItemIn(BaseModel):
    type: str                          # note | review | comment | approval
    author: str
    course: Optional[str] = ""
    content: str
    status: Optional[str] = "open"
    priority: Optional[str] = "medium"

# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/seed")
async def seed_knowledge_workspace():
    """Seed all knowledge workspace collections. Idempotent."""
    await _ensure_seeded()
    return {
        "success": True,
        "content_library": await _content().count_documents({}),
        "knowledge_base":  await _kb().count_documents({}),
        "certificates":    await _certs().count_documents({}),
        "collaboration":   await _collab().count_documents({}),
    }


@router.get("/overview")
async def get_overview():
    """Overview stats: combines Course collection + new collections."""
    await _ensure_seeded()
    courses = await _courses().find({}).to_list(500)

    total   = len(courses)
    draft   = sum(1 for c in courses if c.get("status") == "Draft")
    pub     = sum(1 for c in courses if c.get("status") == "Published")
    arch    = sum(1 for c in courses if c.get("status") == "Archived")

    total_modules = sum(len(c.get("modules", [])) for c in courses)
    total_lessons = sum(
        sum(len(m.get("lessons", [])) for m in c.get("modules", []))
        for c in courses
    )
    total_quizzes      = sum(len(c.get("quizzes", [])) for c in courses)
    total_assignments  = sum(len(c.get("assignments", [])) for c in courses)
    total_enrolled     = sum(c.get("enrolledUsers", 0) for c in courses)
    avg_rating         = round(
        sum(c.get("rating", 0) for c in courses) / max(total, 1), 1
    )

    by_cat: Dict[str, int] = {}
    for c in courses:
        cat = c.get("category", "Other")
        by_cat[cat] = by_cat.get(cat, 0) + 1

    by_level: Dict[str, int] = {}
    for c in courses:
        lvl = c.get("level", "Unknown")
        by_level[lvl] = by_level.get(lvl, 0) + 1

    # Recent updates (last 10 courses by updatedAt)
    recent_raw = await _courses().find({}).sort("updatedAt", -1).limit(10).to_list(10)
    recent = [
        {
            "id":       str(r["_id"]),
            "title":    r.get("title", ""),
            "status":   r.get("status", ""),
            "category": r.get("category", ""),
            "updatedAt": r["updatedAt"].isoformat() if isinstance(r.get("updatedAt"), datetime) else str(r.get("updatedAt", "")),
        }
        for r in recent_raw
    ]

    content_count = await _content().count_documents({})
    kb_count      = await _kb().count_documents({})
    cert_count    = await _certs().count_documents({"type": "issued"})
    collab_open   = await _collab().count_documents({"status": "open"})

    return {
        "courses":         {"total": total, "draft": draft, "published": pub, "archived": arch},
        "curriculum":      {"modules": total_modules, "lessons": total_lessons, "quizzes": total_quizzes, "assignments": total_assignments},
        "engagement":      {"enrolled": total_enrolled, "avg_rating": avg_rating},
        "by_category":     by_cat,
        "by_level":        by_level,
        "recent_updates":  recent,
        "content_library": content_count,
        "knowledge_base":  kb_count,
        "certificates_issued": cert_count,
        "open_reviews":    collab_open,
    }


@router.get("/courses")
async def get_courses(
    category: Optional[str] = None,
    status:   Optional[str] = None,
    search:   Optional[str] = None,
    page:     int = Query(1, ge=1),
    limit:    int = Query(20, ge=1, le=100),
):
    """List courses from the Course collection (read-only)."""
    query: Dict[str, Any] = {}
    if category: query["category"] = category
    if status:   query["status"]   = status
    if search:   query["$or"] = [
        {"title":       {"$regex": search, "$options": "i"}},
        {"instructor":  {"$regex": search, "$options": "i"}},
        {"description": {"$regex": search, "$options": "i"}},
    ]

    total = await _courses().count_documents(query)
    skip  = (page - 1) * limit
    docs  = await _courses().find(query).sort("createdAt", -1).skip(skip).limit(limit).to_list(limit)
    return {
        "courses": [_s(d) for d in docs],
        "total":   total,
        "page":    page,
        "pages":   max(1, (total + limit - 1) // limit),
    }


@router.get("/curriculum/modules")
async def get_modules(search: Optional[str] = None):
    """All modules aggregated from all courses."""
    await _ensure_seeded()
    courses = await _courses().find({}).to_list(500)
    result = []
    for c in courses:
        if search and search.lower() not in c.get("title", "").lower():
            continue
        for m in c.get("modules", []):
            result.append({
                "module_title":  m.get("title", ""),
                "course_title":  c.get("title", ""),
                "course_id":     str(c["_id"]),
                "category":      c.get("category", ""),
                "duration":      m.get("duration", ""),
                "lessons_count": len(m.get("lessons", [])),
                "order":         m.get("order", 0),
            })
    result.sort(key=lambda x: (x["course_title"], x["order"]))
    return {"modules": result, "total": len(result)}


@router.get("/curriculum/lessons")
async def get_lessons(course_id: Optional[str] = None):
    """All lessons extracted from course modules."""
    await _ensure_seeded()
    query = {"_id": ObjectId(course_id)} if course_id else {}
    courses = await _courses().find(query).to_list(500)
    result = []
    for c in courses:
        for mi, m in enumerate(c.get("modules", [])):
            for li, lesson in enumerate(m.get("lessons", [])):
                result.append({
                    "lesson_title":  lesson if isinstance(lesson, str) else str(lesson),
                    "module_title":  m.get("title", ""),
                    "course_title":  c.get("title", ""),
                    "course_id":     str(c["_id"]),
                    "category":      c.get("category", ""),
                    "module_index":  mi,
                    "lesson_index":  li,
                })
    return {"lessons": result, "total": len(result)}


@router.get("/assessments")
async def get_assessments(type: Optional[str] = None):
    """Quizzes and assignments from the Course collection."""
    await _ensure_seeded()
    courses = await _courses().find({}).to_list(500)
    quizzes = []
    assignments = []
    for c in courses:
        cid   = str(c["_id"])
        ctitle = c.get("title", "")
        cat   = c.get("category", "")
        for q in c.get("quizzes", []):
            quizzes.append({
                "quiz_title":    q.get("title", ""),
                "course_title":  ctitle,
                "course_id":     cid,
                "category":      cat,
                "questions":     q.get("questions", 0),
                "passing_score": q.get("passingScore", 70),
                "time_limit":    q.get("timeLimit", 30),
            })
        for a in c.get("assignments", []):
            assignments.append({
                "assignment_title": a.get("title", ""),
                "course_title":     ctitle,
                "course_id":        cid,
                "category":         cat,
                "due_date":         a.get("dueDate"),
                "max_score":        a.get("maxScore", 100),
                "status":           a.get("status", "Pending"),
            })
    if type == "quiz":       return {"items": quizzes, "total": len(quizzes)}
    if type == "assignment": return {"items": assignments, "total": len(assignments)}
    return {"quizzes": quizzes, "assignments": assignments,
            "total_quizzes": len(quizzes), "total_assignments": len(assignments)}


@router.get("/analytics")
async def get_analytics():
    """Content analytics from the Course collection + new collections."""
    await _ensure_seeded()
    courses = await _courses().find({}).sort("enrolledUsers", -1).to_list(500)

    top_enrolled = [
        {"title": c.get("title",""), "category": c.get("category",""),
         "enrolled": c.get("enrolledUsers", 0), "rating": c.get("rating", 0)}
        for c in courses[:5]
    ]
    low_engagement = [
        {"title": c.get("title",""), "category": c.get("category",""),
         "enrolled": c.get("enrolledUsers", 0), "rating": c.get("rating", 0)}
        for c in sorted(courses, key=lambda x: x.get("enrolledUsers", 0))[:5]
    ]

    by_cat: Dict[str, Dict] = {}
    for c in courses:
        cat = c.get("category", "Other")
        if cat not in by_cat:
            by_cat[cat] = {"count": 0, "enrolled": 0, "rating_sum": 0}
        by_cat[cat]["count"]      += 1
        by_cat[cat]["enrolled"]   += c.get("enrolledUsers", 0)
        by_cat[cat]["rating_sum"] += c.get("rating", 0)
    for cat in by_cat:
        n = by_cat[cat]["count"]
        by_cat[cat]["avg_rating"] = round(by_cat[cat]["rating_sum"] / max(n, 1), 1)

    # Status counts
    courses_by_status: Dict[str, int] = {}
    for c in courses:
        st = (c.get("status") or "Unknown").lower()
        courses_by_status[st] = courses_by_status.get(st, 0) + 1

    # Level counts
    courses_by_level: Dict[str, int] = {}
    for c in courses:
        lvl = c.get("level") or "Unknown"
        courses_by_level[lvl] = courses_by_level.get(lvl, 0) + 1

    # Content library by type
    content_docs = await _content().find({}).to_list(500)
    content_by_type: Dict[str, int] = {}
    for d in content_docs:
        t = d.get("type", "other")
        content_by_type[t] = content_by_type.get(t, 0) + 1

    # KB articles by type
    kb_docs = await _kb().find({}).to_list(500)
    kb_by_type: Dict[str, int] = {}
    for d in kb_docs:
        t = d.get("type", "other")
        kb_by_type[t] = kb_by_type.get(t, 0) + 1

    # Monthly course creation (last 6 months based on createdAt)
    from collections import defaultdict
    monthly: Dict[str, int] = defaultdict(int)
    for c in courses:
        dt = c.get("createdAt")
        if isinstance(dt, datetime):
            key = dt.strftime("%b %Y")
            monthly[key] += 1
    monthly_courses = [{"month": k, "count": v} for k, v in sorted(monthly.items())][-6:]

    completion_by_level = {"Beginner": 87, "Intermediate": 74, "Advanced": 61}

    return {
        "top_enrolled":        top_enrolled,
        "low_engagement":      low_engagement,
        "by_category":         by_cat,
        "courses_by_status":   courses_by_status,
        "courses_by_level":    courses_by_level,
        "content_by_type":     content_by_type,
        "kb_by_type":          kb_by_type,
        "monthly_courses":     monthly_courses,
        "completion_by_level": completion_by_level,
        "total_enrolled":      sum(c.get("enrolledUsers", 0) for c in courses),
    }


# ── Content Library ──────────────────────────────────────────────────

@router.get("/content-library")
async def list_content(type: Optional[str] = None, search: Optional[str] = None):
    await _ensure_seeded()
    query: Dict[str, Any] = {}
    if type:   query["type"] = type
    if search: query["title"] = {"$regex": search, "$options": "i"}
    docs = await _content().find(query).sort("created_at", -1).to_list(200)
    return {"items": [_s(d) for d in docs], "total": len(docs)}


@router.post("/content-library")
async def create_content(body: ContentItemIn):
    now = datetime.utcnow()
    doc = {
        **body.dict(),
        "item_id":    str(uuid.uuid4()),
        "status":     "active",
        "views":      0,
        "downloads":  0,
        "created_at": now,
    }
    await _content().insert_one(doc)
    return {"success": True, "item": _s(doc)}


@router.delete("/content-library/{item_id}")
async def delete_content(item_id: str):
    r = await _content().delete_one({"item_id": item_id})
    if r.deleted_count == 0:
        try:
            r2 = await _content().delete_one({"_id": ObjectId(item_id)})
            if r2.deleted_count == 0:
                raise HTTPException(404, "Item not found")
        except Exception:
            raise HTTPException(404, "Item not found")
    return {"success": True}


# ── Knowledge Base ───────────────────────────────────────────────────

@router.get("/knowledge-base")
async def list_kb(type: Optional[str] = None, search: Optional[str] = None):
    await _ensure_seeded()
    query: Dict[str, Any] = {}
    if type:   query["type"] = type
    if search: query["$or"] = [
        {"title":   {"$regex": search, "$options": "i"}},
        {"content": {"$regex": search, "$options": "i"}},
    ]
    docs = await _kb().find(query).sort("created_at", -1).to_list(200)
    return {"articles": [_s(d) for d in docs], "total": len(docs)}


@router.post("/knowledge-base")
async def create_kb_article(body: KBArticleIn):
    now = datetime.utcnow()
    doc = {**body.dict(), "article_id": str(uuid.uuid4()), "status": "published", "views": 0, "created_at": now}
    await _kb().insert_one(doc)
    return {"success": True, "article": _s(doc)}


@router.delete("/knowledge-base/{article_id}")
async def delete_kb_article(article_id: str):
    r = await _kb().delete_one({"article_id": article_id})
    if r.deleted_count == 0:
        try:
            r2 = await _kb().delete_one({"_id": ObjectId(article_id)})
            if r2.deleted_count == 0:
                raise HTTPException(404, "Article not found")
        except Exception:
            raise HTTPException(404, "Article not found")
    return {"success": True}


# ── Certificates ─────────────────────────────────────────────────────

@router.get("/certificates")
async def list_certificates(type: Optional[str] = None):
    await _ensure_seeded()
    query = {"type": type} if type else {}
    docs  = await _certs().find(query).sort("created_at", -1).to_list(200)
    return {"certificates": [_s(d) for d in docs], "total": len(docs)}


@router.post("/certificates")
async def create_certificate(body: CertificateIn):
    now = datetime.utcnow()
    doc = {**body.dict(), "cert_id": str(uuid.uuid4()), "created_at": now}
    if body.type == "issued":
        doc["issued_at"] = now
    await _certs().insert_one(doc)
    return {"success": True, "certificate": _s(doc)}


# ── Collaboration ─────────────────────────────────────────────────────

@router.get("/collaboration")
async def list_collaboration(type: Optional[str] = None, status: Optional[str] = None):
    await _ensure_seeded()
    query: Dict[str, Any] = {}
    if type:   query["type"]   = type
    if status: query["status"] = status
    docs = await _collab().find(query).sort("created_at", -1).to_list(200)
    return {"items": [_s(d) for d in docs], "total": len(docs)}


@router.post("/collaboration")
async def create_collab_item(body: CollabItemIn):
    now = datetime.utcnow()
    doc = {**body.dict(), "collab_id": str(uuid.uuid4()), "created_at": now}
    await _collab().insert_one(doc)
    return {"success": True, "item": _s(doc)}


class CollabStatusIn(BaseModel):
    status: str

@router.patch("/collaboration/{collab_id}/status")
async def update_collab_status(collab_id: str, body: CollabStatusIn):
    r = await _collab().update_one({"collab_id": collab_id}, {"$set": {"status": body.status}})
    if r.matched_count == 0:
        # fallback: try by _id string
        try:
            r2 = await _collab().update_one({"_id": ObjectId(collab_id)}, {"$set": {"status": body.status}})
            if r2.matched_count == 0:
                raise HTTPException(404, "Item not found")
        except Exception:
            raise HTTPException(404, "Item not found")
    return {"success": True}
