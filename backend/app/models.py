"""
AI-LMS Database Models — Full 53-Table Schema
Implements the complete proposed architecture from ARCHITECTURE_DESIGN.txt
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer,
    String, Text, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def uuid_pk() -> uuid.UUID:
    return uuid.uuid4()


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — CORE MULTI-TENANT DOMAIN
# ─────────────────────────────────────────────────────────────────────────────

class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    plan: Mapped[str] = mapped_column(String(50), nullable=False, default="free")          # free|starter|pro|enterprise
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="onboarding")  # active|suspended|onboarding
    domain_whitelist: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    api_key: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    max_users: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    max_courses: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="tenant", foreign_keys="User.tenant_id")
    profile = relationship("TenantProfile", back_populates="tenant", uselist=False)
    subscriptions = relationship("TenantSubscription", back_populates="tenant")


class TenantProfile(Base):
    __tablename__ = "tenant_profiles"
    __table_args__ = (UniqueConstraint("tenant_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, unique=True, index=True)
    business_domain: Mapped[str] = mapped_column(String(255), nullable=False, default="general")
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#4F46E5")
    secondary_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#7C3AED")
    custom_domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    welcome_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role_template_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    taxonomy_mapping_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    generation_prefs_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    connectors_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    labels_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    ai_preferences: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="UTC")
    locale: Mapped[str] = mapped_column(String(10), nullable=False, default="en-US")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    tenant = relationship("Tenant", back_populates="profile")


class TenantSubscription(Base):
    __tablename__ = "tenant_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    plan: Mapped[str] = mapped_column(String(50), nullable=False, default="free")
    billing_cycle: Mapped[str] = mapped_column(String(20), nullable=False, default="monthly")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    stripe_sub_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    tenant = relationship("Tenant", back_populates="subscriptions")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    key_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    scopes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)   # e.g. course.created
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class EmbedConfig(Base):
    __tablename__ = "embed_configs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    allowed_origins: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    embed_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    widget_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — USER MANAGEMENT DOMAIN
# ─────────────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_user_tenant_email"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, index=True)   # admin|manager|employee|viewer
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    job_title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    tenant = relationship("Tenant", back_populates="users", foreign_keys=[tenant_id])
    sessions = relationship("UserSession", back_populates="user")
    preferences = relationship("UserPreference", back_populates="user", uselist=False)
    gamification = relationship("UserGamification", back_populates="user", uselist=False)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")


class UserPreference(Base):
    __tablename__ = "user_preferences"
    __table_args__ = (UniqueConstraint("user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, unique=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    notification_prefs: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    learning_goals: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    ui_preferences: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="preferences")


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("departments.id"), nullable=True)
    head_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)   # course_assigned|badge_earned|etc
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False, default="")
    data_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — KNOWLEDGE INGESTION DOMAIN
# ─────────────────────────────────────────────────────────────────────────────

class WebsiteSource(Base):
    __tablename__ = "website_sources"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # google_sheets|pdf|docx|url_scrape|rest_api|manual|csv|youtube|confluence|notion
    source_uri: Mapped[str] = mapped_column(Text, nullable=False, default="")
    auth_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    sync_schedule: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # cron expr
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sync_status: Mapped[str] = mapped_column(String(20), nullable=False, default="idle", index=True)
    sync_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    ingestion_jobs = relationship("IngestionJob", back_populates="source")
    knowledge_items = relationship("KnowledgeItem", back_populates="source")


class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("website_sources.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued", index=True)
    items_created: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    items_updated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    items_failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    source = relationship("WebsiteSource", back_populates="ingestion_jobs")


class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("website_sources.id"), nullable=True, index=True)
    source_kind: Mapped[str] = mapped_column(String(50), nullable=False, default="manual", index=True)
    source_tab: Mapped[str] = mapped_column(String(100), nullable=False, default="", index=True)
    source_gid: Mapped[str] = mapped_column(String(50), nullable=False, default="", index=True)
    source_row: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    source_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    canonical_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_type: Mapped[str] = mapped_column(String(50), nullable=False, default="text")
    # text|html|markdown|video_transcript|qa_pair
    category: Mapped[str] = mapped_column(String(255), nullable=False, default="", index=True)
    service_type: Mapped[str] = mapped_column(String(255), nullable=False, default="", index=True)
    team_hint: Mapped[str] = mapped_column(String(100), nullable=False, default="", index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tags_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    attrs_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    is_indexed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    source = relationship("WebsiteSource", back_populates="knowledge_items")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — COURSE & CURRICULUM DOMAIN
# ─────────────────────────────────────────────────────────────────────────────

class CompanyBlueprint(Base):
    __tablename__ = "company_blueprints"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    blueprint_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    source_refs_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="document")
    # document|knowledge|manual|ai_auto
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    # draft|generating|ready|applied
    prompt_used: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    applied_course_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("courses.id"), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    objectives: Mapped[str] = mapped_column(Text, nullable=False, default="")
    category: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    thumbnail_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft", index=True)
    # draft|review|published|archived
    visibility: Mapped[str] = mapped_column(String(30), nullable=False, default="private")
    # public|private|assigned_only
    level: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    difficulty: Mapped[str] = mapped_column(String(30), nullable=False, default="beginner")
    # beginner|intermediate|advanced
    duration_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    progress_tracking_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    certification_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    instructor_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    blueprint_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("company_blueprints.id"), nullable=True, index=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    tags_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class CoursePrerequisite(Base):
    __tablename__ = "course_prerequisites"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    required_course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class LearningPath(Base):
    __tablename__ = "learning_paths"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    course_sequence: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)  # ordered course UUIDs
    target_role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class UserLearningPathEnrollment(Base):
    __tablename__ = "user_learning_path_enrollments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    path_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("learning_paths.id"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    current_course_idx: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    section_title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unlock_condition: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    module_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("modules.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_type: Mapped[str] = mapped_column(String(30), nullable=False, default="text")
    # text|video|mixed|interactive|simulation
    video_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    video_duration_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    subtitle_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    reading_materials_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    downloadable_resources_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    attachments_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    knowledge_refs: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)  # knowledge_item UUIDs
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source_refs_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class LessonVersion(Base):
    __tablename__ = "lesson_versions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    lesson_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lessons.id"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    content_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    change_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    module_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("modules.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    guidelines: Mapped[str] = mapped_column(Text, nullable=False, default="")
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    assignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assignments.id"), nullable=False, index=True)
    submission_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    access_type: Mapped[str] = mapped_column(String(50), nullable=False, default="full")
    enrollment_type: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")
    enrolled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class CourseFeedback(Base):
    __tablename__ = "course_feedback"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    certificate_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    recipient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    course_title: Mapped[str] = mapped_column(String(255), nullable=False)
    instructor_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    template_data_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class CourseAssignment(Base):
    __tablename__ = "course_assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    assigned_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="not_started", index=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — ASSESSMENT & QUESTION BANK DOMAIN
# ─────────────────────────────────────────────────────────────────────────────

class QuestionBank(Base):
    """Centralized, reusable question store per tenant."""
    __tablename__ = "question_bank"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("tenants.id"), nullable=True, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(30), nullable=False, default="mcq", index=True)
    # mcq|true_false|short_answer|code|scenario
    options_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    correct_answer_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="medium", index=True)
    # easy|medium|hard
    tags_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    domain: Mapped[str] = mapped_column(String(100), nullable=False, default="", index=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ai_model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_correct_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    review_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    # pending|approved|rejected
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    module_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("modules.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=False, default="")
    assessment_type: Mapped[str] = mapped_column(String(50), default="quiz", nullable=False)
    passing_score: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    time_limit_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    marks_per_question: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    shuffle_options: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AssessmentQuestion(Base):
    """Legacy direct question on assessment (kept for backward compat)."""
    __tablename__ = "assessment_questions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    assessment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assessments.id"), nullable=False, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(50), nullable=False, default="mcq")
    options_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    correct_answer_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    marks: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    bank_question_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("question_bank.id"), nullable=True)


class AssessmentQuestionLink(Base):
    """New: links question_bank questions to assessments with ordering."""
    __tablename__ = "assessment_question_links"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    assessment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assessments.id"), nullable=False, index=True)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("question_bank.id"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    points: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)


class AssessmentSubmission(Base):
    __tablename__ = "assessment_submissions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    assessment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assessments.id"), nullable=False, index=True)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    answers_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    time_taken_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ai_feedback: Mapped[str] = mapped_column(Text, nullable=False, default="")
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6 — PROGRESS & LEARNING DOMAIN
# ─────────────────────────────────────────────────────────────────────────────

class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id", name="uq_lesson_progress"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    lesson_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lessons.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="not_started")
    progress_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    time_spent_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_position_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class SkillScorecard(Base):
    __tablename__ = "skill_scorecards"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    skill_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    kpi_source: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    last_updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class UserAnalyticsSnapshot(Base):
    __tablename__ = "user_analytics_snapshots"
    __table_args__ = (UniqueConstraint("user_id", "snapshot_date", name="uq_user_analytics_snapshot"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    snapshot_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    courses_enrolled: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    courses_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lessons_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_assessment_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_time_spent_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    xp_earned_today: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skill_scores_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class TenantAnalyticsSnapshot(Base):
    __tablename__ = "tenant_analytics_snapshots"
    __table_args__ = (UniqueConstraint("tenant_id", "snapshot_date", name="uq_tenant_analytics_snapshot"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    snapshot_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    active_users: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_completions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    content_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ai_jobs_run: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7 — AI ENGINE DOMAIN
# ─────────────────────────────────────────────────────────────────────────────

class AsyncJob(Base):
    __tablename__ = "async_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    job_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued", index=True)
    payload_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    result_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    error_message: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class AiContentCache(Base):
    __tablename__ = "ai_content_cache"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("tenants.id"), nullable=True, index=True)
    cache_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # lesson|quiz_question|summary|recommendation|feedback|simulation
    input_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    output_text: Mapped[str] = mapped_column(Text, nullable=False)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class AiUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    job_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("async_jobs.id"), nullable=True)
    feature: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cache_hit: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class AdaptiveLearningRule(Base):
    __tablename__ = "adaptive_learning_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trigger_condition: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    action: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class SimulationScenario(Base):
    __tablename__ = "simulation_scenarios"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    blueprint_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("company_blueprints.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    team: Mapped[str] = mapped_column(String(100), nullable=False)
    focus_topic: Mapped[str] = mapped_column(String(255), nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    expected_outcomes_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    source_refs_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class SimulationAttempt(Base):
    __tablename__ = "simulation_attempts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    scenario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("simulation_scenarios.id"), nullable=False, index=True)
    user_response_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    feedback_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8 — GAMIFICATION DOMAIN
# ─────────────────────────────────────────────────────────────────────────────

class UserGamification(Base):
    __tablename__ = "user_gamification"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    xp_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    badges_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="gamification")


class XpTransaction(Base):
    __tablename__ = "xp_transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # lesson_complete|assessment_pass|badge_earned|streak_bonus|simulation_complete
    xp_earned: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class BadgeDefinition(Base):
    __tablename__ = "badge_definitions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("tenants.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="🏆")
    criteria: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class UserBadge(Base):
    __tablename__ = "user_badges"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    badge_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("badge_definitions.id"), nullable=True)
    badge_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    badge_name: Mapped[str] = mapped_column(String(255), nullable=False)
    awarded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class LeaderboardPeriod(Base):
    __tablename__ = "leaderboard_periods"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    # daily|weekly|monthly|all_time
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    end_date: Mapped[str] = mapped_column(String(10), nullable=False)
    rankings_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9 — INTEGRATION DOMAIN
# ─────────────────────────────────────────────────────────────────────────────

class IntegrationWebhook(Base):
    __tablename__ = "integration_webhooks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    provider: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_url: Mapped[str] = mapped_column(Text, nullable=False)
    event_name: Mapped[str] = mapped_column(String(100), nullable=False)
    events: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    headers_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    retry_policy: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class WebhookDeliveryLog(Base):
    __tablename__ = "webhook_delivery_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    webhook_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("integration_webhooks.id"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    response_status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    response_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    delivered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class ExternalIntegration(Base):
    __tablename__ = "external_integrations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    integration_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # google_sheets|slack|teams|zoom|lti|saml|custom_api
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    config_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", index=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 10 — HR & OPERATIONS DOMAIN
# ─────────────────────────────────────────────────────────────────────────────

class LeaveType(Base):
    __tablename__ = "leave_types"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    days_allowed: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    carry_forward: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    requires_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)   # YYYY-MM-DD
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="present", index=True)
    check_in_time: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    check_out_time: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid_pk)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    leave_type_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("leave_types.id"), nullable=True)
    leave_type: Mapped[str] = mapped_column(String(50), nullable=False, default="casual")
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    end_date: Mapped[str] = mapped_column(String(10), nullable=False)
    days_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    manager_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reviewed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
