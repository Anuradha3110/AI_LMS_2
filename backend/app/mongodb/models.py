"""Pydantic models for MongoDB documents (webx database)."""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Optional

from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field, field_validator


# ── ObjectId helper ──────────────────────────────────────────────────────────

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v: Any) -> str:
        if isinstance(v, ObjectId):
            return str(v)
        if ObjectId.is_valid(v):
            return str(v)
        raise ValueError(f"Invalid ObjectId: {v}")

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type: Any, handler: Any):
        from pydantic_core import core_schema
        return core_schema.no_info_plain_validator_function(cls.validate)


# ── Tenant ───────────────────────────────────────────────────────────────────

class TenantDoc(BaseModel):
    """MongoDB tenant document shape (for internal use)."""
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    slug: str
    plan: str = "free"
    status: str = "active"
    api_key: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class TenantOut(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    status: str


# ── User ─────────────────────────────────────────────────────────────────────

class UserDoc(BaseModel):
    """MongoDB user document shape (for internal use)."""
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    tenant_id: str
    email: str
    full_name: str
    password_hash: str
    role: str  # admin | manager | employee
    department: Optional[str] = None
    job_title: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    last_login_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class MongoUserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    tenant_id: str
    is_active: bool
    department: Optional[str] = None
    job_title: Optional[str] = None
    avatar_url: Optional[str] = None
    last_login_at: Optional[datetime] = None


# ── Auth request / response ──────────────────────────────────────────────────

class MongoLoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_slug: Optional[str] = None  # optional — omit to search across tenants


class MongoLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    tenant_id: str
    full_name: str
    user: MongoUserOut


class MongoRegisterRequest(BaseModel):
    org_name: str
    slug: str
    plan: str = "free"
    business_domain: Optional[str] = None
    admin_email: EmailStr
    admin_name: str
    admin_password: str


class MongoRegisterResponse(BaseModel):
    tenant_id: str
    slug: str
    admin_email: str
    api_key: str
    message: str
