"""Analytics: tenant analytics, user analytics, snapshots router."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, require_roles
from app.models import (
    User, Course, Enrollment, LessonProgress, AssessmentSubmission,
    KnowledgeItem, AsyncJob, UserGamification, SkillScorecard,
    TenantAnalyticsSnapshot, UserAnalyticsSnapshot,
)
from app.schemas import TenantAnalyticsOut, UserAnalyticsOut, AnalyticsSnapshotOut

router = APIRouter(prefix="/api", tags=["Analytics"])


@router.get("/analytics/tenant", response_model=TenantAnalyticsOut)
def tenant_analytics(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    tid = current_user.tenant_id

    total_users = db.scalar(select(func.count(User.id)).where(User.tenant_id == tid)) or 0
    active_users = db.scalar(select(func.count(User.id)).where(User.tenant_id == tid, User.is_active == True)) or 0
    total_courses = db.scalar(select(func.count(Course.id)).where(Course.tenant_id == tid)) or 0
    published_courses = db.scalar(select(func.count(Course.id)).where(Course.tenant_id == tid, Course.status == "published")) or 0
    total_enrollments = db.scalar(select(func.count(Enrollment.id)).where(Enrollment.tenant_id == tid)) or 0

    # Completion rate
    total_progress = db.scalar(select(func.count(LessonProgress.id)).where(LessonProgress.tenant_id == tid)) or 0
    completed_progress = db.scalar(
        select(func.count(LessonProgress.id)).where(LessonProgress.tenant_id == tid, LessonProgress.status == "completed")
    ) or 0
    avg_completion = round(completed_progress / total_progress, 3) if total_progress else 0.0

    total_assessments = db.scalar(select(func.count(AssessmentSubmission.id)).where(AssessmentSubmission.tenant_id == tid)) or 0
    avg_score = db.scalar(select(func.avg(AssessmentSubmission.score)).where(AssessmentSubmission.tenant_id == tid)) or 0.0
    total_knowledge = db.scalar(select(func.count(KnowledgeItem.id)).where(KnowledgeItem.tenant_id == tid)) or 0
    ai_jobs = db.scalar(select(func.count(AsyncJob.id)).where(AsyncJob.tenant_id == tid, AsyncJob.status == "succeeded")) or 0

    # Top courses by enrollment
    top_courses_raw = db.execute(
        select(Course.id, Course.title, func.count(Enrollment.id).label("enrollments"))
        .join(Enrollment, Enrollment.course_id == Course.id, isouter=True)
        .where(Course.tenant_id == tid)
        .group_by(Course.id, Course.title)
        .order_by(func.count(Enrollment.id).desc())
        .limit(5)
    ).all()
    top_courses = [{"course_id": str(r[0]), "title": r[1], "enrollments": r[2]} for r in top_courses_raw]

    # Skill distribution
    skills = db.scalars(select(SkillScorecard).where(SkillScorecard.tenant_id == tid)).all()
    skill_dist: dict = {}
    for s in skills:
        if s.skill_name not in skill_dist:
            skill_dist[s.skill_name] = {"total": 0, "count": 0}
        skill_dist[s.skill_name]["total"] += s.score
        skill_dist[s.skill_name]["count"] += 1
    skill_distribution = {k: round(v["total"] / v["count"], 1) for k, v in skill_dist.items()}

    return TenantAnalyticsOut(
        total_users=total_users, active_users=active_users,
        total_courses=total_courses, published_courses=published_courses,
        total_enrollments=total_enrollments, avg_completion_rate=avg_completion,
        total_assessments_taken=total_assessments, avg_assessment_score=round(float(avg_score), 1),
        total_knowledge_items=total_knowledge, ai_jobs_run=ai_jobs,
        top_courses=top_courses, skill_distribution=skill_distribution,
    )


@router.get("/analytics/me", response_model=UserAnalyticsOut)
def my_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enrolled = db.scalar(select(func.count(Enrollment.id)).where(Enrollment.user_id == current_user.id)) or 0

    all_lessons_in_enrolled_courses = db.execute(
        select(func.count(LessonProgress.id)).where(LessonProgress.user_id == current_user.id)
    ).scalar() or 0

    completed_lessons = db.scalar(
        select(func.count(LessonProgress.id)).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.status == "completed",
        )
    ) or 0

    avg_score = db.scalar(
        select(func.avg(AssessmentSubmission.score)).where(AssessmentSubmission.user_id == current_user.id)
    ) or 0.0

    total_time = db.scalar(
        select(func.sum(LessonProgress.time_spent_sec)).where(LessonProgress.user_id == current_user.id)
    ) or 0

    gamif = db.scalars(select(UserGamification).where(UserGamification.user_id == current_user.id)).first()
    skills = db.scalars(select(SkillScorecard).where(SkillScorecard.user_id == current_user.id)).all()

    return UserAnalyticsOut(
        user_id=current_user.id,
        courses_enrolled=enrolled,
        courses_completed=0,  # todo: count courses where all lessons complete
        lessons_completed=completed_lessons,
        avg_assessment_score=round(float(avg_score), 1),
        total_time_spent_sec=total_time,
        xp_points=gamif.xp_points if gamif else 0,
        level=gamif.level if gamif else 1,
        badges_count=gamif.badges_count if gamif else 0,
        streak_days=gamif.streak_days if gamif else 0,
        skill_scores=[{"skill": s.skill_name, "score": s.score} for s in skills],
    )


@router.get("/analytics/snapshots", response_model=List[AnalyticsSnapshotOut])
def tenant_snapshots(
    limit: int = 30,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    snapshots = db.scalars(
        select(TenantAnalyticsSnapshot)
        .where(TenantAnalyticsSnapshot.tenant_id == current_user.tenant_id)
        .order_by(TenantAnalyticsSnapshot.snapshot_date.desc())
        .limit(limit)
    ).all()
    return [AnalyticsSnapshotOut(
        snapshot_date=s.snapshot_date, active_users=s.active_users,
        total_completions=s.total_completions, avg_score=s.avg_score,
        content_items=s.content_items, ai_jobs_run=s.ai_jobs_run,
    ) for s in snapshots]
