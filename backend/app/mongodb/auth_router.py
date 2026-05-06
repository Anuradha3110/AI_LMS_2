"""MongoDB-backed auth router — uses webx database on Atlas."""
import secrets
from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.core.email import send_reset_email
from app.core.security import create_access_token, decode_token, hash_password, verify_password
from app.mongodb.audit_utils import log_activity
from app.mongodb.connection import tenants_col, users_col
from app.mongodb.models import (
    ForgotPasswordRequest,
    MongoLoginRequest,
    MongoLoginResponse,
    MongoRegisterRequest,
    MongoRegisterResponse,
    MongoUserOut,
    ResetPasswordRequest,
)

router = APIRouter(prefix="/api/mongo", tags=["MongoDB Auth"])

_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/mongo/token")


# ── helpers ──────────────────────────────────────────────────────────────────

def _user_out(doc: dict) -> MongoUserOut:
    return MongoUserOut(
        id=str(doc["_id"]),
        email=doc["email"],
        full_name=doc["full_name"],
        role=doc["role"],
        tenant_id=str(doc["tenant_id"]),
        is_active=doc.get("is_active", True),
        department=doc.get("department"),
        job_title=doc.get("job_title"),
        avatar_url=doc.get("avatar_url"),
        last_login_at=doc.get("last_login_at"),
    )


async def _get_current_mongo_user(token: str = Depends(_oauth2)) -> dict:
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        tenant_id = payload.get("tenant")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    col = users_col()
    user = await col.find_one({"_id": ObjectId(user_id), "tenant_id": tenant_id, "is_active": True})
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


# ── endpoints ────────────────────────────────────────────────────────────────

