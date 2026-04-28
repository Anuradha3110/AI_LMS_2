"""User management, departments, notifications, preferences router."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, require_roles
from app.core.security import hash_password
from app.models import (
    User, Department, Notification, UserPreference,
    AssessmentSubmission, SimulationAttempt, UserGamification, UserBadge, Enrollment, SkillScorecard,
)
from app.schemas import (
    UserListOut, AddTeamMemberRequest, UpdateUserRequest, TeamMemberDetailOut,
    DepartmentCreateRequest, DepartmentOut,
    NotificationOut, UserPreferenceUpdateRequest,
)

router = APIRouter(prefix="/api", tags=["Users"])


# ─── Users ───────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserListOut])
def list_users(
    role: Optional[str] = None,
    department: Optional[str] = None,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    q = select(User).where(User.tenant_id == current_user.tenant_id, User.is_active == True)
    if role:
        q = q.where(User.role == role)
    if department:
        q = q.where(User.department == department)
    users = db.scalars(q.order_by(User.full_name)).all()
    return [UserListOut(
        id=u.id, email=u.email, full_name=u.full_name, role=u.role,
        department=u.department, job_title=u.job_title,
        is_active=u.is_active, last_login_at=u.last_login_at,
        created_at=u.created_at,
    ) for u in users]


@router.post("/team-members/add", response_model=UserListOut, status_code=201)
def add_team_member(
    body: AddTeamMemberRequest,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    existing = db.scalars(
        select(User).where(User.tenant_id == current_user.tenant_id, User.email == body.email)
    ).first()
    if existing:
        raise HTTPException(400, "Email already exists in this organization")

    default_pw = "Welcome@123"
    user = User(
        tenant_id=current_user.tenant_id,
        email=body.email,
        full_name=body.full_name,
        password_hash=hash_password(default_pw),
        role=body.role,
        department=body.department,
        job_title=body.job_title,
        manager_id=body.manager_id,
    )
    db.add(user)
    db.commit()
    return UserListOut(
        id=user.id, email=user.email, full_name=user.full_name, role=user.role,
        department=user.department, job_title=user.job_title,
        is_active=user.is_active, last_login_at=user.last_login_at,
        created_at=user.created_at,
    )


@router.put("/users/{user_id}", response_model=UserListOut)
def update_user(
    user_id: str,
    body: UpdateUserRequest,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    user = db.scalars(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    ).first()
    if not user:
        raise HTTPException(404, "User not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    user.updated_at = datetime.utcnow()
    db.commit()
    return UserListOut(
        id=user.id, email=user.email, full_name=user.full_name, role=user.role,
        department=user.department, job_title=user.job_title,
        is_active=user.is_active, last_login_at=user.last_login_at,
        created_at=user.created_at,
    )


@router.get("/team-members/{user_id}", response_model=TeamMemberDetailOut)
def get_team_member_detail(
    user_id: str,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    user = db.scalars(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    ).first()
    if not user:
        raise HTTPException(404, "User not found")

    assessments = db.scalar(select(func.count(AssessmentSubmission.id)).where(AssessmentSubmission.user_id == user.id)) or 0
    avg_score = db.scalar(select(func.avg(AssessmentSubmission.score)).where(AssessmentSubmission.user_id == user.id)) or 0.0
    sims = db.scalar(select(func.count(SimulationAttempt.id)).where(SimulationAttempt.user_id == user.id, SimulationAttempt.status == "completed")) or 0
    gamif = db.scalars(select(UserGamification).where(UserGamification.user_id == user.id)).first()
    enrolled = db.scalar(select(func.count(Enrollment.id)).where(Enrollment.user_id == user.id)) or 0
    skills = db.scalars(select(SkillScorecard).where(SkillScorecard.user_id == user.id)).all()

    return TeamMemberDetailOut(
        id=user.id, email=user.email, full_name=user.full_name, role=user.role,
        department=user.department, job_title=user.job_title,
        is_active=user.is_active, created_at=user.created_at,
        assessments_completed=assessments, avg_assessment_score=float(avg_score),
        simulations_completed=sims,
        badges_count=gamif.badges_count if gamif else 0,
        xp_points=gamif.xp_points if gamif else 0,
        level=gamif.level if gamif else 1,
        enrolled_courses=enrolled,
        skill_scores=[{"skill": s.skill_name, "score": s.score} for s in skills],
    )


# ─── Departments ─────────────────────────────────────────────────────────────

@router.post("/departments", response_model=DepartmentOut, status_code=201)
def create_department(
    body: DepartmentCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    dept = Department(
        tenant_id=current_user.tenant_id,
        name=body.name,
        description=body.description,
        parent_id=body.parent_id,
        head_user_id=body.head_user_id,
    )
    db.add(dept)
    db.commit()
    return DepartmentOut(
        id=dept.id, name=dept.name, description=dept.description,
        parent_id=dept.parent_id, head_user_id=dept.head_user_id,
        created_at=dept.created_at,
    )


@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    depts = db.scalars(
        select(Department).where(Department.tenant_id == current_user.tenant_id)
    ).all()
    return [DepartmentOut(
        id=d.id, name=d.name, description=d.description,
        parent_id=d.parent_id, head_user_id=d.head_user_id,
        created_at=d.created_at,
    ) for d in depts]


# ─── Notifications ───────────────────────────────────────────────────────────

@router.get("/notifications", response_model=List[NotificationOut])
def get_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.tenant_id == current_user.tenant_id,
    )
    if unread_only:
        q = q.where(Notification.is_read == False)
    notifs = db.scalars(q.order_by(Notification.created_at.desc()).limit(50)).all()
    return [NotificationOut(
        id=n.id, type=n.type, title=n.title, message=n.message,
        data_json=n.data_json or {}, is_read=n.is_read, read_at=n.read_at,
        created_at=n.created_at,
    ) for n in notifs]


@router.post("/notifications/{notif_id}/read", status_code=204)
def mark_notification_read(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.scalars(
        select(Notification).where(
            Notification.id == notif_id,
            Notification.user_id == current_user.id,
        )
    ).first()
    if n:
        n.is_read = True
        n.read_at = datetime.utcnow()
        db.commit()


# ─── User Preferences ────────────────────────────────────────────────────────

@router.put("/users/me/preferences")
def update_preferences(
    body: UserPreferenceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = db.scalars(select(UserPreference).where(UserPreference.user_id == current_user.id)).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id, tenant_id=current_user.tenant_id)
        db.add(pref)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(pref, field, value)
    pref.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True}
