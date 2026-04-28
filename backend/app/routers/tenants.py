"""Tenant management, API keys, embed configs, audit logs router."""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, require_roles
from app.models import (
    Tenant, TenantProfile, TenantSubscription,
    ApiKey, AuditLog, EmbedConfig, User
)
from app.schemas import (
    TenantOut, TenantProfileOut, TenantProfileUpsertRequest,
    ApiKeyCreateRequest, ApiKeyOut,
    EmbedConfigCreateRequest, EmbedConfigOut,
    AuditLogOut,
)

router = APIRouter(prefix="/api", tags=["Tenants"])


@router.get("/tenant/profile", response_model=TenantProfileOut)
def get_tenant_profile(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    profile = db.scalars(
        select(TenantProfile).where(TenantProfile.tenant_id == current_user.tenant_id)
    ).first()
    if not profile:
        raise HTTPException(404, "Tenant profile not found")
    return TenantProfileOut(
        business_domain=profile.business_domain,
        industry=profile.industry,
        logo_url=profile.logo_url,
        primary_color=profile.primary_color,
        secondary_color=profile.secondary_color,
        welcome_message=profile.welcome_message,
        role_template_json=profile.role_template_json or {},
        taxonomy_mapping_json=profile.taxonomy_mapping_json or {},
        generation_prefs_json=profile.generation_prefs_json or {},
        connectors_json=profile.connectors_json or {},
        labels_json=profile.labels_json or {},
        ai_preferences=profile.ai_preferences or {},
        timezone=profile.timezone,
        locale=profile.locale,
        updated_at=profile.updated_at,
    )


@router.put("/tenant/profile", response_model=TenantProfileOut)
def upsert_tenant_profile(
    body: TenantProfileUpsertRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    profile = db.scalars(
        select(TenantProfile).where(TenantProfile.tenant_id == current_user.tenant_id)
    ).first()
    if not profile:
        profile = TenantProfile(tenant_id=current_user.tenant_id)
        db.add(profile)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    profile.updated_at = datetime.utcnow()
    db.commit()

    _audit(db, current_user, "tenant_profile.updated", "tenant_profile", str(profile.id))
    return get_tenant_profile(current_user, db)


@router.get("/tenant/info", response_model=TenantOut)
def get_tenant_info(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    tenant = db.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    return TenantOut(
        id=tenant.id, name=tenant.name, slug=tenant.slug, plan=tenant.plan,
        status=tenant.status, max_users=tenant.max_users, max_courses=tenant.max_courses,
        api_key=tenant.api_key, created_at=tenant.created_at,
    )


# ─── API Keys ────────────────────────────────────────────────────────────────

@router.post("/api-keys", response_model=ApiKeyOut, status_code=201)
def create_api_key(
    body: ApiKeyCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    raw_key = "lms_" + secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    expires_at = None
    if body.expires_days:
        expires_at = datetime.utcnow() + timedelta(days=body.expires_days)

    api_key = ApiKey(
        tenant_id=current_user.tenant_id,
        key_hash=key_hash,
        label=body.label,
        scopes=body.scopes,
        expires_at=expires_at,
        created_by=current_user.id,
    )
    db.add(api_key)
    db.commit()
    _audit(db, current_user, "api_key.created", "api_key", str(api_key.id))
    return ApiKeyOut(
        id=api_key.id, label=api_key.label, scopes=api_key.scopes or [],
        is_active=api_key.is_active, last_used_at=api_key.last_used_at,
        expires_at=api_key.expires_at, created_at=api_key.created_at,
        raw_key=raw_key,
    )


@router.get("/api-keys", response_model=List[ApiKeyOut])
def list_api_keys(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    keys = db.scalars(
        select(ApiKey).where(ApiKey.tenant_id == current_user.tenant_id, ApiKey.is_active == True)
    ).all()
    return [ApiKeyOut(
        id=k.id, label=k.label, scopes=k.scopes or [], is_active=k.is_active,
        last_used_at=k.last_used_at, expires_at=k.expires_at, created_at=k.created_at,
    ) for k in keys]


@router.delete("/api-keys/{key_id}", status_code=204)
def revoke_api_key(
    key_id: str,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    key = db.scalars(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.tenant_id == current_user.tenant_id)
    ).first()
    if not key:
        raise HTTPException(404, "API key not found")
    key.is_active = False
    db.commit()


# ─── Embed Configs ───────────────────────────────────────────────────────────

@router.post("/embed-configs", response_model=EmbedConfigOut, status_code=201)
def create_embed_config(
    body: EmbedConfigCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    token = "emb_" + secrets.token_urlsafe(24)
    config = EmbedConfig(
        tenant_id=current_user.tenant_id,
        allowed_origins=body.allowed_origins,
        embed_token=token,
        widget_config=body.widget_config,
    )
    db.add(config)
    db.commit()
    return EmbedConfigOut(
        id=config.id, allowed_origins=config.allowed_origins or [],
        embed_token=config.embed_token, widget_config=config.widget_config or {},
        is_active=config.is_active, created_at=config.created_at,
    )


@router.get("/embed-configs", response_model=List[EmbedConfigOut])
def list_embed_configs(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    configs = db.scalars(
        select(EmbedConfig).where(EmbedConfig.tenant_id == current_user.tenant_id)
    ).all()
    return [EmbedConfigOut(
        id=c.id, allowed_origins=c.allowed_origins or [],
        embed_token=c.embed_token, widget_config=c.widget_config or {},
        is_active=c.is_active, created_at=c.created_at,
    ) for c in configs]


# ─── Audit Logs ──────────────────────────────────────────────────────────────

@router.get("/audit-logs", response_model=List[AuditLogOut])
def list_audit_logs(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    logs = db.scalars(
        select(AuditLog)
        .where(AuditLog.tenant_id == current_user.tenant_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit).offset(offset)
    ).all()
    return [AuditLogOut(
        id=log.id, user_id=log.user_id, action=log.action,
        resource_type=log.resource_type, resource_id=log.resource_id,
        metadata_json=log.metadata_json or {}, ip_address=log.ip_address,
        created_at=log.created_at,
    ) for log in logs]


# ─── Helper ──────────────────────────────────────────────────────────────────

def _audit(db: Session, user: User, action: str, resource_type: str, resource_id: str = ""):
    db.add(AuditLog(
        tenant_id=user.tenant_id,
        user_id=user.id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
    ))
    db.commit()
