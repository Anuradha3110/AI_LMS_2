"""
Adaptive Rules Workspace — MongoDB Router.
Governs AI assistant behavior across all user roles in the LMS platform.
Collections:
  adaptive_rules           — core rule definitions
  adaptive_role_configs    — per-role AI behavior configuration
  adaptive_global_config   — global AI behavior settings (single doc)
  adaptive_prompt_templates— reusable prompt templates
  adaptive_rule_analytics  — per-rule usage & performance analytics
  adaptive_rule_versions   — rule version history
"""
import asyncio
import random
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.mongodb.connection import webx_db

router = APIRouter(prefix="/api/mongo/adaptive-rules", tags=["Adaptive Rules Workspace"])

# ── Collection accessors ──────────────────────────────────────────────────────
def _rules():     return webx_db()["adaptive_rules"]
def _role_cfg():  return webx_db()["adaptive_role_configs"]
def _global():    return webx_db()["adaptive_global_config"]
def _templates(): return webx_db()["adaptive_prompt_templates"]
def _analytics(): return webx_db()["adaptive_rule_analytics"]
def _versions():  return webx_db()["adaptive_rule_versions"]

# ── Serialiser ────────────────────────────────────────────────────────────────
def _s(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    for f in ("created_at", "updated_at", "published_at", "submitted_at", "approved_at", "rejected_at"):
        if isinstance(doc.get(f), datetime):
            doc[f] = doc[f].isoformat()
    return doc

# ── Seed data ─────────────────────────────────────────────────────────────────
_RULE_SEEDS = [
    # Global Rules
    {"name": "Default AI Tone Policy", "category": "global", "sub_category": "tone", "priority": 1, "status": "active", "audience": ["global"], "description": "Sets the default professional tone for all AI responses across the platform.", "tone": "professional", "formality": "formal", "depth": "balanced", "allowed_topics": ["learning", "courses", "support", "general"], "restricted_topics": ["politics", "religion", "personal_advice"], "escalation_enabled": True, "owner": "System Admin", "tags": ["global", "tone", "core"]},
    {"name": "Safety Content Filter", "category": "global", "sub_category": "safety", "priority": 1, "status": "active", "audience": ["global"], "description": "Filters unsafe, harmful, or inappropriate content from AI responses.", "tone": "neutral", "formality": "formal", "depth": "minimal", "allowed_topics": ["all"], "restricted_topics": ["harmful_content", "violence", "hate_speech"], "escalation_enabled": True, "owner": "System Admin", "tags": ["global", "safety", "core"]},
    {"name": "Compliance Enforcement Rule", "category": "global", "sub_category": "compliance", "priority": 1, "status": "active", "audience": ["global"], "description": "Ensures AI responses comply with organizational data protection and privacy policies.", "tone": "professional", "formality": "formal", "depth": "balanced", "allowed_topics": ["all"], "restricted_topics": ["personal_data", "financial_data"], "escalation_enabled": True, "owner": "Compliance Team", "tags": ["global", "compliance", "legal"]},
    {"name": "Language Enforcement Policy", "category": "global", "sub_category": "language", "priority": 2, "status": "active", "audience": ["global"], "description": "Enforces English as the primary response language with regional language support.", "tone": "professional", "formality": "formal", "depth": "balanced", "allowed_topics": ["all"], "restricted_topics": [], "escalation_enabled": False, "owner": "System Admin", "tags": ["global", "language"]},
    {"name": "Escalation Trigger Protocol", "category": "global", "sub_category": "escalation", "priority": 1, "status": "active", "audience": ["global"], "description": "Defines conditions under which the AI should escalate queries to human agents.", "tone": "empathetic", "formality": "formal", "depth": "detailed", "allowed_topics": ["all"], "restricted_topics": [], "escalation_enabled": True, "owner": "Support Lead", "tags": ["global", "escalation", "support"]},
    {"name": "Restricted Topics Boundary", "category": "global", "sub_category": "restricted", "priority": 1, "status": "active", "audience": ["global"], "description": "Prevents AI from discussing topics outside the LMS scope.", "tone": "professional", "formality": "formal", "depth": "minimal", "allowed_topics": ["learning", "courses", "assessments"], "restricted_topics": ["off_topic", "personal", "external"], "escalation_enabled": False, "owner": "System Admin", "tags": ["global", "boundaries"]},
    # Role-Based Rules
    {"name": "Admin Unrestricted Access", "category": "role_based", "sub_category": "admin", "priority": 1, "status": "active", "audience": ["admin"], "description": "Grants admin role full access to all AI capabilities including analytics and governance insights.", "tone": "analytical", "formality": "semi-formal", "depth": "detailed", "allowed_topics": ["all"], "restricted_topics": [], "escalation_enabled": False, "owner": "Platform Admin", "tags": ["role", "admin"]},
    {"name": "Manager Executive Summary Rule", "category": "role_based", "sub_category": "manager", "priority": 1, "status": "active", "audience": ["manager"], "description": "Provides managers with executive-level summaries of team performance and learning metrics.", "tone": "executive", "formality": "formal", "depth": "summary", "allowed_topics": ["team_data", "analytics", "performance", "reporting"], "restricted_topics": ["employee_personal_data"], "escalation_enabled": False, "owner": "Operations Lead", "tags": ["role", "manager", "analytics"]},
    {"name": "Employee Learning Guidance", "category": "role_based", "sub_category": "employee", "priority": 2, "status": "active", "audience": ["employee"], "description": "Guides employees with beginner-friendly explanations and step-by-step learning support.", "tone": "encouraging", "formality": "casual", "depth": "beginner", "allowed_topics": ["courses", "assessments", "progress", "support"], "restricted_topics": ["admin_data", "sensitive_hr"], "escalation_enabled": True, "owner": "L&D Team", "tags": ["role", "employee", "learning"]},
    {"name": "Instructor Pedagogy Support", "category": "role_based", "sub_category": "instructor", "priority": 1, "status": "active", "audience": ["instructor"], "description": "Supports instructors with pedagogical guidance, course design tips, and learner engagement strategies.", "tone": "collaborative", "formality": "semi-formal", "depth": "expert", "allowed_topics": ["course_design", "assessments", "learner_analytics", "content"], "restricted_topics": ["hr_data", "financial_data"], "escalation_enabled": False, "owner": "Curriculum Team", "tags": ["role", "instructor", "pedagogy"]},
    {"name": "Learner Adaptive Coaching", "category": "role_based", "sub_category": "learner", "priority": 2, "status": "active", "audience": ["learner"], "description": "Personalizes AI responses based on learner progress, skill level, and learning history.", "tone": "motivational", "formality": "casual", "depth": "adaptive", "allowed_topics": ["courses", "quizzes", "progress", "motivation"], "restricted_topics": ["other_learner_data", "admin_data"], "escalation_enabled": True, "owner": "L&D Team", "tags": ["role", "learner", "personalization"]},
    {"name": "HR Sensitive Topic Handler", "category": "role_based", "sub_category": "hr", "priority": 1, "status": "active", "audience": ["hr"], "description": "Handles HR-sensitive topics with strict privacy controls and escalation protocols.", "tone": "empathetic", "formality": "formal", "depth": "careful", "allowed_topics": ["hr_policies", "employee_data", "compliance"], "restricted_topics": ["financial_data", "legal_decisions"], "escalation_enabled": True, "owner": "HR Director", "tags": ["role", "hr", "sensitive"]},
    # Learning Behavior Rules
    {"name": "Beginner Coaching Protocol", "category": "learning_behavior", "sub_category": "coaching", "priority": 2, "status": "active", "audience": ["learner", "employee"], "description": "Uses simplified language, analogies, and step-by-step guidance for beginner learners.", "tone": "nurturing", "formality": "casual", "depth": "beginner", "allowed_topics": ["all"], "restricted_topics": [], "escalation_enabled": False, "owner": "L&D Team", "tags": ["behavior", "coaching", "beginner"]},
    {"name": "Assessment Hint Provider", "category": "learning_behavior", "sub_category": "assessment", "priority": 2, "status": "active", "audience": ["learner", "employee", "instructor"], "description": "Provides hints and guidance during assessments without giving direct answers.", "tone": "guiding", "formality": "casual", "depth": "hints_only", "allowed_topics": ["assessments", "study_tips"], "restricted_topics": ["direct_answers"], "escalation_enabled": False, "owner": "Assessment Team", "tags": ["behavior", "assessment", "hints"]},
    {"name": "Quiz Encouragement Rule", "category": "learning_behavior", "sub_category": "quiz", "priority": 3, "status": "active", "audience": ["learner", "employee"], "description": "Encourages learners during quizzes and provides direction without revealing answers.", "tone": "encouraging", "formality": "casual", "depth": "supportive", "allowed_topics": ["quiz_tips", "study_strategies"], "restricted_topics": ["quiz_answers"], "escalation_enabled": False, "owner": "L&D Team", "tags": ["behavior", "quiz"]},
    {"name": "Motivational Nudge Engine", "category": "learning_behavior", "sub_category": "motivation", "priority": 3, "status": "active", "audience": ["learner", "employee"], "description": "Sends personalized motivational messages when learner progress stalls or drops.", "tone": "inspiring", "formality": "casual", "depth": "emotional", "allowed_topics": ["motivation", "progress", "achievement"], "restricted_topics": [], "escalation_enabled": False, "owner": "Engagement Team", "tags": ["behavior", "motivation"]},
    {"name": "Constructive Feedback Style", "category": "learning_behavior", "sub_category": "feedback", "priority": 2, "status": "active", "audience": ["learner", "instructor", "employee"], "description": "Delivers constructive, positive feedback highlighting growth and improvement areas.", "tone": "constructive", "formality": "semi-formal", "depth": "balanced", "allowed_topics": ["feedback", "performance", "improvement"], "restricted_topics": [], "escalation_enabled": False, "owner": "L&D Team", "tags": ["behavior", "feedback"]},
    {"name": "Progress Nudge Trigger", "category": "learning_behavior", "sub_category": "nudges", "priority": 3, "status": "active", "audience": ["learner", "employee"], "description": "Triggers proactive progress nudges when learners are behind schedule.", "tone": "encouraging", "formality": "casual", "depth": "brief", "allowed_topics": ["progress", "reminders", "schedule"], "restricted_topics": [], "escalation_enabled": False, "owner": "Engagement Team", "tags": ["behavior", "nudges"]},
    # Permission Controls
    {"name": "View Permission Controller", "category": "permissions", "sub_category": "view", "priority": 1, "status": "active", "audience": ["global"], "description": "Controls which data types each role can view in AI responses.", "tone": "neutral", "formality": "formal", "depth": "controlled", "allowed_topics": ["role_appropriate_data"], "restricted_topics": ["unauthorized_data"], "escalation_enabled": True, "owner": "Security Team", "tags": ["permissions", "view"]},
    {"name": "Data Access Boundary Rule", "category": "permissions", "sub_category": "data_access", "priority": 1, "status": "active", "audience": ["global"], "description": "Limits the depth and scope of data the AI can reference in responses.", "tone": "neutral", "formality": "formal", "depth": "restricted", "allowed_topics": ["authorized_data"], "restricted_topics": ["sensitive_data", "pii"], "escalation_enabled": True, "owner": "Data Privacy Team", "tags": ["permissions", "data", "privacy"]},
    # Personalization
    {"name": "Department Personalization Rule", "category": "personalization", "sub_category": "department", "priority": 3, "status": "active", "audience": ["global"], "description": "Tailors AI responses based on the user's department context.", "tone": "contextual", "formality": "semi-formal", "depth": "relevant", "allowed_topics": ["department_content"], "restricted_topics": [], "escalation_enabled": False, "owner": "L&D Team", "tags": ["personalization", "department"]},
    {"name": "Experience Level Adapter", "category": "personalization", "sub_category": "experience", "priority": 3, "status": "active", "audience": ["global"], "description": "Adjusts response complexity based on user's experience level.", "tone": "adaptive", "formality": "adaptive", "depth": "adaptive", "allowed_topics": ["all"], "restricted_topics": [], "escalation_enabled": False, "owner": "L&D Team", "tags": ["personalization", "experience"]},
    # Draft/Pending
    {"name": "Predictive Analytics Brief", "category": "role_based", "sub_category": "manager", "priority": 2, "status": "draft", "audience": ["manager", "admin"], "description": "Provides advanced predictive analytics summaries for management reporting.", "tone": "analytical", "formality": "formal", "depth": "expert", "allowed_topics": ["analytics", "predictions", "trends"], "restricted_topics": [], "escalation_enabled": False, "owner": "Analytics Team", "tags": ["role", "manager", "analytics", "draft"]},
    {"name": "Skill Gap Coaching Protocol", "category": "learning_behavior", "sub_category": "coaching", "priority": 2, "status": "draft", "audience": ["learner", "employee"], "description": "Identifies and addresses skill gaps through targeted coaching responses.", "tone": "coaching", "formality": "semi-formal", "depth": "targeted", "allowed_topics": ["skill_gaps", "learning_paths"], "restricted_topics": [], "escalation_enabled": False, "owner": "L&D Team", "tags": ["behavior", "coaching", "skill_gap", "draft"]},
    {"name": "Regional Language Support", "category": "personalization", "sub_category": "region", "priority": 4, "status": "inactive", "audience": ["global"], "description": "Supports regional language preferences and cultural context in responses.", "tone": "cultural", "formality": "adaptive", "depth": "cultural", "allowed_topics": ["all"], "restricted_topics": [], "escalation_enabled": False, "owner": "Localization Team", "tags": ["personalization", "language", "region"]},
    {"name": "Senior Expert Mode Rule", "category": "role_based", "sub_category": "employee", "priority": 2, "status": "inactive", "audience": ["senior_employee"], "description": "Provides expert-level explanations for senior employees with advanced knowledge.", "tone": "peer", "formality": "semi-formal", "depth": "expert", "allowed_topics": ["all"], "restricted_topics": [], "escalation_enabled": False, "owner": "L&D Team", "tags": ["role", "employee", "expert"]},
]

_ROLE_CONFIG_SEEDS = [
    {"role": "admin", "display": "Admin", "tone": "analytical", "formality": "semi-formal", "depth": "detailed", "coaching_style": "strategic", "assessment_support": "full", "quiz_guidance": "advanced", "feedback_style": "direct", "motivation_style": "achievement", "allowed_topics": ["all"], "restricted_topics": [], "escalation_enabled": False, "response_limit": 2000, "data_access": "full", "personalization": True, "bias_check": True},
    {"role": "manager", "display": "Manager", "tone": "executive", "formality": "formal", "depth": "summary", "coaching_style": "leadership", "assessment_support": "team_view", "quiz_guidance": "none", "feedback_style": "constructive", "motivation_style": "results", "allowed_topics": ["team_data", "analytics", "performance"], "restricted_topics": ["personal_hr"], "escalation_enabled": False, "response_limit": 1500, "data_access": "team_level", "personalization": True, "bias_check": True},
    {"role": "employee", "display": "Employee", "tone": "encouraging", "formality": "casual", "depth": "beginner", "coaching_style": "step_by_step", "assessment_support": "hints", "quiz_guidance": "supportive", "feedback_style": "positive", "motivation_style": "growth", "allowed_topics": ["courses", "progress", "support"], "restricted_topics": ["admin_data", "sensitive_hr", "other_employees"], "escalation_enabled": True, "response_limit": 800, "data_access": "personal_only", "personalization": True, "bias_check": True},
    {"role": "instructor", "display": "Instructor", "tone": "collaborative", "formality": "semi-formal", "depth": "expert", "coaching_style": "pedagogical", "assessment_support": "full_design", "quiz_guidance": "design_focused", "feedback_style": "developmental", "motivation_style": "professional", "allowed_topics": ["course_design", "learner_analytics", "content", "assessments"], "restricted_topics": ["hr_data", "financial_data"], "escalation_enabled": False, "response_limit": 1500, "data_access": "course_level", "personalization": True, "bias_check": False},
    {"role": "learner", "display": "Learner", "tone": "motivational", "formality": "casual", "depth": "adaptive", "coaching_style": "personalized", "assessment_support": "hints_only", "quiz_guidance": "encouraging", "feedback_style": "positive_growth", "motivation_style": "intrinsic", "allowed_topics": ["own_courses", "progress", "quiz_tips"], "restricted_topics": ["other_learner_data", "admin", "hr"], "escalation_enabled": True, "response_limit": 600, "data_access": "own_data_only", "personalization": True, "bias_check": True},
    {"role": "hr", "display": "HR", "tone": "empathetic", "formality": "formal", "depth": "careful", "coaching_style": "supportive", "assessment_support": "policy_guided", "quiz_guidance": "compliance", "feedback_style": "professional", "motivation_style": "wellness", "allowed_topics": ["hr_policies", "employee_data", "compliance", "onboarding"], "restricted_topics": ["financial_data", "legal_decisions", "salary_specifics"], "escalation_enabled": True, "response_limit": 1000, "data_access": "hr_scope", "personalization": False, "bias_check": True},
    {"role": "department_head", "display": "Department Head", "tone": "strategic", "formality": "formal", "depth": "strategic", "coaching_style": "executive", "assessment_support": "department_view", "quiz_guidance": "none", "feedback_style": "strategic", "motivation_style": "results", "allowed_topics": ["department_data", "team_performance", "strategic_insights"], "restricted_topics": ["personal_hr", "financial_details"], "escalation_enabled": False, "response_limit": 1200, "data_access": "department_level", "personalization": True, "bias_check": False},
]

_GLOBAL_CONFIG_SEED = {
    "config_id": "global-01",
    "default_tone": "professional",
    "safety_level": "high",
    "compliance_mode": "strict",
    "default_language": "en",
    "escalation_triggers": ["sensitive_hr", "legal_query", "safety_concern", "data_breach", "harassment"],
    "restricted_topics": ["politics", "religion", "personal_finance", "medical_advice", "legal_advice", "competitor_info"],
    "ai_model": "llama-3.1-8b-instant",
    "max_response_tokens": 1200,
    "temperature": 0.7,
    "response_format": "markdown",
    "allow_code_generation": True,
    "allow_external_links": False,
    "require_source_citation": False,
    "fallback_to_human": True,
    "session_memory": True,
    "bias_detection": True,
    "content_moderation": True,
    "notification_email": "admin@demo.com",
}

_TEMPLATE_SEEDS = [
    {"type": "greeting", "name": "Standard Welcome", "description": "Default greeting for all users", "content": "Hello {{user_name}}! 👋 Welcome to the AI Learning Assistant. I'm here to help you with {{context}}. How can I assist you today?", "variables": ["user_name", "context"], "applicable_roles": ["all"], "status": "active"},
    {"type": "greeting", "name": "Manager Executive Welcome", "description": "Executive welcome for managers", "content": "Good {{time_of_day}}, {{user_name}}. Your team has {{active_learners}} active learners today. How can I help you with team insights?", "variables": ["time_of_day", "user_name", "active_learners"], "applicable_roles": ["manager", "admin", "department_head"], "status": "active"},
    {"type": "greeting", "name": "Learner Motivational Greeting", "description": "Encouraging greeting for learners", "content": "Welcome back, {{user_name}}! 🎯 You've completed {{progress}}% of your current course. Ready to continue your learning journey?", "variables": ["user_name", "progress"], "applicable_roles": ["learner", "employee"], "status": "active"},
    {"type": "coaching", "name": "Concept Step-by-Step", "description": "Explain a concept step by step", "content": "Let me break down {{concept}} for you:\n\n1. {{step_1}}\n2. {{step_2}}\n3. {{step_3}}\n\nDoes this make sense? Would you like to go deeper?", "variables": ["concept", "step_1", "step_2", "step_3"], "applicable_roles": ["learner", "employee"], "status": "active"},
    {"type": "coaching", "name": "Skill Gap Guidance", "description": "Address identified skill gaps", "content": "I noticed you'd benefit from strengthening your {{skill_area}} skills.\n\n📚 Recommended: {{course_name}}\n⏱️ Duration: {{duration}}\n🎯 Goal: {{learning_objective}}", "variables": ["skill_area", "course_name", "duration", "learning_objective"], "applicable_roles": ["employee", "learner"], "status": "active"},
    {"type": "coaching", "name": "Progress Milestone Coach", "description": "Coaching based on progress milestone", "content": "Great job, {{user_name}}! 🎉 You've advanced {{progress}}% in {{course_name}}. Next up: {{next_topic}}. You're {{days_left}} days ahead of schedule!", "variables": ["user_name", "progress", "course_name", "next_topic", "days_left"], "applicable_roles": ["learner", "employee"], "status": "active"},
    {"type": "support", "name": "Technical Issue Handler", "description": "Handle technical support requests", "content": "I understand you're experiencing an issue with {{issue_type}}.\n\n🔧 Quick Fix: {{solution_step_1}}\n📋 Alternative: {{solution_step_2}}\n\nIf the issue persists, I'll escalate to our technical team.", "variables": ["issue_type", "solution_step_1", "solution_step_2"], "applicable_roles": ["all"], "status": "active"},
    {"type": "support", "name": "Navigation Help", "description": "Help with platform navigation", "content": "To {{action}} in {{section}}:\n1. Go to {{menu_item}}\n2. Select {{option}}\n3. {{final_step}}\n\nNeed more help? I can walk you through it.", "variables": ["action", "section", "menu_item", "option", "final_step"], "applicable_roles": ["learner", "employee", "instructor"], "status": "active"},
    {"type": "escalation", "name": "HR Sensitive Matter", "description": "Escalate sensitive HR matters", "content": "I understand this is a sensitive matter regarding {{topic}}. I'm connecting you with our HR team.\n\n📧 Contact: {{hr_contact}}\n🕐 Response: {{response_time}}\n🔖 Reference: {{ticket_id}}", "variables": ["topic", "hr_contact", "response_time", "ticket_id"], "applicable_roles": ["hr", "employee", "manager"], "status": "active"},
    {"type": "escalation", "name": "Technical Escalation", "description": "Escalate technical issues to support", "content": "This requires technical team involvement. Ticket {{ticket_id}} created for {{issue_description}}.\n\n⏱️ ETA: {{eta}}\n📊 Priority: {{priority}}\n📬 Updates sent to: {{user_email}}", "variables": ["ticket_id", "issue_description", "eta", "priority", "user_email"], "applicable_roles": ["all"], "status": "active"},
    {"type": "summary", "name": "Learner Progress Summary", "description": "Summarize individual learner progress", "content": "📊 **{{user_name}}'s Learning Summary**\n✅ Completed: {{completed_courses}} courses\n🔄 In Progress: {{active_courses}}\n🏆 Certificates: {{certificates}}\n📈 Progress: {{overall_progress}}%\n🎯 Next: {{next_course}}", "variables": ["user_name", "completed_courses", "active_courses", "certificates", "overall_progress", "next_course"], "applicable_roles": ["learner", "employee", "manager"], "status": "active"},
    {"type": "summary", "name": "Team Performance Report", "description": "Team performance summary for managers", "content": "📋 **{{department}} Report — {{period}}**\n👥 Active: {{active_learners}}/{{total_team}}\n📈 Avg Completion: {{avg_completion}}%\n⭐ Top: {{top_performer}}\n⚠️ At Risk: {{at_risk_count}}\n💡 Recommendation: {{recommendation}}", "variables": ["department", "period", "active_learners", "total_team", "avg_completion", "top_performer", "at_risk_count", "recommendation"], "applicable_roles": ["manager", "admin", "department_head"], "status": "active"},
    {"type": "coaching", "name": "Quiz Recovery Support", "description": "Support after a failed quiz attempt", "content": "Don't worry about that result, {{user_name}}! 💪 {{topic}} is challenging at first.\n\n📚 Review: {{review_section}}\n🎯 Practice: {{practice_resource}}\n\nYou can retake after reviewing.", "variables": ["user_name", "topic", "review_section", "practice_resource"], "applicable_roles": ["learner", "employee"], "status": "draft"},
    {"type": "support", "name": "Compliance Query Handler", "description": "Handle compliance-related queries", "content": "Regarding {{compliance_topic}}:\n\n📋 Policy: {{policy_reference}}\n✅ Action Required: {{required_action}}\n📅 Deadline: {{deadline}}\n\nRefer to the compliance portal or contact the compliance team.", "variables": ["compliance_topic", "policy_reference", "required_action", "deadline"], "applicable_roles": ["hr", "manager", "employee"], "status": "draft"},
    {"type": "greeting", "name": "Re-engagement Welcome", "description": "Re-engage inactive learners", "content": "Welcome back, {{user_name}}! 😊 It's been {{days_inactive}} days. You have {{pending_tasks}} pending tasks. Ready to continue where you left off?", "variables": ["user_name", "days_inactive", "pending_tasks"], "applicable_roles": ["learner", "employee"], "status": "draft"},
]

# ── Auto-sync background task ─────────────────────────────────────────────────
_sync_task: Optional[asyncio.Task] = None

async def _auto_sync_loop():
    """Every 30 seconds updates analytics counters to simulate live usage."""
    while True:
        try:
            await asyncio.sleep(30)
            col = _rules()
            docs = await col.find({"status": "active"}).to_list(50)
            for doc in docs:
                inc = random.randint(0, 3)
                if inc > 0:
                    await _analytics().update_one(
                        {"rule_id": doc["rule_id"]},
                        {"$inc": {"total_usage": inc, "total_requests": inc},
                         "$set": {"last_synced": datetime.utcnow()}},
                        upsert=True,
                    )
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(10)

def start_auto_sync():
    global _sync_task
    if _sync_task is None or _sync_task.done():
        _sync_task = asyncio.ensure_future(_auto_sync_loop())

# ── Seed helpers ──────────────────────────────────────────────────────────────
async def _ensure_seeded():
    rules_col = _rules()
    if await rules_col.count_documents({}) > 0:
        return

    now = datetime.utcnow()

    # Seed rules
    rule_docs = []
    for i, r in enumerate(_RULE_SEEDS):
        rule_id = f"rule-{str(uuid.uuid4())[:8]}"
        offset = timedelta(days=random.randint(0, 30))
        rule_doc = {
            **r,
            "rule_id": rule_id,
            "version": 1,
            "approval_status": "published" if r["status"] == "active" else ("pending" if r["status"] == "draft" else "draft"),
            "conditions": _gen_conditions(r["sub_category"]),
            "created_at": now - offset,
            "updated_at": now - timedelta(days=random.randint(0, 5)),
            "published_at": (now - timedelta(days=random.randint(1, 15))) if r["status"] == "active" else None,
            "created_by": random.choice(["admin@demo.com", "hr@demo.com", "content@demo.com"]),
        }
        rule_docs.append(rule_doc)

    await rules_col.insert_many(rule_docs)
    await rules_col.create_index([("rule_id", 1)], unique=True)
    await rules_col.create_index([("category", 1)])
    await rules_col.create_index([("status", 1)])
    await rules_col.create_index([("audience", 1)])

    # Seed role configs
    role_cfg_col = _role_cfg()
    if await role_cfg_col.count_documents({}) == 0:
        for cfg in _ROLE_CONFIG_SEEDS:
            await role_cfg_col.update_one(
                {"role": cfg["role"]},
                {"$set": {**cfg, "updated_at": now}},
                upsert=True,
            )
        await role_cfg_col.create_index([("role", 1)], unique=True)

    # Seed global config
    global_col = _global()
    if await global_col.count_documents({}) == 0:
        await global_col.insert_one({**_GLOBAL_CONFIG_SEED, "updated_at": now})

    # Seed templates
    tmpl_col = _templates()
    if await tmpl_col.count_documents({}) == 0:
        for t in _TEMPLATE_SEEDS:
            await tmpl_col.insert_one({
                **t,
                "template_id": f"tmpl-{str(uuid.uuid4())[:8]}",
                "created_at": now - timedelta(days=random.randint(1, 60)),
                "updated_at": now,
                "usage_count": random.randint(0, 150),
                "created_by": "admin@demo.com",
            })
        await tmpl_col.create_index([("template_id", 1)], unique=True)
        await tmpl_col.create_index([("type", 1)])

    # Seed analytics per rule
    analytics_col = _analytics()
    if await analytics_col.count_documents({}) == 0:
        for rd in rule_docs:
            daily_usage = [random.randint(0, 80) for _ in range(30)]
            await analytics_col.insert_one({
                "rule_id": rd["rule_id"],
                "rule_name": rd["name"],
                "category": rd["category"],
                "status": rd["status"],
                "total_usage": sum(daily_usage),
                "total_requests": sum(daily_usage) + random.randint(0, 20),
                "accuracy_rate": round(random.uniform(0.78, 0.99), 3),
                "satisfaction_score": round(random.uniform(3.5, 5.0), 2),
                "escalation_count": random.randint(0, 20),
                "failure_count": random.randint(0, 8),
                "avg_response_time_ms": random.randint(200, 1500),
                "daily_usage": daily_usage,
                "last_synced": now,
            })
        await analytics_col.create_index([("rule_id", 1)])

    # Seed version history for first 5 rules
    versions_col = _versions()
    if await versions_col.count_documents({}) == 0:
        for rd in rule_docs[:5]:
            for v in range(1, 3):
                await versions_col.insert_one({
                    "version_id": str(uuid.uuid4()),
                    "rule_id": rd["rule_id"],
                    "rule_name": rd["name"],
                    "version": v,
                    "snapshot": {k: rd.get(k) for k in ["tone", "formality", "depth", "allowed_topics", "restricted_topics", "escalation_enabled"]},
                    "changed_by": "admin@demo.com",
                    "change_summary": f"Version {v}: " + random.choice(["Updated tone settings", "Added restricted topics", "Modified escalation logic", "Changed audience targeting"]),
                    "created_at": now - timedelta(days=(3 - v) * 7),
                })
        await versions_col.create_index([("rule_id", 1), ("version", -1)])


def _gen_conditions(sub_category: str) -> List[Dict[str, Any]]:
    cond_map = {
        "admin":       [{"if_field": "user_role", "operator": "equals", "value": "admin", "then_action": "full_access"}],
        "manager":     [{"if_field": "user_role", "operator": "equals", "value": "manager", "then_action": "executive_summary"}, {"if_field": "query_type", "operator": "contains", "value": "analytics", "then_action": "detailed_report"}],
        "employee":    [{"if_field": "user_role", "operator": "equals", "value": "employee", "then_action": "beginner_guidance"}],
        "instructor":  [{"if_field": "user_role", "operator": "equals", "value": "instructor", "then_action": "pedagogical_support"}],
        "learner":     [{"if_field": "user_role", "operator": "equals", "value": "learner", "then_action": "adaptive_coaching"}, {"if_field": "progress_pct", "operator": "less_than", "value": "30", "then_action": "send_nudge"}],
        "hr":          [{"if_field": "user_role", "operator": "equals", "value": "hr", "then_action": "hr_protocol"}, {"if_field": "topic", "operator": "is_sensitive", "value": "hr", "then_action": "escalate"}],
        "assessment":  [{"if_field": "context", "operator": "equals", "value": "assessment", "then_action": "provide_hints_only"}],
        "coaching":    [{"if_field": "progress_pct", "operator": "less_than", "value": "50", "then_action": "coaching_mode"}],
        "motivation":  [{"if_field": "days_inactive", "operator": "greater_than", "value": "3", "then_action": "send_motivation"}],
        "escalation":  [{"if_field": "topic_sensitivity", "operator": "equals", "value": "high", "then_action": "escalate_to_human"}],
        "safety":      [{"if_field": "content_flag", "operator": "equals", "value": "unsafe", "then_action": "block_and_report"}],
        "compliance":  [{"if_field": "data_type", "operator": "contains", "value": "pii", "then_action": "restrict_access"}],
    }
    return cond_map.get(sub_category, [{"if_field": "user_role", "operator": "exists", "value": "any", "then_action": "apply_rule"}])

# ── Pydantic models ───────────────────────────────────────────────────────────
class CreateRuleBody(BaseModel):
    name: str
    description: str
    category: str
    sub_category: str
    priority: int = 2
    status: str = "draft"
    audience: List[str] = ["global"]
    tone: str = "professional"
    formality: str = "formal"
    depth: str = "balanced"
    allowed_topics: List[str] = []
    restricted_topics: List[str] = []
    escalation_enabled: bool = False
    owner: str = "Admin"
    tags: List[str] = []
    conditions: List[Dict[str, Any]] = []

class UpdateRuleBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    audience: Optional[List[str]] = None
    tone: Optional[str] = None
    formality: Optional[str] = None
    depth: Optional[str] = None
    allowed_topics: Optional[List[str]] = None
    restricted_topics: Optional[List[str]] = None
    escalation_enabled: Optional[bool] = None
    owner: Optional[str] = None
    tags: Optional[List[str]] = None
    conditions: Optional[List[Dict[str, Any]]] = None

class UpdateRoleConfigBody(BaseModel):
    tone: Optional[str] = None
    formality: Optional[str] = None
    depth: Optional[str] = None
    coaching_style: Optional[str] = None
    assessment_support: Optional[str] = None
    quiz_guidance: Optional[str] = None
    feedback_style: Optional[str] = None
    motivation_style: Optional[str] = None
    allowed_topics: Optional[List[str]] = None
    restricted_topics: Optional[List[str]] = None
    escalation_enabled: Optional[bool] = None
    response_limit: Optional[int] = None
    data_access: Optional[str] = None
    personalization: Optional[bool] = None
    bias_check: Optional[bool] = None

class UpdateGlobalConfigBody(BaseModel):
    default_tone: Optional[str] = None
    safety_level: Optional[str] = None
    compliance_mode: Optional[str] = None
    default_language: Optional[str] = None
    escalation_triggers: Optional[List[str]] = None
    restricted_topics: Optional[List[str]] = None
    ai_model: Optional[str] = None
    max_response_tokens: Optional[int] = None
    temperature: Optional[float] = None
    allow_code_generation: Optional[bool] = None
    allow_external_links: Optional[bool] = None
    fallback_to_human: Optional[bool] = None
    session_memory: Optional[bool] = None
    bias_detection: Optional[bool] = None
    content_moderation: Optional[bool] = None
    notification_email: Optional[str] = None

class CreateTemplateBody(BaseModel):
    type: str
    name: str
    description: str
    content: str
    variables: List[str] = []
    applicable_roles: List[str] = ["all"]
    status: str = "active"

class UpdateTemplateBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[List[str]] = None
    applicable_roles: Optional[List[str]] = None
    status: Optional[str] = None

class RejectBody(BaseModel):
    reason: str = "Does not meet requirements"

class TestRuleBody(BaseModel):
    prompt: str
    role: str
    rule_id: Optional[str] = None

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/seed")
async def seed_adaptive_rules():
    """Seed all adaptive rule collections. Idempotent."""
    col = _rules()
    count = await col.count_documents({})
    if count > 0:
        return {"success": True, "message": "Already seeded", "rules_count": count}
    await _ensure_seeded()
    return {"success": True, "message": "Seeded successfully", "rules_count": await col.count_documents({})}


@router.get("/overview")
async def get_overview():
    """KPI overview cards + recent rule changes."""
    await _ensure_seeded()
    rules_col = _rules()
    now = datetime.utcnow()
    last_7d = now - timedelta(days=7)

    total = await rules_col.count_documents({})
    active = await rules_col.count_documents({"status": "active"})
    draft = await rules_col.count_documents({"status": "draft"})
    inactive = await rules_col.count_documents({"status": "inactive"})
    pending = await rules_col.count_documents({"approval_status": "pending"})

    recent = await rules_col.find(
        {"updated_at": {"$gte": last_7d}}
    ).sort("updated_at", -1).limit(8).to_list(8)

    analytics_col = _analytics()
    total_usage = await analytics_col.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$total_usage"}}}
    ]).to_list(1)

    return {
        "kpis": {
            "total_rules": total,
            "active_rules": active,
            "draft_rules": draft,
            "inactive_rules": inactive,
            "pending_approval": pending,
            "total_usage": total_usage[0]["total"] if total_usage else 0,
        },
        "recent_changes": [_s(r) for r in recent],
    }


