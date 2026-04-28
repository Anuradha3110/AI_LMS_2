"""AI engine: tutor, simulations, adaptive rules, AI usage, jobs router."""
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, require_roles
from app.models import (
    AsyncJob, Lesson, SimulationScenario, SimulationAttempt,
    KnowledgeItem, CompanyBlueprint, AiContentCache, AiUsageLog,
    AdaptiveLearningRule, QuestionBank, User,
)
from app.schemas import (
    TutorFeedbackRequest, TutorFeedbackOut,
    SimulationStartRequest, SimulationScenarioOut,
    SimulationSubmitRequest, SimulationAttemptOut,
    JobEnqueueOut, JobStatusOut,
    AiUsageSummaryOut, AiUsageLogOut,
    AiContentCacheOut,
    AdaptiveLearningRuleCreateRequest, AdaptiveLearningRuleOut,
)
from app.tasks.jobs import tutor_feedback_job, simulation_evaluate_job
from app.services.ai_service import call_llm, generate_questions_for_topic

router = APIRouter(prefix="/api", tags=["AI Engine"])


# ─── AI Tutor ────────────────────────────────────────────────────────────────

@router.post("/tutor/feedback", response_model=JobEnqueueOut, status_code=202)
def get_tutor_feedback(
    body: TutorFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.scalars(select(Lesson).where(Lesson.id == body.lesson_id)).first()
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    job = AsyncJob(
        tenant_id=current_user.tenant_id,
        created_by_user_id=current_user.id,
        job_type="tutor_feedback",
        status="queued",
        payload_json={
            "lesson_id": str(lesson.id),
            "lesson_title": lesson.title,
            "lesson_content": lesson.content_text[:1000],
            "learner_answer": body.learner_answer,
        },
    )
    db.add(job)
    db.commit()
    tutor_feedback_job.delay(
        str(job.id), lesson.title, lesson.content_text[:1000],
        body.learner_answer, json.dumps(lesson.source_refs_json or {}),
    )
    return JobEnqueueOut(job_id=job.id, status="queued", message="Tutor feedback processing")


# ─── Simulations ─────────────────────────────────────────────────────────────

@router.post("/simulations/start", response_model=SimulationScenarioOut, status_code=201)
def start_simulation(
    body: SimulationStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Build prompt
    knowledge_context = ""
    if body.blueprint_id:
        bp = db.scalars(select(CompanyBlueprint).where(CompanyBlueprint.id == body.blueprint_id)).first()
        if bp:
            knowledge_context = json.dumps(bp.blueprint_json)[:500]

    system_prompt = (
        "You are a workplace simulation designer. "
        "Create a realistic role-play scenario for training purposes. "
        "Respond with a JSON with keys: title, scenario_text, objectives."
    )
    user_prompt = f"Team: {body.team}\nFocus Topic: {body.focus_topic}\nContext: {knowledge_context}"

    try:
        raw = call_llm(system_prompt, user_prompt)
        import re
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        data = json.loads(m.group()) if m else {}
    except Exception:
        data = {}

    scenario = SimulationScenario(
        tenant_id=current_user.tenant_id,
        blueprint_id=body.blueprint_id,
        title=data.get("title", f"{body.team} — {body.focus_topic}"),
        team=body.team, focus_topic=body.focus_topic,
        prompt_text=data.get("scenario_text", user_prompt),
        expected_outcomes_json={"objectives": data.get("objectives", [])},
    )
    db.add(scenario)
    db.commit()
    return SimulationScenarioOut(
        id=scenario.id, title=scenario.title, team=scenario.team,
        focus_topic=scenario.focus_topic, prompt_text=scenario.prompt_text,
        created_at=scenario.created_at,
    )


@router.post("/simulations/submit", response_model=JobEnqueueOut, status_code=202)
def submit_simulation(
    body: SimulationSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scenario = db.scalars(select(SimulationScenario).where(SimulationScenario.id == body.scenario_id)).first()
    if not scenario:
        raise HTTPException(404, "Scenario not found")

    attempt = SimulationAttempt(
        tenant_id=current_user.tenant_id, user_id=current_user.id,
        scenario_id=scenario.id, user_response_text=body.user_response_text,
        status="pending",
    )
    db.add(attempt)

    job = AsyncJob(
        tenant_id=current_user.tenant_id, created_by_user_id=current_user.id,
        job_type="simulation_evaluate",
        status="queued",
        payload_json={"attempt_id": str(attempt.id)},
    )
    db.add(job)
    db.commit()

    simulation_evaluate_job.delay(
        str(job.id), str(attempt.id),
        scenario.prompt_text, body.user_response_text,
    )
    return JobEnqueueOut(job_id=job.id, status="queued", message="Simulation evaluation started")


@router.get("/simulations/attempts/{attempt_id}", response_model=SimulationAttemptOut)
def get_simulation_attempt(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attempt = db.scalars(
        select(SimulationAttempt).where(SimulationAttempt.id == attempt_id)
    ).first()
    if not attempt:
        raise HTTPException(404, "Attempt not found")
    return SimulationAttemptOut(
        id=attempt.id, scenario_id=attempt.scenario_id,
        status=attempt.status, score=attempt.score,
        feedback_text=attempt.feedback_text, created_at=attempt.created_at,
        completed_at=attempt.completed_at,
    )


# ─── Async Jobs ──────────────────────────────────────────────────────────────

@router.get("/jobs/{job_id}", response_model=JobStatusOut)
def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.scalars(
        select(AsyncJob).where(AsyncJob.id == job_id, AsyncJob.tenant_id == current_user.tenant_id)
    ).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return JobStatusOut(
        id=job.id, job_type=job.job_type, status=job.status,
        result_json=job.result_json or {}, error_message=job.error_message or "",
        created_at=job.created_at, started_at=job.started_at, completed_at=job.completed_at,
    )


# ─── AI Question Generation ──────────────────────────────────────────────────

@router.post("/ai/generate-questions")
def generate_questions(
    topic: str,
    count: int = 5,
    difficulty: str = "medium",
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """AI-generate questions and add to question bank."""
    questions = generate_questions_for_topic(topic, count, difficulty)
    created = []
    for q_data in questions:
        q = QuestionBank(
            tenant_id=current_user.tenant_id,
            question_text=q_data.get("question", ""),
            question_type="mcq",
            options_json=q_data.get("options", {}),
            correct_answer_json={"index": q_data.get("correct_index", 0)},
            explanation=q_data.get("explanation", ""),
            difficulty=difficulty,
            domain=topic,
            is_ai_generated=True,
            review_status="pending",
        )
        db.add(q)
        created.append(str(q.id))
    db.commit()
    return {"ok": True, "questions_created": len(created), "ids": created}


# ─── AI Usage Analytics ───────────────────────────────────────────────────────

@router.get("/ai/usage", response_model=AiUsageSummaryOut)
def ai_usage_summary(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    logs = db.scalars(
        select(AiUsageLog).where(AiUsageLog.tenant_id == current_user.tenant_id)
    ).all()
    total_calls = len(logs)
    total_tokens = sum(l.total_tokens for l in logs)
    cache_hits = sum(1 for l in logs if l.cache_hit)
    by_feature: dict = {}
    by_model: dict = {}
    for l in logs:
        by_feature[l.feature] = by_feature.get(l.feature, 0) + 1
        by_model[l.model] = by_model.get(l.model, 0) + l.total_tokens
    cache_hit_rate = cache_hits / total_calls if total_calls > 0 else 0.0
    return AiUsageSummaryOut(
        total_calls=total_calls, total_tokens=total_tokens,
        cache_hit_rate=round(cache_hit_rate, 3),
        by_feature=by_feature, by_model=by_model,
    )


@router.get("/ai/cache", response_model=List[AiContentCacheOut])
def list_cache_entries(
    content_type: Optional[str] = None,
    limit: int = 20,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    q = select(AiContentCache).where(AiContentCache.tenant_id == current_user.tenant_id)
    if content_type:
        q = q.where(AiContentCache.content_type == content_type)
    items = db.scalars(q.order_by(AiContentCache.created_at.desc()).limit(limit)).all()
    return [AiContentCacheOut(
        id=i.id, cache_key=i.cache_key, content_type=i.content_type,
        output_text=i.output_text[:200] + "...",
        model_used=i.model_used, tokens_used=i.tokens_used,
        created_at=i.created_at, expires_at=i.expires_at,
    ) for i in items]


# ─── Adaptive Learning Rules ─────────────────────────────────────────────────

@router.post("/adaptive-rules", response_model=AdaptiveLearningRuleOut, status_code=201)
def create_adaptive_rule(
    body: AdaptiveLearningRuleCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    rule = AdaptiveLearningRule(
        tenant_id=current_user.tenant_id,
        name=body.name,
        trigger_condition=body.trigger_condition,
        action=body.action,
    )
    db.add(rule)
    db.commit()
    return AdaptiveLearningRuleOut(
        id=rule.id, name=rule.name,
        trigger_condition=rule.trigger_condition or {},
        action=rule.action or {},
        is_active=rule.is_active, created_at=rule.created_at,
    )


@router.get("/adaptive-rules", response_model=List[AdaptiveLearningRuleOut])
def list_adaptive_rules(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    rules = db.scalars(
        select(AdaptiveLearningRule).where(AdaptiveLearningRule.tenant_id == current_user.tenant_id)
    ).all()
    return [AdaptiveLearningRuleOut(
        id=r.id, name=r.name,
        trigger_condition=r.trigger_condition or {},
        action=r.action or {},
        is_active=r.is_active, created_at=r.created_at,
    ) for r in rules]
