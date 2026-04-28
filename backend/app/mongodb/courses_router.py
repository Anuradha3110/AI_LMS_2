"""
Admin LMS Course Management — CRUD for the webx.Course collection.
Supports Sales, Support, Operations categories with full module/assignment/quiz data.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.mongodb.connection import courses_col

router = APIRouter(prefix="/api/mongo", tags=["Admin Courses"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _serialize(doc: dict) -> dict:
    out = {k: (str(v) if isinstance(v, ObjectId) else v) for k, v in doc.items()}
    out["_id"] = str(doc["_id"])
    # ISO-format datetimes
    for field in ("createdAt", "updatedAt"):
        if isinstance(out.get(field), datetime):
            out[field] = out[field].isoformat()
    return out


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid id: {id_str}")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class CourseModuleIn(BaseModel):
    title: str
    description: Optional[str] = ""
    duration: Optional[str] = ""
    order: Optional[int] = 0
    lessons: Optional[List[str]] = []


class CourseAssignmentIn(BaseModel):
    title: str
    description: Optional[str] = ""
    dueDate: Optional[str] = None
    status: Optional[str] = "Pending"
    maxScore: Optional[int] = 100


class CourseQuizIn(BaseModel):
    title: str
    questions: Optional[int] = 10
    passingScore: Optional[int] = 70
    timeLimit: Optional[int] = 30


class CourseIn(BaseModel):
    title: str
    description: str
    category: str  # Sales | Support | Operations
    level: str = "Beginner"  # Beginner | Intermediate | Advanced
    duration: str = ""
    instructor: str = ""
    thumbnail: Optional[str] = ""
    modules: Optional[List[CourseModuleIn]] = []
    assignments: Optional[List[CourseAssignmentIn]] = []
    quizzes: Optional[List[CourseQuizIn]] = []
    rating: Optional[float] = 0.0
    enrolledUsers: Optional[int] = 0
    status: Optional[str] = "Draft"  # Published | Draft | Archived
    isRecommended: Optional[bool] = False
    isNew: Optional[bool] = True
    tags: Optional[List[str]] = []


class CoursePatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    duration: Optional[str] = None
    instructor: Optional[str] = None
    thumbnail: Optional[str] = None
    modules: Optional[List[CourseModuleIn]] = None
    assignments: Optional[List[CourseAssignmentIn]] = None
    quizzes: Optional[List[CourseQuizIn]] = None
    rating: Optional[float] = None
    enrolledUsers: Optional[int] = None
    status: Optional[str] = None
    isRecommended: Optional[bool] = None
    isNew: Optional[bool] = None
    tags: Optional[List[str]] = None


# ════════════════════════════════════════════════════════════════════════════════
# COURSES  —  /api/mongo/courses
# ════════════════════════════════════════════════════════════════════════════════

@router.get("/courses", response_model=List[Dict[str, Any]])
async def list_courses(
    category: Optional[str] = Query(None, description="Filter: Sales | Support | Operations"),
    status: Optional[str] = Query(None, description="Filter: Published | Draft | Archived"),
    search: Optional[str] = Query(None, description="Search in title/description"),
):
    col = courses_col()
    query: Dict[str, Any] = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    docs = await col.find(query).sort("createdAt", -1).to_list(length=500)
    return [_serialize(d) for d in docs]


@router.get("/courses/stats", response_model=Dict[str, Any])
async def course_stats():
    """Return counts by status and category."""
    col = courses_col()
    pipeline = [
        {"$group": {"_id": {"status": "$status", "category": "$category"}, "count": {"$sum": 1}}},
    ]
    rows = await col.aggregate(pipeline).to_list(length=100)
    total = await col.count_documents({})
    published = await col.count_documents({"status": "Published"})
    draft = await col.count_documents({"status": "Draft"})
    archived = await col.count_documents({"status": "Archived"})
    sales = await col.count_documents({"category": "Sales"})
    support = await col.count_documents({"category": "Support"})
    operations = await col.count_documents({"category": "Operations"})
    return {
        "total": total,
        "published": published,
        "draft": draft,
        "archived": archived,
        "by_category": {"Sales": sales, "Support": support, "Operations": operations},
    }


@router.get("/courses/category/{category}", response_model=List[Dict[str, Any]])
async def list_courses_by_category(category: str):
    col = courses_col()
    docs = await col.find({"category": category}).sort("createdAt", -1).to_list(length=200)
    return [_serialize(d) for d in docs]


@router.get("/courses/{id}", response_model=Dict[str, Any])
async def get_course(id: str):
    col = courses_col()
    doc = await col.find_one({"_id": _oid(id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Course not found")
    return _serialize(doc)


@router.post("/courses", response_model=Dict[str, Any], status_code=201)
async def create_course(body: CourseIn):
    col = courses_col()
    # Prevent duplicate titles
    existing = await col.find_one({"title": {"$regex": f"^{body.title}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=409, detail=f"A course titled '{body.title}' already exists.")
    now = datetime.utcnow()
    doc = {
        **body.model_dump(),
        "createdAt": now,
        "updatedAt": now,
    }
    result = await col.insert_one(doc)
    inserted = await col.find_one({"_id": result.inserted_id})
    return _serialize(inserted)


@router.put("/courses/{id}", response_model=Dict[str, Any])
async def update_course(id: str, body: CourseIn):
    col = courses_col()
    # Prevent duplicate title on other documents
    existing = await col.find_one({
        "title": {"$regex": f"^{body.title}$", "$options": "i"},
        "_id": {"$ne": _oid(id)},
    })
    if existing:
        raise HTTPException(status_code=409, detail=f"Another course titled '{body.title}' already exists.")
    update = {**body.model_dump(), "updatedAt": datetime.utcnow()}
    result = await col.find_one_and_update(
        {"_id": _oid(id)},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Course not found")
    return _serialize(result)


@router.patch("/courses/{id}", response_model=Dict[str, Any])
async def patch_course(id: str, body: CoursePatch):
    col = courses_col()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updatedAt"] = datetime.utcnow()
    result = await col.find_one_and_update(
        {"_id": _oid(id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Course not found")
    return _serialize(result)


@router.delete("/courses/{id}", status_code=204)
async def delete_course(id: str):
    col = courses_col()
    result = await col.delete_one({"_id": _oid(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")


# ════════════════════════════════════════════════════════════════════════════════
# SEED  —  /api/mongo/courses/seed
# ════════════════════════════════════════════════════════════════════════════════

@router.post("/courses/seed", status_code=201)
async def seed_courses(force: bool = Query(False, description="Re-seed even if courses already exist")):
    """
    Insert 10 professional default courses across Sales, Support, Operations.
    Safe to call multiple times — skips if already seeded (unless force=true).
    """
    col = courses_col()
    count = await col.count_documents({})
    if count > 0 and not force:
        return {"message": "Courses already seeded", "count": count, "seeded": False}

    now = datetime.utcnow()

    default_courses = [
        # ── SALES ──────────────────────────────────────────────────────────────
        {
            "title": "Advanced Sales Pitch Mastery",
            "description": (
                "Transform your sales conversations with proven pitch frameworks used by top 1% closers. "
                "Learn the AIDA model, storytelling for sales, value-based positioning, and how to "
                "tailor pitches for C-suite executives. Includes live roleplay exercises and pitch critique sessions."
            ),
            "category": "Sales",
            "level": "Advanced",
            "duration": "12 hours",
            "instructor": "Rajiv Kapoor",
            "thumbnail": "",
            "modules": [
                {"title": "Foundations of High-Impact Pitching", "description": "AIDA, FAB, and challenger frameworks", "duration": "2h", "order": 1, "lessons": ["What makes a pitch memorable", "The AIDA model in action", "Challenger vs consultative selling"]},
                {"title": "Storytelling for Sales", "description": "Narrative arcs that drive decisions", "duration": "2.5h", "order": 2, "lessons": ["Customer success story structure", "Data-driven storytelling", "Emotional anchoring techniques"]},
                {"title": "Executive-Level Pitching", "description": "Tailoring message for C-suite", "duration": "2h", "order": 3, "lessons": ["Understanding executive priorities", "ROI framing for decision makers", "Handling executive objections"]},
                {"title": "Live Pitch Practice & Critique", "description": "Hands-on roleplay sessions", "duration": "2.5h", "order": 4, "lessons": ["Recorded pitch submission", "Peer feedback framework", "Coach critique session"]},
                {"title": "Pitch Certification Assessment", "description": "Final evaluation module", "duration": "1h", "order": 5, "lessons": ["Written pitch deck submission", "Live oral examination"]},
            ],
            "assignments": [
                {"title": "30-Second Elevator Pitch Video", "description": "Record and submit a 30-second sales pitch for a product of your choice.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "C-Suite Pitch Deck", "description": "Create a 5-slide executive pitch deck for a B2B solution.", "dueDate": None, "status": "Pending", "maxScore": 100},
            ],
            "quizzes": [
                {"title": "Pitch Framework Quiz", "questions": 15, "passingScore": 70, "timeLimit": 20},
                {"title": "Storytelling Assessment", "questions": 10, "passingScore": 75, "timeLimit": 15},
            ],
            "rating": 4.8,
            "enrolledUsers": 0,
            "status": "Published",
            "isRecommended": True,
            "isNew": False,
            "tags": ["Sales", "Pitch", "Advanced", "Recommended"],
        },
        {
            "title": "Objection Handling & Negotiation Skills",
            "description": (
                "Master the psychology behind customer objections and learn proven counter-techniques. "
                "This course covers the LAER (Listen-Acknowledge-Explore-Respond) framework, price "
                "negotiation tactics, competitive positioning, and win-win deal closing strategies."
            ),
            "category": "Sales",
            "level": "Intermediate",
            "duration": "10 hours",
            "instructor": "Priya Mehta",
            "thumbnail": "",
            "modules": [
                {"title": "Psychology of Objections", "description": "Why customers push back and what it really means", "duration": "2h", "order": 1, "lessons": ["Types of objections", "Hidden vs stated objections", "Emotional vs logical objections"]},
                {"title": "The LAER Framework", "description": "Listen, Acknowledge, Explore, Respond", "duration": "2h", "order": 2, "lessons": ["Active listening techniques", "Empathy statements", "Exploratory questions", "Response scripting"]},
                {"title": "Price & Value Negotiation", "description": "Defend your price and negotiate terms", "duration": "2.5h", "order": 3, "lessons": ["Anchoring techniques", "Concession management", "Value-price mapping"]},
                {"title": "Closing Techniques", "description": "Move from negotiation to signed deal", "duration": "2h", "order": 4, "lessons": ["Trial close methods", "Urgency creation", "The assumptive close", "Next steps clarity"]},
                {"title": "Simulation: Live Negotiation", "description": "Roleplay-based final assessment", "duration": "1.5h", "order": 5, "lessons": ["Negotiation roleplay scenario", "Debrief and scoring"]},
            ],
            "assignments": [
                {"title": "Objection Response Script", "description": "Write responses to the 10 most common sales objections in your industry.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "Negotiation Roleplay Recording", "description": "Record a mock negotiation with a colleague.", "dueDate": None, "status": "Pending", "maxScore": 100},
            ],
            "quizzes": [
                {"title": "Objection Handling Quiz", "questions": 12, "passingScore": 70, "timeLimit": 15},
                {"title": "Negotiation Tactics Assessment", "questions": 10, "passingScore": 75, "timeLimit": 15},
            ],
            "rating": 4.7,
            "enrolledUsers": 0,
            "status": "Published",
            "isRecommended": True,
            "isNew": False,
            "tags": ["Sales", "Negotiation", "Intermediate", "Recommended"],
        },
        {
            "title": "High Conversion Sales Training",
            "description": (
                "A data-driven course built on conversion optimization principles applied to the sales process. "
                "Learn pipeline management, lead scoring, follow-up cadences, CRM best practices, and how to "
                "analyze your win/loss data to continuously improve close rates."
            ),
            "category": "Sales",
            "level": "Intermediate",
            "duration": "8 hours",
            "instructor": "Karan Patel",
            "thumbnail": "",
            "modules": [
                {"title": "Understanding Your Pipeline", "description": "Stages, velocity, and conversion metrics", "duration": "1.5h", "order": 1, "lessons": ["Pipeline anatomy", "Identifying bottlenecks", "Conversion benchmarks"]},
                {"title": "Lead Scoring & Prioritization", "description": "Focus energy on highest-value opportunities", "duration": "2h", "order": 2, "lessons": ["ICP definition", "BANT and MEDDIC frameworks", "CRM lead scoring setup"]},
                {"title": "Follow-Up Cadences", "description": "Multi-touch sequences that convert", "duration": "2h", "order": 3, "lessons": ["Email sequence design", "Call cadence timing", "LinkedIn outreach integration"]},
                {"title": "Win-Loss Analysis", "description": "Learn from every deal outcome", "duration": "1.5h", "order": 4, "lessons": ["Win interview process", "Loss analysis template", "Pattern recognition"]},
                {"title": "CRM Mastery for Sales", "description": "Leverage your CRM for conversion", "duration": "1h", "order": 5, "lessons": ["CRM data hygiene", "Pipeline reporting", "Activity logging discipline"]},
            ],
            "assignments": [
                {"title": "Pipeline Audit Report", "description": "Analyze your current pipeline and identify the top 3 bottlenecks with recommendations.", "dueDate": None, "status": "Pending", "maxScore": 100},
            ],
            "quizzes": [
                {"title": "Pipeline & Lead Scoring Quiz", "questions": 15, "passingScore": 70, "timeLimit": 20},
            ],
            "rating": 4.6,
            "enrolledUsers": 0,
            "status": "Published",
            "isRecommended": False,
            "isNew": True,
            "tags": ["Sales", "Conversion", "CRM", "New"],
        },
        {
            "title": "Inside Sales Executive Certification",
            "description": (
                "A comprehensive certification program for inside sales professionals. Covers "
                "prospecting, cold calling, email outreach, demo delivery, and contract negotiation—all "
                "in a remote selling context. Earn your Inside Sales Executive badge upon completion."
            ),
            "category": "Sales",
            "level": "Beginner",
            "duration": "15 hours",
            "instructor": "Neha Singh",
            "thumbnail": "",
            "modules": [
                {"title": "Inside Sales Fundamentals", "description": "Remote selling environment and mindset", "duration": "2h", "order": 1, "lessons": ["Inside vs field sales", "Remote selling tools", "Daily discipline and KPIs"]},
                {"title": "Prospecting & Outreach", "description": "Finding and qualifying potential buyers", "duration": "3h", "order": 2, "lessons": ["Ideal customer profile", "Cold call scripting", "Email copywriting", "LinkedIn prospecting"]},
                {"title": "Discovery & Demo Delivery", "description": "Qualify deep and present value", "duration": "3h", "order": 3, "lessons": ["Discovery call framework", "Demo best practices", "Handling questions live"]},
                {"title": "Proposal to Close", "description": "From quote to signed contract", "duration": "3h", "order": 4, "lessons": ["Proposal writing", "Pricing strategy", "Legal and contract basics"]},
                {"title": "Certification Exam", "description": "Final comprehensive assessment", "duration": "2h", "order": 5, "lessons": ["Mock sales scenario", "Written knowledge test"]},
            ],
            "assignments": [
                {"title": "Cold Call Script Submission", "description": "Submit a tested cold call script for your product/service vertical.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "Demo Recording", "description": "Record a 10-minute product demo and submit for evaluation.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "Proposal Document", "description": "Create a professional proposal document based on a provided case study.", "dueDate": None, "status": "Pending", "maxScore": 100},
            ],
            "quizzes": [
                {"title": "Prospecting Techniques Quiz", "questions": 15, "passingScore": 70, "timeLimit": 20},
                {"title": "Final Certification Exam", "questions": 30, "passingScore": 80, "timeLimit": 45},
            ],
            "rating": 4.9,
            "enrolledUsers": 0,
            "status": "Published",
            "isRecommended": True,
            "isNew": False,
            "tags": ["Sales", "Certification", "Beginner", "Inside Sales", "Recommended"],
        },
        # ── SUPPORT ────────────────────────────────────────────────────────────
        {
            "title": "Customer Support Ticket Simulation",
            "description": (
                "Hands-on simulation course where learners handle realistic customer support scenarios "
                "across chat, email, and phone channels. Covers ticket triage, SLA management, knowledge "
                "base usage, empathy communication, and CSAT optimization."
            ),
            "category": "Support",
            "level": "Beginner",
            "duration": "8 hours",
            "instructor": "Simran Kaur",
            "thumbnail": "",
            "modules": [
                {"title": "Support Fundamentals", "description": "Role, tools, and SLA basics", "duration": "1.5h", "order": 1, "lessons": ["The support agent role", "Ticketing systems overview", "SLA and priority levels"]},
                {"title": "Empathy-First Communication", "description": "De-escalation and tone management", "duration": "2h", "order": 2, "lessons": ["Active listening for support", "Empathy statements library", "Managing frustrated customers"]},
                {"title": "Ticket Triage & Resolution", "description": "Classify, route, and resolve efficiently", "duration": "2h", "order": 3, "lessons": ["Ticket categorization", "Escalation triggers", "Resolution best practices"]},
                {"title": "Knowledge Base Mastery", "description": "Use and contribute to your KB", "duration": "1.5h", "order": 4, "lessons": ["Effective KB searching", "Writing KB articles", "Feedback loops"]},
                {"title": "CSAT & Quality Metrics", "description": "Understand and improve your scores", "duration": "1h", "order": 5, "lessons": ["CSAT, NPS, CES explained", "Quality review process", "Self-improvement planning"]},
            ],
            "assignments": [
                {"title": "Ticket Simulation Set 1", "description": "Handle a set of 5 simulated customer tickets and submit your written responses.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "KB Article Submission", "description": "Write a knowledge base article for a common customer issue.", "dueDate": None, "status": "Pending", "maxScore": 100},
            ],
            "quizzes": [
                {"title": "Support Fundamentals Quiz", "questions": 10, "passingScore": 70, "timeLimit": 15},
                {"title": "Empathy & Communication Assessment", "questions": 12, "passingScore": 75, "timeLimit": 15},
            ],
            "rating": 4.5,
            "enrolledUsers": 0,
            "status": "Published",
            "isRecommended": False,
            "isNew": True,
            "tags": ["Support", "Simulation", "Beginner", "New"],
        },
        {
            "title": "Escalation Management Specialist",
            "description": (
                "Develop expertise in handling escalated customer cases that require senior intervention. "
                "Learn root cause analysis, executive communication, cross-functional coordination, "
                "and post-escalation prevention strategies to reduce repeat escalations by 40%."
            ),
            "category": "Support",
            "level": "Advanced",
            "duration": "10 hours",
            "instructor": "Arjun Verma",
            "thumbnail": "",
            "modules": [
                {"title": "Escalation Triggers & Types", "description": "Identify and classify escalations early", "duration": "2h", "order": 1, "lessons": ["Technical vs emotional escalations", "Early warning signals", "Prevention framework"]},
                {"title": "Root Cause Analysis", "description": "Find the real problem, not just symptoms", "duration": "2.5h", "order": 2, "lessons": ["5 Whys methodology", "Fishbone diagram", "Documentation standards"]},
                {"title": "Executive Communication", "description": "Communicate escalations to leadership", "duration": "2h", "order": 3, "lessons": ["Concise briefing format", "Risk communication", "Status update cadence"]},
                {"title": "Cross-Team Coordination", "description": "Work with engineering, sales, and product", "duration": "2h", "order": 4, "lessons": ["RACI for escalations", "Stakeholder management", "Handoff protocols"]},
                {"title": "Post-Escalation Review", "description": "Learn and prevent recurrence", "duration": "1.5h", "order": 5, "lessons": ["Post-mortem template", "Process improvement", "Customer recovery plan"]},
            ],
            "assignments": [
                {"title": "Escalation Case Study Analysis", "description": "Analyze a provided escalation case and submit a root cause analysis report.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "Executive Briefing Draft", "description": "Write an executive briefing for a complex escalation scenario.", "dueDate": None, "status": "Pending", "maxScore": 100},
            ],
            "quizzes": [
                {"title": "Escalation Framework Quiz", "questions": 15, "passingScore": 75, "timeLimit": 20},
                {"title": "Root Cause Analysis Test", "questions": 10, "passingScore": 70, "timeLimit": 15},
            ],
            "rating": 4.7,
            "enrolledUsers": 0,
            "status": "Published",
            "isRecommended": True,
            "isNew": False,
            "tags": ["Support", "Escalation", "Advanced", "Recommended"],
        },
        {
            "title": "Helpdesk Support Professional Certification",
            "description": (
                "A complete certification track for helpdesk support professionals. Master ITIL-aligned "
                "processes, remote support tools, multi-channel support delivery, incident management, "
                "and professional development for a Tier 2 support career path."
            ),
            "category": "Support",
            "level": "Intermediate",
            "duration": "14 hours",
            "instructor": "Raju Sharma",
            "thumbnail": "",
            "modules": [
                {"title": "ITIL Foundations for Support", "description": "Industry framework for service management", "duration": "2.5h", "order": 1, "lessons": ["ITIL key concepts", "Incident vs service request", "Change management basics"]},
                {"title": "Remote Support Tools", "description": "Master your helpdesk toolset", "duration": "2.5h", "order": 2, "lessons": ["Remote desktop tools", "Screen sharing best practices", "Documentation during sessions"]},
                {"title": "Multi-Channel Support", "description": "Phone, chat, email, and self-service", "duration": "3h", "order": 3, "lessons": ["Channel-appropriate communication", "Omnichannel ticketing", "Self-service portal management"]},
                {"title": "Incident Management", "description": "From detection to resolution", "duration": "3h", "order": 4, "lessons": ["Incident lifecycle", "Priority matrix", "Communication during incidents", "Post-incident review"]},
                {"title": "Certification Exam", "description": "Comprehensive knowledge test", "duration": "2h", "order": 5, "lessons": ["Practice exam set", "Final certification exam"]},
            ],
            "assignments": [
                {"title": "ITIL Process Map", "description": "Create a process flow diagram for incident management at your organization.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "Support Channel Audit", "description": "Audit your current support channels and recommend improvements.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "Incident Post-Mortem", "description": "Complete a post-mortem for a real or simulated major incident.", "dueDate": None, "status": "Pending", "maxScore": 100},
            ],
            "quizzes": [
                {"title": "ITIL Foundations Quiz", "questions": 20, "passingScore": 70, "timeLimit": 25},
                {"title": "Helpdesk Certification Exam", "questions": 35, "passingScore": 80, "timeLimit": 50},
            ],
            "rating": 4.8,
            "enrolledUsers": 0,
            "status": "Published",
            "isRecommended": True,
            "isNew": False,
            "tags": ["Support", "Certification", "ITIL", "Intermediate", "Recommended"],
        },
        # ── OPERATIONS ─────────────────────────────────────────────────────────
        {
            "title": "SOP Workflow Management Professional",
            "description": (
                "Learn to design, document, implement, and continuously improve Standard Operating Procedures. "
                "This course covers process mapping, flowchart design, version control for SOPs, "
                "compliance alignment, and how to train teams on updated workflows."
            ),
            "category": "Operations",
            "level": "Intermediate",
            "duration": "10 hours",
            "instructor": "Neha Singh",
            "thumbnail": "",
            "modules": [
                {"title": "Process Mapping Fundamentals", "description": "Document and visualize workflows", "duration": "2h", "order": 1, "lessons": ["Process vs procedure", "SIPOC diagrams", "Swimlane flowcharts"]},
                {"title": "Writing Effective SOPs", "description": "Clear, actionable procedure documentation", "duration": "2.5h", "order": 2, "lessons": ["SOP structure and format", "Writing for diverse audiences", "Step-by-step instruction design"]},
                {"title": "SOP Version Control", "description": "Manage document lifecycle", "duration": "1.5h", "order": 3, "lessons": ["Version numbering systems", "Review and approval workflows", "Archive management"]},
                {"title": "Compliance Alignment", "description": "Ensure SOPs meet regulatory requirements", "duration": "2h", "order": 4, "lessons": ["Industry compliance frameworks", "Gap analysis", "Audit readiness"]},
                {"title": "Training Teams on SOPs", "description": "Ensure adoption and adherence", "duration": "2h", "order": 5, "lessons": ["Training material development", "Competency verification", "Ongoing reinforcement"]},
            ],
            "assignments": [
                {"title": "SOP Draft Submission", "description": "Write a complete SOP for a process in your department using the provided template.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "Process Map Diagram", "description": "Create a swimlane flowchart for an existing operational process.", "dueDate": None, "status": "Pending", "maxScore": 100},
            ],
            "quizzes": [
                {"title": "Process Mapping Quiz", "questions": 12, "passingScore": 70, "timeLimit": 15},
                {"title": "SOP Writing Assessment", "questions": 15, "passingScore": 75, "timeLimit": 20},
            ],
            "rating": 4.6,
            "enrolledUsers": 0,
            "status": "Published",
            "isRecommended": False,
            "isNew": True,
            "tags": ["Operations", "SOP", "Intermediate", "New"],
        },
        {
            "title": "Compliance & Risk Certification",
            "description": (
                "A rigorous certification program covering enterprise risk management, regulatory compliance, "
                "data privacy (GDPR, PDPA), internal controls, audit preparation, and incident response "
                "planning. Designed for operations professionals in regulated industries."
            ),
            "category": "Operations",
            "level": "Advanced",
            "duration": "16 hours",
            "instructor": "Karan Patel",
            "thumbnail": "",
            "modules": [
                {"title": "Enterprise Risk Management", "description": "Identify, assess, and mitigate risks", "duration": "3h", "order": 1, "lessons": ["Risk taxonomy", "Risk assessment matrix", "Risk appetite and tolerance", "Risk register management"]},
                {"title": "Regulatory Compliance Frameworks", "description": "Navigate global and local regulations", "duration": "3h", "order": 2, "lessons": ["ISO 27001 overview", "GDPR fundamentals", "Industry-specific regulations", "Compliance calendar management"]},
                {"title": "Data Privacy & Security", "description": "Protect personal and business data", "duration": "3h", "order": 3, "lessons": ["Data classification", "Privacy by design", "Breach notification procedures", "Vendor risk management"]},
                {"title": "Internal Controls & Audit", "description": "Build and validate control frameworks", "duration": "3h", "order": 4, "lessons": ["Control design principles", "Audit evidence collection", "Internal audit process", "Remediation tracking"]},
                {"title": "Certification Examination", "description": "Comprehensive compliance knowledge test", "duration": "2h", "order": 5, "lessons": ["Practice exam", "Final certification exam"]},
            ],
            "assignments": [
                {"title": "Risk Register Creation", "description": "Build a risk register for your department identifying top 10 risks with mitigation plans.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "Compliance Gap Analysis", "description": "Conduct a gap analysis against a provided regulatory framework.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "Data Privacy Impact Assessment", "description": "Complete a DPIA for a hypothetical new system implementation.", "dueDate": None, "status": "Pending", "maxScore": 100},
            ],
            "quizzes": [
                {"title": "Risk Management Quiz", "questions": 20, "passingScore": 75, "timeLimit": 25},
                {"title": "Compliance Frameworks Test", "questions": 20, "passingScore": 75, "timeLimit": 25},
                {"title": "Final Certification Exam", "questions": 40, "passingScore": 80, "timeLimit": 60},
            ],
            "rating": 4.9,
            "enrolledUsers": 0,
            "status": "Published",
            "isRecommended": True,
            "isNew": False,
            "tags": ["Operations", "Compliance", "Risk", "Advanced", "Certification", "Recommended"],
        },
        {
            "title": "Operations Excellence Program",
            "description": (
                "A complete operational excellence transformation program using Lean, Six Sigma, and "
                "Kaizen methodologies. Learn to eliminate waste, reduce variation, improve throughput, "
                "and build a culture of continuous improvement across your operations teams."
            ),
            "category": "Operations",
            "level": "Advanced",
            "duration": "18 hours",
            "instructor": "Rajiv Kapoor",
            "thumbnail": "",
            "modules": [
                {"title": "Lean Principles", "description": "Eliminate waste and create flow", "duration": "3.5h", "order": 1, "lessons": ["8 wastes of lean (TIMWOODS)", "Value stream mapping", "5S workplace organization", "Just-in-time principles"]},
                {"title": "Six Sigma Fundamentals", "description": "Data-driven quality improvement", "duration": "4h", "order": 2, "lessons": ["DMAIC methodology", "Statistical process control basics", "Cause & effect analysis", "Control charts"]},
                {"title": "Kaizen & Continuous Improvement", "description": "Build a CI culture", "duration": "3h", "order": 3, "lessons": ["Kaizen event planning", "Rapid improvement workshops", "Sustaining gains", "Gemba walks"]},
                {"title": "Metrics & Dashboards", "description": "Measure what matters", "duration": "3.5h", "order": 4, "lessons": ["KPI selection framework", "Operational dashboard design", "Leading vs lagging indicators", "Review cadence design"]},
                {"title": "Change Management for Ops", "description": "Lead people through transformation", "duration": "2h", "order": 5, "lessons": ["Resistance management", "Communication planning", "Stakeholder engagement", "Sustaining culture change"]},
                {"title": "Capstone Project", "description": "Real-world improvement project", "duration": "2h", "order": 6, "lessons": ["Project charter submission", "Final presentation"]},
            ],
            "assignments": [
                {"title": "Value Stream Map", "description": "Create a current-state and future-state value stream map for a selected process.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "DMAIC Project Report", "description": "Complete a DMAIC report for a real improvement opportunity in your work area.", "dueDate": None, "status": "Pending", "maxScore": 100},
                {"title": "Kaizen Event Plan", "description": "Plan a 3-day Kaizen event for a targeted process improvement.", "dueDate": None, "status": "Pending", "maxScore": 100},
            ],
            "quizzes": [
                {"title": "Lean Principles Assessment", "questions": 15, "passingScore": 70, "timeLimit": 20},
                {"title": "Six Sigma Fundamentals Quiz", "questions": 20, "passingScore": 75, "timeLimit": 25},
                {"title": "Operations Excellence Exam", "questions": 35, "passingScore": 80, "timeLimit": 50},
            ],
            "rating": 4.9,
            "enrolledUsers": 0,
            "status": "Published",
            "isRecommended": True,
            "isNew": False,
            "tags": ["Operations", "Lean", "Six Sigma", "Excellence", "Advanced", "Recommended"],
        },
    ]

    # Add timestamps
    for course in default_courses:
        course["createdAt"] = now
        course["updatedAt"] = now

    if force and count > 0:
        await col.delete_many({})

    result = await col.insert_many(default_courses)
    await col.create_index("category")
    await col.create_index("status")
    await col.create_index([("title", "text"), ("description", "text")])

    return {
        "message": "Default courses seeded successfully",
        "inserted_count": len(result.inserted_ids),
        "seeded": True,
        "categories": {"Sales": 4, "Support": 3, "Operations": 3},
    }