@router.get("/rules")
async def list_rules(
    category: Optional[str] = None,
    sub_category: Optional[str] = None,
    status: Optional[str] = None,
    audience: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    """List adaptive rules with filters."""
    await _ensure_seeded()
    col = _rules()
    query: Dict[str, Any] = {}
    if category:     query["category"] = category
    if sub_category: query["sub_category"] = sub_category
    if status:       query["status"] = status
    if audience:     query["audience"] = {"$in": [audience]}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$in": [q]}},
        ]
    total = await col.count_documents(query)
    skip = (page - 1) * limit
    docs = await col.find(query).sort("priority", 1).skip(skip).limit(limit).to_list(limit)
    return {"rules": [_s(d) for d in docs], "total": total, "page": page, "limit": limit}


@router.post("/rules")
async def create_rule(body: CreateRuleBody):
    """Create a new adaptive rule."""
    await _ensure_seeded()
    now = datetime.utcnow()
    rule_id = f"rule-{str(uuid.uuid4())[:8]}"
    doc = {
        **body.dict(),
        "rule_id": rule_id,
        "version": 1,
        "approval_status": "draft",
        "created_at": now,
        "updated_at": now,
        "published_at": None,
        "created_by": "admin@demo.com",
    }
    await _rules().insert_one(doc)
    await _analytics().insert_one({
        "rule_id": rule_id,
        "rule_name": body.name,
        "category": body.category,
        "status": body.status,
        "total_usage": 0,
        "total_requests": 0,
        "accuracy_rate": 0.0,
        "satisfaction_score": 0.0,
        "escalation_count": 0,
        "failure_count": 0,
        "avg_response_time_ms": 0,
        "daily_usage": [0] * 30,
        "last_synced": now,
    })
    return {"success": True, "rule_id": rule_id}