@router.post("/login", response_model=MongoLoginResponse)
async def mongo_login(body: MongoLoginRequest, background_tasks: BackgroundTasks):
    """Authenticate against MongoDB webx.users collection."""
    col = users_col()
    query: dict = {"email": body.email, "is_active": True}

    if body.tenant_slug:
        tenant = await tenants_col().find_one({"slug": body.tenant_slug})
        if not tenant:
            raise HTTPException(status_code=400, detail="Company not found")
        query["tenant_id"] = str(tenant["_id"])

    user = await col.find_one(query)
    if not user or not verify_password(body.password, user["password_hash"]):
        background_tasks.add_task(
            log_activity,
            user_id=body.email,
            user_email=body.email,
            user_name=body.email,
            user_role="unknown",
            action="failed_login",
            category="auth",
            page="Login",
            module="auth",
            severity="warning",
            status="failed",
            details=f"Failed login attempt for {body.email}",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    await col.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": datetime.utcnow()}})

    token = create_access_token(
        subject=str(user["_id"]),
        extra_claims={"tenant": str(user["tenant_id"]), "role": user["role"]},
    )

    background_tasks.add_task(
        log_activity,
        user_id=str(user["_id"]),
        user_email=user["email"],
        user_name=user.get("full_name", ""),
        user_role=user["role"],
        tenant_id=str(user.get("tenant_id", "")),
        action="login",
        category="auth",
        page="Login",
        module="auth",
        severity="info",
        status="success",
    )

    return MongoLoginResponse(
        access_token=token,
        role=user["role"],
        user_id=str(user["_id"]),
        tenant_id=str(user["tenant_id"]),
        full_name=user["full_name"],
        user=_user_out(user),
    )


@router.get("/me", response_model=MongoUserOut)
async def mongo_me(current_user: dict = Depends(_get_current_mongo_user)):
    """Return the currently authenticated user's profile."""
    return _user_out(current_user)


@router.post("/register", response_model=MongoRegisterResponse, status_code=201)
async def mongo_register(body: MongoRegisterRequest, background_tasks: BackgroundTasks):
    """Create a new tenant + admin user in MongoDB webx database."""
    t_col = tenants_col()
    u_col = users_col()

    if await t_col.find_one({"slug": body.slug}):
        raise HTTPException(status_code=400, detail="Company slug already taken")

    if await u_col.find_one({"email": body.admin_email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    raw_api_key = secrets.token_urlsafe(32)
    tenant_doc = {
        "name": body.org_name,
        "slug": body.slug,
        "plan": body.plan,
        "status": "active",
        "api_key": raw_api_key,
        "business_domain": body.business_domain,
        "created_at": datetime.utcnow(),
    }
    t_result = await t_col.insert_one(tenant_doc)
    tenant_id = str(t_result.inserted_id)

    admin_doc = {
        "tenant_id": tenant_id,
        "email": body.admin_email,
        "full_name": body.admin_name,
        "password_hash": hash_password(body.admin_password),
        "role": "admin",
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    u_result = await u_col.insert_one(admin_doc)

    background_tasks.add_task(
        log_activity,
        user_id=str(u_result.inserted_id),
        user_email=body.admin_email,
        user_name=body.admin_name,
        user_role="admin",
        tenant_id=tenant_id,
        action="register",
        category="admin",
        page="Register",
        module="users",
        severity="info",
        status="success",
        entity_type="tenant",
        entity_id=tenant_id,
        entity_name=body.org_name,
        details=f"New organisation '{body.org_name}' registered with plan '{body.plan}'",
    )

    return MongoRegisterResponse(
        tenant_id=tenant_id,
        slug=body.slug,
        admin_email=body.admin_email,
        api_key=raw_api_key,
        message="Company registered. Use admin credentials to sign in.",
    )


@router.get("/tenants", tags=["MongoDB Auth"])
async def list_tenants():
    """List all tenants (slugs + names) so you know which Company ID to use at login."""
    cursor = tenants_col().find({}, {"_id": 1, "name": 1, "slug": 1, "plan": 1})
    tenants = []
    async for doc in cursor:
        t_id = str(doc["_id"])
        user_count = await users_col().count_documents({"tenant_id": t_id})
        tenants.append({
            "tenant_id": t_id,
            "name": doc.get("name"),
            "slug": doc.get("slug"),
            "plan": doc.get("plan"),
            "user_count": user_count,
        })
    return {"tenants": tenants}


@router.get("/users", tags=["MongoDB Auth"])
async def list_users():
    """List all users (no passwords) so you can confirm which accounts exist."""
    cursor = users_col().find({}, {"password_hash": 0})
    users = []
    async for doc in cursor:
        tenant_id = doc.get("tenant_id")
        tenant = await tenants_col().find_one({"_id": ObjectId(tenant_id)}) if tenant_id and ObjectId.is_valid(tenant_id) else None
        users.append({
            "id": str(doc["_id"]),
            "email": doc.get("email"),
            "full_name": doc.get("full_name"),
            "role": doc.get("role"),
            "is_active": doc.get("is_active", True),
            "tenant_slug": tenant.get("slug") if tenant else tenant_id,
            "tenant_name": tenant.get("name") if tenant else None,
        })
    return {"users": users, "total": len(users)}


@router.post("/seed", tags=["MongoDB Auth"], status_code=201)
async def mongo_seed():
    """
    Seed demo users in MongoDB webx database.
    Safe to call multiple times — skips if already seeded.
    """
    t_col = tenants_col()
    u_col = users_col()

    existing_tenant = await t_col.find_one({"slug": "demo-corp"})
    if existing_tenant:
        return {"message": "Demo data already seeded", "tenant_id": str(existing_tenant["_id"])}

    tenant_doc = {
        "name": "Demo Corporation",
        "slug": "demo-corp",
        "plan": "pro",
        "status": "active",
        "api_key": secrets.token_urlsafe(32),
        "created_at": datetime.utcnow(),
    }
    t_result = await t_col.insert_one(tenant_doc)
    tenant_id = str(t_result.inserted_id)

    demo_users = [
        {"email": "admin@demo.com",    "full_name": "Demo Admin",    "role": "admin",    "password": "admin@123"},
        {"email": "manager@demo.com",  "full_name": "Demo Manager",  "role": "manager",  "password": "manager@123"},
        {"email": "employee@demo.com", "full_name": "Demo Employee", "role": "employee", "password": "employee@123"},
    ]
    for u in demo_users:
        await u_col.insert_one({
            "tenant_id": tenant_id,
            "email": u["email"],
            "full_name": u["full_name"],
            "password_hash": hash_password(u["password"]),
            "role": u["role"],
            "is_active": True,
            "created_at": datetime.utcnow(),
        })

    # Ensure unique index on email + tenant_id
    await u_col.create_index([("email", 1), ("tenant_id", 1)], unique=True)
    await t_col.create_index("slug", unique=True)

    return {
        "message": "Demo users seeded successfully",
        "tenant_id": tenant_id,
        "tenant_slug": "demo-corp",
        "accounts": [
            {"role": "admin",    "email": "admin@demo.com",    "password": "admin@123"},
            {"role": "manager",  "email": "manager@demo.com",  "password": "manager@123"},
            {"role": "employee", "email": "employee@demo.com", "password": "employee@123"},
        ],
    }


# ── Password Reset ────────────────────────────────────────────────────────────

@router.post("/forgot-password", status_code=200)
async def forgot_password(body: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    """
    Check if email exists in MongoDB users collection.
    If found, generate a reset token, store it on the user doc, and email the link.
    Always returns 200 to avoid leaking which emails are registered.
    """
    col = users_col()
    user = await col.find_one({"email": body.email, "is_active": True})

    if user:
        token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(hours=1)

        await col.update_one(
            {"_id": user["_id"]},
            {"$set": {"reset_token": token, "reset_token_expires": expires}},
        )

        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        background_tasks.add_task(
            send_reset_email,
            to_email=user["email"],
            reset_link=reset_link,
            full_name=user.get("full_name", ""),
        )
        background_tasks.add_task(
            log_activity,
            user_id=str(user["_id"]),
            user_email=user["email"],
            user_name=user.get("full_name", ""),
            user_role=user.get("role", "employee"),
            tenant_id=str(user.get("tenant_id", "")),
            action="password_reset_requested",
            category="security",
            page="Login",
            module="auth",
            severity="warning",
            status="success",
            details=f"Password reset link sent to {user['email']}",
        )

    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password", status_code=200)
async def reset_password(body: ResetPasswordRequest, background_tasks: BackgroundTasks):
    """
    Validate the reset token, update password_hash in MongoDB, and clear the token.
    """
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    col = users_col()
    user = await col.find_one({"reset_token": body.token})

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if user.get("reset_token_expires") and datetime.utcnow() > user["reset_token_expires"]:
        raise HTTPException(status_code=400, detail="Reset link has expired, please request a new one")

    await col.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password_hash": hash_password(body.new_password)},
            "$unset": {"reset_token": "", "reset_token_expires": ""},
        },
    )

    background_tasks.add_task(
        log_activity,
        user_id=str(user["_id"]),
        user_email=user["email"],
        user_name=user.get("full_name", ""),
        user_role=user.get("role", "employee"),
        tenant_id=str(user.get("tenant_id", "")),
        action="password_reset_complete",
        category="security",
        page="Reset Password",
        module="auth",
        severity="warning",
        status="success",
        details=f"Password successfully reset for {user['email']}",
    )

    return {"message": "Password updated successfully. You can now sign in."}
