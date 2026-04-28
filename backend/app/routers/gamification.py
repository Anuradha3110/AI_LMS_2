"""Gamification: XP, badges, leaderboard, KPI ingestion router."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, require_roles
from app.models import (
    UserGamification, UserBadge, SkillScorecard, XpTransaction,
    BadgeDefinition, LeaderboardPeriod, User,
)
from app.schemas import (
    KpiIngestRequest, KpiIngestOut,
    GamificationProfileOut, LeaderboardOut, LeaderboardRowOut,
    BadgeOut, XpTransactionOut,
    BadgeDefinitionCreateRequest, BadgeDefinitionOut,
)

router = APIRouter(prefix="/api", tags=["Gamification"])


@router.get("/gamification/me", response_model=GamificationProfileOut)
def my_gamification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    gamif = db.scalars(
        select(UserGamification).where(UserGamification.user_id == current_user.id)
    ).first()
    if not gamif:
        gamif = UserGamification(tenant_id=current_user.tenant_id, user_id=current_user.id)
        db.add(gamif)
        db.commit()

    badges = db.scalars(
        select(UserBadge).where(UserBadge.user_id == current_user.id)
    ).all()
    return GamificationProfileOut(
        user_id=current_user.id,
        xp_points=gamif.xp_points, level=gamif.level,
        badges_count=gamif.badges_count, streak_days=gamif.streak_days,
        longest_streak=gamif.longest_streak, rank=gamif.rank,
        badges=[BadgeOut(badge_code=b.badge_code, badge_name=b.badge_name, awarded_at=b.awarded_at)
                for b in badges],
    )


@router.get("/gamification/leaderboard", response_model=LeaderboardOut)
def leaderboard(
    period_type: str = "all_time",
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(UserGamification)
        .where(UserGamification.tenant_id == current_user.tenant_id)
        .order_by(UserGamification.xp_points.desc())
        .limit(limit)
    ).all()
    result = []
    for rank, row in enumerate(rows, 1):
        user = db.get(User, row.user_id)
        if user:
            result.append(LeaderboardRowOut(
                user_id=row.user_id, full_name=user.full_name, role=user.role,
                xp_points=row.xp_points, level=row.level,
                badges_count=row.badges_count, rank=rank,
            ))
    return LeaderboardOut(leaderboard=result, period_type=period_type)


@router.get("/gamification/xp-history", response_model=List[XpTransactionOut])
def xp_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txns = db.scalars(
        select(XpTransaction).where(XpTransaction.user_id == current_user.id)
        .order_by(XpTransaction.created_at.desc()).limit(limit)
    ).all()
    return [XpTransactionOut(
        id=t.id, action=t.action, xp_earned=t.xp_earned,
        reference_id=t.reference_id, reference_type=t.reference_type,
        created_at=t.created_at,
    ) for t in txns]


@router.post("/kpi/ingest", response_model=KpiIngestOut)
def ingest_kpi(
    body: KpiIngestRequest,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    updated = []
    for skill_name, score in body.metrics.items():
        existing = db.scalars(
            select(SkillScorecard).where(
                SkillScorecard.user_id == body.user_id,
                SkillScorecard.skill_name == skill_name,
            )
        ).first()
        if existing:
            existing.score = int(score * 100) if score <= 1 else int(score)
            existing.kpi_source = "kpi_ingest"
            existing.last_updated_at = datetime.utcnow()
        else:
            db.add(SkillScorecard(
                tenant_id=current_user.tenant_id,
                user_id=body.user_id,
                skill_name=skill_name,
                score=int(score * 100) if score <= 1 else int(score),
                kpi_source="kpi_ingest",
            ))
        updated.append({"skill": skill_name, "score": score})
    db.commit()
    return KpiIngestOut(ok=True, updated_skills=updated)


# ─── Badge Definitions ───────────────────────────────────────────────────────

@router.post("/badge-definitions", response_model=BadgeDefinitionOut, status_code=201)
def create_badge_definition(
    body: BadgeDefinitionCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    badge = BadgeDefinition(
        tenant_id=current_user.tenant_id,
        name=body.name, description=body.description,
        icon=body.icon, criteria=body.criteria,
    )
    db.add(badge)
    db.commit()
    return BadgeDefinitionOut(
        id=badge.id, name=badge.name, description=badge.description,
        icon=badge.icon, criteria=badge.criteria or {},
        is_active=badge.is_active, created_at=badge.created_at,
    )


@router.get("/badge-definitions", response_model=List[BadgeDefinitionOut])
def list_badge_definitions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    badges = db.scalars(
        select(BadgeDefinition).where(
            (BadgeDefinition.tenant_id == current_user.tenant_id) |
            (BadgeDefinition.tenant_id == None)
        )
    ).all()
    return [BadgeDefinitionOut(
        id=b.id, name=b.name, description=b.description,
        icon=b.icon, criteria=b.criteria or {},
        is_active=b.is_active, created_at=b.created_at,
    ) for b in badges]