@router.patch("/rules/{rule_id}")
async def update_rule(rule_id: str, body: UpdateRuleBody):
    """Update an existing adaptive rule."""
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.utcnow()

    existing = await _rules().find_one({"rule_id": rule_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Save version before update
    version_num = existing.get("version", 1)
    await _versions().insert_one({
        "version_id": str(uuid.uuid4()),
        "rule_id": rule_id,
        "rule_name": existing["name"],
        "version": version_num,
        "snapshot": {k: existing.get(k) for k in ["tone", "formality", "depth", "allowed_topics", "restricted_topics", "escalation_enabled", "status"]},
        "changed_by": "admin@demo.com",
        "change_summary": f"Rule updated: {', '.join(updates.keys())}",
        "created_at": datetime.utcnow(),
    })
    updates["version"] = version_num + 1

    result = await _rules().update_one({"rule_id": rule_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"success": True}


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str):
    """Delete an adaptive rule."""
    result = await _rules().delete_one({"rule_id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    await _analytics().delete_one({"rule_id": rule_id})
    return {"success": True}


@router.patch("/rules/{rule_id}/toggle")
async def toggle_rule(rule_id: str):
    """Enable or disable a rule."""
    doc = await _rules().find_one({"rule_id": rule_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Rule not found")
    new_status = "inactive" if doc["status"] == "active" else "active"
    await _rules().update_one(
        {"rule_id": rule_id},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}},
    )
    return {"success": True, "new_status": new_status}


@router.get("/role-configs")
async def get_role_configs():
    """Get all role-based AI behavior configurations."""
    await _ensure_seeded()
    docs = await _role_cfg().find({}).sort("role", 1).to_list(20)
    return {"role_configs": [_s(d) for d in docs]}


@router.patch("/role-configs/{role}")
async def update_role_config(role: str, body: UpdateRoleConfigBody):
    """Update AI behavior configuration for a specific role."""
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.utcnow()
    result = await _role_cfg().update_one({"role": role}, {"$set": updates}, upsert=True)
    if result.matched_count == 0 and result.upserted_id is None:
        raise HTTPException(status_code=404, detail="Role config not found")
    return {"success": True}


@router.get("/global-config")
async def get_global_config():
    """Get the global AI behavior configuration."""
    await _ensure_seeded()
    doc = await _global().find_one({})
    if not doc:
        raise HTTPException(status_code=404, detail="Global config not found")
    return _s(doc)


@router.patch("/global-config")
async def update_global_config(body: UpdateGlobalConfigBody):
    """Update global AI behavior settings."""
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.utcnow()
    await _global().update_one({}, {"$set": updates}, upsert=True)
    return {"success": True}


@router.get("/templates")
async def list_templates(
    type: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
):
    """List prompt templates with optional filters."""
    await _ensure_seeded()
    query: Dict[str, Any] = {}
    if type:   query["type"] = type
    if status: query["status"] = status
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    docs = await _templates().find(query).sort("type", 1).to_list(100)
    return {"templates": [_s(d) for d in docs]}


@router.post("/templates")
async def create_template(body: CreateTemplateBody):
    """Create a new prompt template."""
    await _ensure_seeded()
    now = datetime.utcnow()
    doc = {
        **body.dict(),
        "template_id": f"tmpl-{str(uuid.uuid4())[:8]}",
        "created_at": now,
        "updated_at": now,
        "usage_count": 0,
        "created_by": "admin@demo.com",
    }
    await _templates().insert_one(doc)
    return {"success": True, "template_id": doc["template_id"]}


@router.patch("/templates/{template_id}")
async def update_template(template_id: str, body: UpdateTemplateBody):
    """Update an existing prompt template."""
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.utcnow()
    result = await _templates().update_one({"template_id": template_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True}


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    """Delete a prompt template."""
    result = await _templates().delete_one({"template_id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True}


@router.get("/analytics")
async def get_analytics():
    """Comprehensive analytics for all adaptive rules."""
    await _ensure_seeded()
    analytics_col = _analytics()
    rules_col = _rules()

    all_analytics = await analytics_col.find({}).to_list(200)

    total_usage = sum(a.get("total_usage", 0) for a in all_analytics)
    avg_accuracy = round(sum(a.get("accuracy_rate", 0) for a in all_analytics) / max(len(all_analytics), 1), 3)
    avg_satisfaction = round(sum(a.get("satisfaction_score", 0) for a in all_analytics) / max(len(all_analytics), 1), 2)
    total_escalations = sum(a.get("escalation_count", 0) for a in all_analytics)
    total_failures = sum(a.get("failure_count", 0) for a in all_analytics)

    top_rules = sorted(all_analytics, key=lambda x: x.get("total_usage", 0), reverse=True)[:8]

    daily_totals = [0] * 30
    for a in all_analytics:
        for i, v in enumerate(a.get("daily_usage", [])):
            if i < 30:
                daily_totals[i] += v

    category_usage = {}
    for a in all_analytics:
        cat = a.get("category", "other")
        category_usage[cat] = category_usage.get(cat, 0) + a.get("total_usage", 0)

    status_dist = {}
    rules_list = await rules_col.find({}).to_list(200)
    for r in rules_list:
        st = r.get("status", "unknown")
        status_dist[st] = status_dist.get(st, 0) + 1

    return {
        "summary": {
            "total_usage": total_usage,
            "avg_accuracy_rate": avg_accuracy,
            "avg_satisfaction_score": avg_satisfaction,
            "total_escalations": total_escalations,
            "total_failures": total_failures,
            "approval_rate": round(sum(1 for r in rules_list if r.get("approval_status") == "published") / max(len(rules_list), 1), 3),
        },
        "top_rules": [{"rule_id": a.get("rule_id"), "rule_name": a.get("rule_name"), "category": a.get("category"), "total_usage": a.get("total_usage", 0), "accuracy_rate": a.get("accuracy_rate", 0), "satisfaction_score": a.get("satisfaction_score", 0)} for a in top_rules],
        "daily_usage": daily_totals,
        "category_usage": [{"category": k, "usage": v} for k, v in category_usage.items()],
        "status_distribution": [{"status": k, "count": v} for k, v in status_dist.items()],
        "rule_analytics": [_s(a) for a in all_analytics[:20]],
        "improvement_suggestions": [
            {"rule": "HR Sensitive Topic Handler", "suggestion": "Add more escalation keywords to improve coverage", "impact": "high"},
            {"rule": "Employee Learning Guidance", "suggestion": "Adjust tone for senior employees to be less simplified", "impact": "medium"},
            {"rule": "Motivation Response Engine", "suggestion": "Increase nudge frequency for learners inactive > 5 days", "impact": "high"},
            {"rule": "Compliance Enforcement Rule", "suggestion": "Update restricted data types to include new GDPR categories", "impact": "critical"},
        ],
    }


@router.get("/approval-workflow")
async def get_approval_workflow(status: Optional[str] = None):
    """Get all rules grouped by approval workflow status."""
    await _ensure_seeded()
    query: Dict[str, Any] = {}
    if status:
        query["approval_status"] = status
    docs = await _rules().find(query).sort("updated_at", -1).to_list(200)
    grouped = {"draft": [], "pending": [], "approved": [], "published": [], "rejected": []}
    for d in docs:
        st = d.get("approval_status", "draft")
        if st in grouped:
            grouped[st].append(_s(d))
    return {"workflow": grouped, "counts": {k: len(v) for k, v in grouped.items()}}


@router.patch("/approval-workflow/{rule_id}/submit")
async def submit_for_review(rule_id: str):
    """Submit a rule for review."""
    result = await _rules().update_one(
        {"rule_id": rule_id},
        {"$set": {"approval_status": "pending", "submitted_at": datetime.utcnow(), "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"success": True}


@router.patch("/approval-workflow/{rule_id}/approve")
async def approve_rule(rule_id: str):
    """Approve a rule."""
    result = await _rules().update_one(
        {"rule_id": rule_id},
        {"$set": {"approval_status": "approved", "approved_at": datetime.utcnow(), "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"success": True}


@router.patch("/approval-workflow/{rule_id}/reject")
async def reject_rule(rule_id: str, body: RejectBody):
    """Reject a rule with a reason."""
    result = await _rules().update_one(
        {"rule_id": rule_id},
        {"$set": {"approval_status": "rejected", "rejection_reason": body.reason, "rejected_at": datetime.utcnow(), "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"success": True}


@router.patch("/approval-workflow/{rule_id}/publish")
async def publish_rule(rule_id: str):
    """Publish an approved rule (sets status to active)."""
    result = await _rules().update_one(
        {"rule_id": rule_id},
        {"$set": {"approval_status": "published", "status": "active", "published_at": datetime.utcnow(), "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"success": True}


@router.get("/versions/{rule_id}")
async def get_rule_versions(rule_id: str):
    """Get version history for a specific rule."""
    await _ensure_seeded()
    docs = await _versions().find({"rule_id": rule_id}).sort("version", -1).to_list(50)
    return {"versions": [_s(d) for d in docs]}


@router.post("/versions/{rule_id}/rollback/{version}")
async def rollback_rule(rule_id: str, version: int):
    """Rollback a rule to a previous version."""
    version_doc = await _versions().find_one({"rule_id": rule_id, "version": version})
    if not version_doc:
        raise HTTPException(status_code=404, detail="Version not found")
    snapshot = version_doc.get("snapshot", {})
    await _rules().update_one(
        {"rule_id": rule_id},
        {"$set": {**snapshot, "updated_at": datetime.utcnow(), "version": version}},
    )
    return {"success": True, "rolled_back_to": version}


@router.post("/test-rule")
async def test_rule(body: TestRuleBody):
    """Simulate AI response based on rule configuration and user role."""
    await _ensure_seeded()
    role_cfg = await _role_cfg().find_one({"role": body.role})
    rule_doc = None
    if body.rule_id:
        rule_doc = await _rules().find_one({"rule_id": body.rule_id})

    tone = (role_cfg or {}).get("tone", "professional")
    depth = (role_cfg or {}).get("depth", "balanced")
    formality = (role_cfg or {}).get("formality", "formal")
    escalation = (role_cfg or {}).get("escalation_enabled", False)

    tone_map = {
        "professional": "I can assist you with that. Based on the available information,",
        "executive": "From an executive perspective,",
        "encouraging": "Great question! 😊 Let me help you with that.",
        "motivational": "You're on the right track! 🎯 Here's what you need to know:",
        "analytical": "Analyzing the data and context provided:",
        "empathetic": "I understand your concern. Let me help address this carefully.",
        "collaborative": "Let's work through this together.",
        "nurturing": "That's a great question to ask! Let me explain this step by step.",
    }

    depth_suffix = {
        "detailed": " I'll provide a comprehensive explanation with full context and supporting details.",
        "summary": " Here's a concise executive summary.",
        "beginner": " Let me break this down in simple terms.",
        "adaptive": " Based on your current progress, here's a personalized response.",
        "expert": " Here's the advanced technical perspective.",
        "minimal": " Brief response only.",
    }

    opening = tone_map.get(tone, "Here's the response:")
    suffix = depth_suffix.get(depth, "")

    response_lines = [
        f"{opening}{suffix}",
        "",
        f"**Query**: {body.prompt[:100]}",
        "",
        f"**Role Applied**: {body.role.title()}",
        f"**Tone**: {tone.title()} | **Depth**: {depth.title()} | **Formality**: {formality.title()}",
        "",
    ]

    if rule_doc:
        response_lines.append(f"**Active Rule**: {rule_doc.get('name', 'N/A')}")
        restricted = rule_doc.get("restricted_topics", [])
        for rt in restricted:
            if rt.lower() in body.prompt.lower():
                response_lines.append(f"\n⚠️ **Restricted Topic Detected**: '{rt}'. This topic is restricted for the {body.role} role.")
                break

    response_lines.extend([
        "",
        "Based on your role configuration and active rules, the AI assistant would respond with appropriate context, staying within defined topic boundaries and maintaining the configured tone throughout the conversation.",
    ])

    if escalation:
        response_lines.append("\n📋 *Note: Escalation is enabled for this role. If this query involves a sensitive topic, it would be automatically routed to a human agent.*")

    return {
        "simulated_response": "\n".join(response_lines),
        "applied_config": {
            "role": body.role,
            "tone": tone,
            "depth": depth,
            "formality": formality,
            "escalation_enabled": escalation,
        },
        "rule_applied": rule_doc.get("name") if rule_doc else "Default role configuration",
    }
