"""
AI-LMS Pydantic Schemas — Complete schema library for all 100+ endpoints
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ─────────────────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    tenant_id: UUID
    is_active: bool = True
    avatar_url: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    last_login_at: Optional[datetime] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    # Flat fields for easy client access
    role: Optional[str] = None
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None
    full_name: Optional[str] = None
    # Nested user object (backwards compatibility)
    user: Optional[UserOut] = None

class RegisterTenantRequest(BaseModel):
    org_name: str
    slug: str
    admin_name: str
    admin_email: EmailStr
    admin_password: str
    business_domain: str = "general"
    plan: str = "free"

class RegisterTenantResponse(BaseModel):
    tenant_id: UUID
    slug: str
    admin_email: str
    api_key: str   # raw key — shown only once
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# TENANT MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────
class TenantOut(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: str
    status: str
    max_users: int
    max_courses: int
    api_key: Optional[str] = None
    created_at: datetime

class TenantProfileUpsertRequest(BaseModel):
    business_domain: str = "general"
    industry: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#4F46E5"
    secondary_color: str = "#7C3AED"
    welcome_message: Optional[str] = None
    role_template_json: Dict[str, Any] = Field(default_factory=dict)
    taxonomy_mapping_json: Dict[str, Any] = Field(default_factory=dict)
    generation_prefs_json: Dict[str, Any] = Field(default_factory=dict)
    connectors_json: Dict[str, Any] = Field(default_factory=dict)
    labels_json: Dict[str, Any] = Field(default_factory=dict)
    ai_preferences: Dict[str, Any] = Field(default_factory=dict)
    timezone: str = "UTC"
    locale: str = "en-US"

class TenantProfileOut(BaseModel):
    business_domain: str
    industry: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#4F46E5"
    secondary_color: str = "#7C3AED"
    welcome_message: Optional[str] = None
    role_template_json: Dict[str, Any] = Field(default_factory=dict)
    taxonomy_mapping_json: Dict[str, Any] = Field(default_factory=dict)
    generation_prefs_json: Dict[str, Any] = Field(default_factory=dict)
    connectors_json: Dict[str, Any] = Field(default_factory=dict)
    labels_json: Dict[str, Any] = Field(default_factory=dict)
    ai_preferences: Dict[str, Any] = Field(default_factory=dict)
    timezone: str
    locale: str
    updated_at: datetime

class ApiKeyCreateRequest(BaseModel):
    label: str
    scopes: List[str] = Field(default_factory=list)
    expires_days: Optional[int] = None

class ApiKeyOut(BaseModel):
    id: UUID
    label: str
    scopes: List[str]
    is_active: bool
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    raw_key: Optional[str] = None   # only returned on creation

class EmbedConfigCreateRequest(BaseModel):
    allowed_origins: List[str] = Field(default_factory=list)
    widget_config: Dict[str, Any] = Field(default_factory=dict)

class EmbedConfigOut(BaseModel):
    id: UUID
    allowed_origins: List[str]
    embed_token: str
    widget_config: Dict[str, Any]
    is_active: bool
    created_at: datetime

class AuditLogOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    ip_address: Optional[str] = None
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# USER MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────
class UserListOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    job_title: Optional[str] = None
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

class AddTeamMemberRequest(BaseModel):
    full_name: str
    email: EmailStr
    role: str = "employee"
    department: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    joining_date: Optional[str] = None
    manager_id: Optional[UUID] = None

class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    role: Optional[str] = None
    manager_id: Optional[UUID] = None
    avatar_url: Optional[str] = None

class TeamMemberDetailOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    job_title: Optional[str] = None
    is_active: bool
    created_at: datetime
    assessments_completed: int = 0
    avg_assessment_score: float = 0.0
    simulations_completed: int = 0
    badges_count: int = 0
    xp_points: int = 0
    level: int = 1
    enrolled_courses: int = 0
    skill_scores: List[Dict[str, Any]] = Field(default_factory=list)

class DepartmentCreateRequest(BaseModel):
    name: str
    description: str = ""
    parent_id: Optional[UUID] = None
    head_user_id: Optional[UUID] = None

class DepartmentOut(BaseModel):
    id: UUID
    name: str
    description: str
    parent_id: Optional[UUID] = None
    head_user_id: Optional[UUID] = None
    created_at: datetime

class NotificationOut(BaseModel):
    id: UUID
    type: str
    title: str
    message: str
    data_json: Dict[str, Any] = Field(default_factory=dict)
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

class UserPreferenceUpdateRequest(BaseModel):
    language: Optional[str] = None
    notification_prefs: Optional[Dict[str, Any]] = None
    learning_goals: Optional[Dict[str, Any]] = None
    ui_preferences: Optional[Dict[str, Any]] = None


# ─────────────────────────────────────────────────────────────────────────────
# KNOWLEDGE INGESTION
# ─────────────────────────────────────────────────────────────────────────────
class WebsiteSourceCreateRequest(BaseModel):
    name: str
    source_type: str   # google_sheets|pdf|url_scrape|csv|rest_api|manual
    source_uri: str = ""
    auth_config: Dict[str, Any] = Field(default_factory=dict)
    sync_schedule: Optional[str] = None

class WebsiteSourceOut(BaseModel):
    id: UUID
    name: str
    source_type: str
    source_uri: str
    sync_status: str
    last_synced_at: Optional[datetime] = None
    sync_error: Optional[str] = None
    is_active: bool
    created_at: datetime

class IngestionJobOut(BaseModel):
    id: UUID
    source_id: UUID
    status: str
    items_created: int
    items_updated: int
    items_failed: int
    error_details: Dict[str, Any] = Field(default_factory=dict)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

class SheetTabSource(BaseModel):
    name: str
    url: str
    gid: str

class TenantDataSyncRequest(BaseModel):
    tabs: List[SheetTabSource] = Field(default_factory=list)

class TenantDataSyncOut(BaseModel):
    ok: bool
    synced_tabs: int
    upserted_items: int

class KnowledgeItemOut(BaseModel):
    id: UUID
    source_tab: str
    source_row: int
    title: str
    category: str
    service_type: str
    team_hint: str
    description: str
    content: str = ""
    content_type: str = "text"
    tags_json: Dict[str, Any] = Field(default_factory=dict)
    attrs_json: Dict[str, Any] = Field(default_factory=dict)
    source_url: str
    checksum: Optional[str] = None
    is_indexed: bool = False
    updated_at: datetime

class KnowledgeStatsOut(BaseModel):
    total_items: int
    by_tab: Dict[str, int] = Field(default_factory=dict)
    by_team_hint: Dict[str, int] = Field(default_factory=dict)
    by_content_type: Dict[str, int] = Field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# BLUEPRINT & COURSE GENERATION
# ─────────────────────────────────────────────────────────────────────────────
class BlueprintCreateRequest(BaseModel):
    website_url: Optional[str] = None
    documents_text: str = Field(..., description="Extracted text from uploaded SOPs/docs")
    questionnaire: Dict[str, Any] = Field(default_factory=dict)
    title: str = "New Blueprint"

class BlueprintOut(BaseModel):
    id: UUID
    title: str
    version: int
    blueprint_json: Dict[str, Any]
    source: str
    status: str
    created_at: datetime

class GenerateLmsRequest(BaseModel):
    blueprint_id: UUID


# ─────────────────────────────────────────────────────────────────────────────
# COURSES
# ─────────────────────────────────────────────────────────────────────────────
class CourseCreateRequest(BaseModel):
    title: str
    description: str = ""
    objectives: str = ""
    category: str = ""
    thumbnail_url: str = ""
    level: str = ""
    difficulty: str = "beginner"
    duration_hours: int = 0
    estimated_hours: float = 0.0
    language: str = "en"
    visibility: str = "private"
    progress_tracking_enabled: bool = True
    certification_enabled: bool = False
    instructor_name: str = ""
    tags: List[str] = Field(default_factory=list)

class CourseUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    objectives: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = None
    level: Optional[str] = None
    difficulty: Optional[str] = None
    duration_hours: Optional[int] = None
    estimated_hours: Optional[float] = None
    language: Optional[str] = None
    visibility: Optional[str] = None
    progress_tracking_enabled: Optional[bool] = None
    certification_enabled: Optional[bool] = None
    instructor_name: Optional[str] = None
    tags: Optional[List[str]] = None

class CourseOut(BaseModel):
    id: UUID
    title: str
    description: str
    objectives: str = ""
    category: str = ""
    thumbnail_url: str = ""
    status: str = "draft"
    visibility: str = "private"
    level: str = ""
    difficulty: str = "beginner"
    duration_hours: int = 0
    estimated_hours: float = 0.0
    language: str = "en"
    progress_tracking_enabled: bool = True
    certification_enabled: bool = False
    instructor_name: str = ""
    is_ai_generated: bool = False
    tags_json: List[str] = Field(default_factory=list)
    created_at: datetime
    published_at: Optional[datetime] = None

class CoursePrerequisiteCreateRequest(BaseModel):
    required_course_id: UUID

class LearningPathCreateRequest(BaseModel):
    name: str
    description: str = ""
    course_sequence: List[str] = Field(default_factory=list)
    target_role: Optional[str] = None
    thumbnail_url: Optional[str] = None

class LearningPathOut(BaseModel):
    id: UUID
    name: str
    description: str
    is_ai_generated: bool
    course_sequence: List[str]
    target_role: Optional[str] = None
    thumbnail_url: Optional[str] = None
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# MODULES & LESSONS
# ─────────────────────────────────────────────────────────────────────────────
class ModuleCreateRequest(BaseModel):
    title: str
    description: str = ""
    section_title: str = ""
    order_index: int = 0
    estimated_minutes: int = 0
    unlock_condition: Dict[str, Any] = Field(default_factory=dict)

class ModuleOut(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    description: str = ""
    section_title: str = ""
    order_index: int
    estimated_minutes: int = 0
    created_at: datetime

class LessonCreateRequest(BaseModel):
    title: str
    content_text: str = ""
    content_type: str = "text"
    video_url: str = ""
    video_duration_sec: int = 0
    subtitle_url: str = ""
    reading_materials: List[Dict[str, Any]] = []
    downloadable_resources: List[Dict[str, Any]] = []
    order_index: int = 0
    knowledge_refs: List[str] = []

class LessonOut(BaseModel):
    id: UUID
    module_id: UUID
    title: str
    content_text: str
    content_type: str = "text"
    video_url: str = ""
    video_duration_sec: int = 0
    subtitle_url: str = ""
    reading_materials_json: List[Dict[str, Any]] = []
    downloadable_resources_json: List[Dict[str, Any]] = []
    order_index: int = 0
    is_ai_generated: bool = False
    knowledge_refs: List[str] = []
    created_at: datetime

class LessonVersionOut(BaseModel):
    id: UUID
    lesson_id: UUID
    version: int
    content_text: str
    changed_by: Optional[UUID] = None
    change_summary: str
    changed_at: datetime

class AssignmentCreateRequest(BaseModel):
    module_id: UUID
    title: str
    description: str = ""
    guidelines: str = ""
    deadline: Optional[datetime] = None

class AssignmentOut(BaseModel):
    id: UUID
    module_id: UUID
    title: str
    description: str
    guidelines: str
    deadline: Optional[datetime] = None
    created_at: datetime

class EnrollmentCreateRequest(BaseModel):
    user_id: UUID
    course_id: UUID
    access_type: str = "full"
    enrollment_type: str = "manual"

class EnrollmentOut(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    access_type: str
    enrollment_type: str
    enrolled_at: datetime

class CourseFeedbackCreateRequest(BaseModel):
    rating: int = 5
    comment: str = ""

class CourseFeedbackOut(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    rating: int
    comment: str
    created_at: datetime

class CertificateOut(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    certificate_number: str
    recipient_name: str
    course_title: str
    instructor_name: str
    issued_at: datetime
    template_data_json: Dict[str, Any] = Field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# ASSESSMENTS & QUESTION BANK
# ─────────────────────────────────────────────────────────────────────────────
class AssessmentCreateRequest(BaseModel):
    title: str
    assessment_type: str = "quiz"
    module_id: Optional[UUID] = None
    instructions: str = ""
    passing_score: int = 60
    time_limit_minutes: int = 0
    time_limit_sec: int = 0
    max_attempts: int = 3
    marks_per_question: int = 1
    shuffle_questions: bool = True
    shuffle_options: bool = True

class AssessmentOut(BaseModel):
    id: UUID
    title: str
    assessment_type: str
    module_id: Optional[UUID] = None
    instructions: str = ""
    passing_score: int
    time_limit_minutes: int
    time_limit_sec: int = 0
    max_attempts: int = 3
    marks_per_question: int
    shuffle_questions: bool = True
    shuffle_options: bool = True
    is_ai_generated: bool = False
    created_at: datetime

class QuestionBankCreateRequest(BaseModel):
    question_text: str
    question_type: str = "mcq"
    options_json: Dict[str, Any] = Field(default_factory=dict)
    correct_answer_json: Dict[str, Any] = Field(default_factory=dict)
    explanation: str = ""
    difficulty: str = "medium"
    tags: List[str] = Field(default_factory=list)
    domain: str = ""
    language: str = "en"

class QuestionBankOut(BaseModel):
    id: UUID
    question_text: str
    question_type: str
    options_json: Dict[str, Any]
    correct_answer_json: Dict[str, Any]
    explanation: str = ""
    difficulty: str
    tags_json: List[str] = Field(default_factory=list)
    domain: str = ""
    language: str = "en"
    is_ai_generated: bool = False
    ai_model_used: Optional[str] = None
    usage_count: int = 0
    avg_correct_rate: Optional[float] = None
    review_status: str = "pending"
    created_at: datetime

class QuestionBankUpdateRequest(BaseModel):
    review_status: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    domain: Optional[str] = None

class AssessmentQuestionCreateRequest(BaseModel):
    question_text: str
    question_type: str = "mcq"
    options_json: Dict[str, Any] = {}
    correct_answer_index: int = 0
    marks: int = 1
    bank_question_id: Optional[UUID] = None

class AssessmentQuestionOut(BaseModel):
    id: UUID
    question_text: str
    question_type: str = "mcq"
    options_json: Dict[str, Any]
    correct_answer_index: int
    marks: int = 1
    bank_question_id: Optional[UUID] = None

class LinkBankQuestionsRequest(BaseModel):
    question_ids: List[UUID]

class AssessmentSubmissionRequest(BaseModel):
    assessment_id: UUID
    answers: Dict[str, int]
    time_taken_sec: int = 0

class AssessmentSubmissionOut(BaseModel):
    id: UUID
    assessment_id: UUID
    score: int
    passed: bool = False
    attempt_number: int = 1
    time_taken_sec: int = 0
    ai_feedback: str = ""
    submitted_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# PROGRESS & LEARNING
# ─────────────────────────────────────────────────────────────────────────────
class LessonCompleteRequest(BaseModel):
    lesson_id: UUID
    time_spent_sec: int = 0
    progress_pct: float = 1.0

class ProgressOut(BaseModel):
    completed_lesson_ids: List[UUID]
    last_scores: List[Dict[str, Any]]

class LessonRecommendationOut(BaseModel):
    lesson_id: UUID
    module_id: UUID
    title: str
    reason: str

class RecommendationOut(BaseModel):
    next_lessons: List[LessonRecommendationOut]

class CourseAssignRequest(BaseModel):
    course_id: UUID
    user_ids: List[UUID]
    deadline: Optional[datetime] = None
    notes: str = ""

class CourseAssignmentOut(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str = ""
    course_id: UUID
    course_title: str = ""
    deadline: Optional[datetime] = None
    status: str
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    notes: str = ""

class CourseProgressSummaryOut(BaseModel):
    course_id: UUID
    course_title: str
    total_assigned: int
    not_started: int
    in_progress: int
    completed: int


# ─────────────────────────────────────────────────────────────────────────────
# AI ENGINE
# ─────────────────────────────────────────────────────────────────────────────
class TutorFeedbackRequest(BaseModel):
    lesson_id: UUID
    learner_answer: str

class TutorFeedbackOut(BaseModel):
    feedback: str
    follow_up_question: str
    confidence_score: int

class SimulationStartRequest(BaseModel):
    blueprint_id: Optional[UUID] = None
    team: str
    focus_topic: str

class SimulationScenarioOut(BaseModel):
    id: UUID
    title: str
    team: str
    focus_topic: str
    prompt_text: str
    created_at: datetime

class SimulationSubmitRequest(BaseModel):
    scenario_id: UUID
    user_response_text: str

class SimulationAttemptOut(BaseModel):
    id: UUID
    scenario_id: UUID
    status: str
    score: int
    feedback_text: str
    created_at: datetime
    completed_at: Optional[datetime] = None

class AiContentCacheOut(BaseModel):
    id: UUID
    cache_key: str
    content_type: str
    output_text: str
    model_used: str
    tokens_used: int
    created_at: datetime
    expires_at: Optional[datetime] = None

class AiUsageLogOut(BaseModel):
    id: UUID
    feature: str
    model: str
    total_tokens: int
    latency_ms: int
    cache_hit: bool
    created_at: datetime

class AiUsageSummaryOut(BaseModel):
    total_calls: int
    total_tokens: int
    cache_hit_rate: float
    by_feature: Dict[str, int] = Field(default_factory=dict)
    by_model: Dict[str, int] = Field(default_factory=dict)

class AdaptiveLearningRuleCreateRequest(BaseModel):
    name: str
    trigger_condition: Dict[str, Any] = Field(default_factory=dict)
    action: Dict[str, Any] = Field(default_factory=dict)

class AdaptiveLearningRuleOut(BaseModel):
    id: UUID
    name: str
    trigger_condition: Dict[str, Any]
    action: Dict[str, Any]
    is_active: bool
    created_at: datetime

class JobEnqueueOut(BaseModel):
    job_id: UUID
    status: str
    message: str

class JobStatusOut(BaseModel):
    id: UUID
    job_type: str
    status: str
    result_json: Dict[str, Any] = Field(default_factory=dict)
    error_message: str = ""
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ─────────────────────────────────────────────────────────────────────────────
# GAMIFICATION
# ─────────────────────────────────────────────────────────────────────────────
class KpiIngestRequest(BaseModel):
    user_id: UUID
    metrics: Dict[str, float] = Field(default_factory=dict)

class KpiIngestOut(BaseModel):
    ok: bool
    updated_skills: List[Dict[str, Any]]

class BadgeOut(BaseModel):
    badge_code: str
    badge_name: str
    awarded_at: datetime

class GamificationProfileOut(BaseModel):
    user_id: UUID
    xp_points: int
    level: int
    badges_count: int
    streak_days: int
    longest_streak: int = 0
    rank: Optional[int] = None
    badges: List[BadgeOut] = Field(default_factory=list)

class LeaderboardRowOut(BaseModel):
    user_id: UUID
    full_name: str
    role: str
    xp_points: int
    level: int
    badges_count: int
    rank: int = 0

class LeaderboardOut(BaseModel):
    leaderboard: List[LeaderboardRowOut]
    period_type: str = "all_time"

class XpTransactionOut(BaseModel):
    id: UUID
    action: str
    xp_earned: int
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    created_at: datetime

class BadgeDefinitionCreateRequest(BaseModel):
    name: str
    description: str = ""
    icon: str = "🏆"
    criteria: Dict[str, Any] = Field(default_factory=dict)

class BadgeDefinitionOut(BaseModel):
    id: UUID
    name: str
    description: str
    icon: str
    criteria: Dict[str, Any]
    is_active: bool
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# INTEGRATIONS
# ─────────────────────────────────────────────────────────────────────────────
class WebhookCreateRequest(BaseModel):
    name: str = ""
    provider: str
    target_url: str
    event_name: str = "progress.updated"
    events: List[str] = Field(default_factory=list)
    secret: Optional[str] = None
    headers_json: Dict[str, Any] = Field(default_factory=dict)
    retry_policy: Dict[str, Any] = Field(default_factory=dict)

class WebhookOut(BaseModel):
    id: UUID
    name: str
    provider: str
    target_url: str
    event_name: str
    events: List[str] = Field(default_factory=list)
    is_active: bool
    last_triggered_at: Optional[datetime] = None
    created_at: datetime

class WebhookDeliveryLogOut(BaseModel):
    id: UUID
    webhook_id: UUID
    event_type: str
    response_status: Optional[int] = None
    attempt_number: int
    error: Optional[str] = None
    delivered_at: datetime

class ExternalIntegrationCreateRequest(BaseModel):
    integration_type: str
    name: str
    config_json: Dict[str, Any] = Field(default_factory=dict)

class ExternalIntegrationOut(BaseModel):
    id: UUID
    integration_type: str
    name: str
    status: str
    last_synced_at: Optional[datetime] = None
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# HR & OPERATIONS
# ─────────────────────────────────────────────────────────────────────────────
class AttendanceCreateRequest(BaseModel):
    user_id: UUID
    date: str
    status: str = "present"
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class AttendanceRecordOut(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str = ""
    date: str
    status: str
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    location: Optional[str] = None
    notes: str = ""
    created_at: datetime

class AttendanceSummaryOut(BaseModel):
    date: str
    present: int
    absent: int
    late: int
    on_leave: int
    total: int

class LeaveTypeCreateRequest(BaseModel):
    name: str
    days_allowed: int = 10
    carry_forward: bool = False
    requires_approval: bool = True

class LeaveTypeOut(BaseModel):
    id: UUID
    name: str
    days_allowed: int
    carry_forward: bool
    requires_approval: bool
    created_at: datetime

class LeaveRequestCreateRequest(BaseModel):
    leave_type: str = "casual"
    leave_type_id: Optional[UUID] = None
    start_date: str
    end_date: str
    days_count: int = 1
    reason: str

class LeaveRequestOut(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str = ""
    leave_type: str
    start_date: str
    end_date: str
    days_count: int
    reason: str
    status: str
    manager_comment: Optional[str] = None
    rejection_reason: Optional[str] = None
    applied_at: datetime
    reviewed_at: Optional[datetime] = None

class LeaveActionRequest(BaseModel):
    comment: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────
class TenantAnalyticsOut(BaseModel):
    total_users: int
    active_users: int
    total_courses: int
    published_courses: int
    total_enrollments: int
    avg_completion_rate: float
    total_assessments_taken: int
    avg_assessment_score: float
    total_knowledge_items: int
    ai_jobs_run: int
    top_courses: List[Dict[str, Any]] = Field(default_factory=list)
    skill_distribution: Dict[str, Any] = Field(default_factory=dict)

class UserAnalyticsOut(BaseModel):
    user_id: UUID
    courses_enrolled: int
    courses_completed: int
    lessons_completed: int
    avg_assessment_score: float
    total_time_spent_sec: int
    xp_points: int
    level: int
    badges_count: int
    streak_days: int
    skill_scores: List[Dict[str, Any]] = Field(default_factory=list)

class AnalyticsSnapshotOut(BaseModel):
    snapshot_date: str
    active_users: int
    total_completions: int
    avg_score: float
    content_items: int
    ai_jobs_run: int
