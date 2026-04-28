"""
Celery async tasks for AI-LMS.
All tasks use DB sessions for persistence and update AsyncJob status.
"""
import json
import uuid
from datetime import datetime

from sqlalchemy import select

from app.core.celery_app import celery_app
from app.db import SessionLocal
from app.models import (
    AsyncJob, CompanyBlueprint, KnowledgeItem,
    Course, Module, Lesson, Assessment, AssessmentQuestion,
    SimulationAttempt, QuestionBank, AiUsageLog,
)
from app.services.ai_service import (
    build_lesson_content, generate_tutor_feedback,
    evaluate_simulation, call_llm, generate_questions_for_topic,
)


def _set_job_status(db, job_id: str, status: str, result: dict = None, error: str = ""):
    job = db.scalars(select(AsyncJob).where(AsyncJob.id == job_id)).first()
    if job:
        job.status = status
        if status == "running":
            job.started_at = datetime.utcnow()
        if status in ("succeeded", "failed"):
            job.completed_at = datetime.utcnow()
        if result:
            job.result_json = result
        if error:
            job.error_message = error
        db.commit()


@celery_app.task(name="generate_lms_job", bind=True, max_retries=3)
def generate_lms_job(self, job_id: str, tenant_id: str, blueprint_id: str):
    """Full async LMS generation from a blueprint."""
    with SessionLocal() as db:
        _set_job_status(db, job_id, "running")
        try:
            bp = db.scalars(select(CompanyBlueprint).where(CompanyBlueprint.id == blueprint_id)).first()
            if not bp:
                raise ValueError(f"Blueprint {blueprint_id} not found")

            blueprint = bp.blueprint_json
            knowledge_items = db.scalars(
                select(KnowledgeItem).where(KnowledgeItem.tenant_id == tenant_id).limit(20)
            ).all()
            kb_summary = "\n".join([f"- {ki.title}: {ki.description[:80]}" for ki in knowledge_items])

            outline = blueprint.get("course_outline", [])
            if not outline:
                outline = [{"title": blueprint.get("title", "Training Course"), "modules": [
                    {"title": "Module 1", "lessons": ["Introduction", "Core Concepts", "Summary"]}
                ]}]

            created_courses = []
            for course_spec in outline[:3]:   # max 3 courses per generation
                course = Course(
                    tenant_id=tenant_id,
                    title=course_spec.get("title", "Generated Course"),
                    description=blueprint.get("description", "AI-generated training course"),
                    status="draft",
                    is_ai_generated=True,
                    blueprint_id=blueprint_id,
                )
                db.add(course)
                db.flush()

                for mod_idx, mod_spec in enumerate(course_spec.get("modules", [])[:5]):
                    module = Module(
                        tenant_id=tenant_id, course_id=course.id,
                        title=mod_spec.get("title", f"Module {mod_idx + 1}"),
                        order_index=mod_idx,
                    )
                    db.add(module)
                    db.flush()

                    for lesson_idx, lesson_title in enumerate(mod_spec.get("lessons", [])[:5]):
                        content = build_lesson_content(
                            team=blueprint.get("teams", [{}])[0].get("team", "general"),
                            focus_topic=lesson_title,
                            kpis=blueprint.get("teams", [{}])[0].get("focus_topics", []),
                        )
                        lesson = Lesson(
                            tenant_id=tenant_id, module_id=module.id,
                            title=lesson_title, content_text=content,
                            order_index=lesson_idx, is_ai_generated=True,
                        )
                        db.add(lesson)

                    # Add assessment for each module
                    assessment = Assessment(
                        tenant_id=tenant_id, module_id=module.id,
                        title=f"{mod_spec.get('title', 'Module')} Quiz",
                        passing_score=70, is_ai_generated=True,
                    )
                    db.add(assessment)
                    db.flush()

                    # Generate questions for this module
                    questions = generate_questions_for_topic(
                        topic=mod_spec.get("title", "training"),
                        count=5, difficulty="medium",
                    )
                    for q_data in questions:
                        opts = q_data.get("options", {})
                        opts_list = list(opts.values()) if isinstance(opts, dict) else opts
                        db.add(AssessmentQuestion(
                            tenant_id=tenant_id, assessment_id=assessment.id,
                            question_text=q_data.get("question", "Question"),
                            question_type="mcq",
                            options_json=opts,
                            correct_answer_index=q_data.get("correct_index", 0),
                            marks=1,
                        ))
                        # Also add to question bank
                        db.add(QuestionBank(
                            tenant_id=tenant_id,
                            question_text=q_data.get("question", "Question"),
                            question_type="mcq",
                            options_json=opts,
                            correct_answer_json={"index": q_data.get("correct_index", 0)},
                            explanation=q_data.get("explanation", ""),
                            difficulty="medium",
                            domain=mod_spec.get("title", "training"),
                            is_ai_generated=True, review_status="pending",
                        ))

                created_courses.append(str(course.id))

            # Update blueprint status
            bp.status = "applied"
            bp.applied_course_id = uuid.UUID(created_courses[0]) if created_courses else None
            bp.updated_at = datetime.utcnow()

            db.commit()
            _set_job_status(db, job_id, "succeeded", {
                "courses_created": created_courses,
                "message": f"Generated {len(created_courses)} course(s) successfully",
            })

        except Exception as exc:
            _set_job_status(db, job_id, "failed", error=str(exc))
            raise self.retry(exc=exc, countdown=5)


