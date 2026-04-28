"""Auth & tenant-registration router."""
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.core.security import create_access_token, verify_password, hash_password
from app.models import Tenant, TenantProfile, User
from app.schemas import (
    LoginResponse, UserOut,
    RegisterTenantRequest, RegisterTenantResponse,
)

router = APIRouter(prefix="/api", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticate with form-encoded username/password (OAuth2 standard)."""
    user = db.scalars(
        select(User).where(User.email == form.username, User.is_active == True)
    ).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login_at = datetime.utcnow()
    db.commit()

    token = create_access_token(
        subject=str(user.id),
        extra_claims={"tenant": str(user.tenant_id), "role": user.role},
    )
    return LoginResponse(
        access_token=token,
        role=user.role,
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        full_name=user.full_name,
        user=UserOut(
            id=user.id, email=user.email, full_name=user.full_name,
            role=user.role, tenant_id=user.tenant_id, is_active=user.is_active,
            avatar_url=user.avatar_url, department=user.department,
            job_title=user.job_title, last_login_at=user.last_login_at,
        ),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id, email=current_user.email, full_name=current_user.full_name,
        role=current_user.role, tenant_id=current_user.tenant_id, is_active=current_user.is_active,
        avatar_url=current_user.avatar_url, department=current_user.department,
        job_title=current_user.job_title, last_login_at=current_user.last_login_at,
    )


@router.post("/register", response_model=RegisterTenantResponse, status_code=201)
def register_tenant(body: RegisterTenantRequest, db: Session = Depends(get_db)):
    """Self-service tenant onboarding — creates org + admin user in one call."""
    existing = db.scalars(select(Tenant).where(Tenant.slug == body.slug)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already taken")

    existing_email = db.scalars(
        select(User).where(User.email == body.admin_email)
    ).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate tenant API key
    raw_api_key = secrets.token_urlsafe(32)

    tenant = Tenant(
        name=body.org_name,
        slug=body.slug,
        plan=body.plan,
        status="active",
        api_key=raw_api_key,
    )
    db.add(tenant)
    db.flush()

    profile = TenantProfile(
        tenant_id=tenant.id,
        business_domain=body.business_domain,
    )
    db.add(profile)

    admin = User(
        tenant_id=tenant.id,
        email=body.admin_email,
        full_name=body.admin_name,
        password_hash=hash_password(body.admin_password),
        role="admin",
    )
    db.add(admin)
    db.commit()

    return RegisterTenantResponse(
        tenant_id=tenant.id,
        slug=tenant.slug,
        admin_email=admin.email,
        api_key=raw_api_key,
        message="Tenant registered successfully. Use the admin credentials to log in.",
    )