@celery_app.task(name="tutor_feedback_job", bind=True, max_retries=2)
def tutor_feedback_job(
    self,
    job_id: str,
    lesson_title: str,
    lesson_content: str,
    learner_answer: str,
    source_refs_json: str,
):
    """Async AI tutor feedback."""
    with SessionLocal() as db:
        _set_job_status(db, job_id, "running")
        try:
            result = generate_tutor_feedback(
                lesson_title=lesson_title,
                lesson_content=lesson_content,
                learner_answer=learner_answer,
                source_refs=source_refs_json,
            )
            _set_job_status(db, job_id, "succeeded", result)
        except Exception as exc:
            _set_job_status(db, job_id, "failed", error=str(exc))
            raise self.retry(exc=exc, countdown=5)


@celery_app.task(name="simulation_evaluate_job", bind=True, max_retries=2)
def simulation_evaluate_job(
    self,
    job_id: str,
    attempt_id: str,
    scenario_prompt: str,
    user_response_text: str,
):
    """Async AI evaluation of simulation attempt."""
    from app.models import SimulationAttempt
    with SessionLocal() as db:
        _set_job_status(db, job_id, "running")
        try:
            result = evaluate_simulation(scenario_prompt, user_response_text)
            attempt = db.scalars(
                select(SimulationAttempt).where(SimulationAttempt.id == attempt_id)
            ).first()
            if attempt:
                attempt.score = result["score"]
                attempt.feedback_text = result["feedback"]
                attempt.status = "completed"
                attempt.completed_at = datetime.utcnow()
            db.commit()
            _set_job_status(db, job_id, "succeeded", result)
        except Exception as exc:
            _set_job_status(db, job_id, "failed", error=str(exc))
            raise self.retry(exc=exc, countdown=5)


@celery_app.task(name="generate_analytics_snapshot")
def generate_analytics_snapshot(tenant_id: str):
    """Nightly analytics snapshot generation."""
    from app.models import (
        User, Course, LessonProgress, AssessmentSubmission,
        AsyncJob, KnowledgeItem, TenantAnalyticsSnapshot, UserGamification,
    )
    from sqlalchemy import func
    with SessionLocal() as db:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        existing = db.scalars(
            select(TenantAnalyticsSnapshot).where(
                TenantAnalyticsSnapshot.tenant_id == tenant_id,
                TenantAnalyticsSnapshot.snapshot_date == today,
            )
        ).first()
        if existing:
            return

        active_users = db.scalar(
            select(func.count(User.id)).where(User.tenant_id == tenant_id, User.is_active == True)
        ) or 0
        completions = db.scalar(
            select(func.count(LessonProgress.id)).where(
                LessonProgress.tenant_id == tenant_id,
                LessonProgress.status == "completed",
            )
        ) or 0
        avg_score = float(
            db.scalar(select(func.avg(AssessmentSubmission.score)).where(
                AssessmentSubmission.tenant_id == tenant_id
            )) or 0.0
        )
        content_items = db.scalar(
            select(func.count(KnowledgeItem.id)).where(KnowledgeItem.tenant_id == tenant_id)
        ) or 0
        ai_jobs = db.scalar(
            select(func.count(AsyncJob.id)).where(
                AsyncJob.tenant_id == tenant_id, AsyncJob.status == "succeeded"
            )
        ) or 0

        db.add(TenantAnalyticsSnapshot(
            tenant_id=tenant_id, snapshot_date=today,
            active_users=active_users, total_completions=completions,
            avg_score=round(avg_score, 2), content_items=content_items,
            ai_jobs_run=ai_jobs,
        ))
        db.commit()
