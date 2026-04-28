"""Courses, modules, lessons, assignments, enrollment, certificates router."""
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, require_roles
from app.models import (
    Course, Module, Lesson, LessonVersion, Assignment, AssignmentSubmission,
    Enrollment, CourseFeedback, Certificate, CourseAssignment,
    LessonProgress, UserGamification, XpTransaction, Notification, User,
    CoursePrerequisite, LearningPath, UserLearningPathEnrollment,
)
from app.schemas import (
    CourseCreateRequest, CourseUpdateRequest, CourseOut,
    ModuleCreateRequest, ModuleOut,
    LessonCreateRequest, LessonOut, LessonVersionOut,
    AssignmentCreateRequest, AssignmentOut,
    EnrollmentCreateRequest, EnrollmentOut,
    CourseFeedbackCreateRequest, CourseFeedbackOut,
    CertificateOut, CourseAssignRequest, CourseAssignmentOut, CourseProgressSummaryOut,
    LessonCompleteRequest, ProgressOut, LessonRecommendationOut, RecommendationOut,
    CoursePrerequisiteCreateRequest, LearningPathCreateRequest, LearningPathOut,
)

router = APIRouter(prefix="/api", tags=["Courses"])


# ─── Courses ─────────────────────────────────────────────────────────────────

@router.get("/courses", response_model=List[CourseOut])
def list_courses(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = select(Course).where(Course.tenant_id == current_user.tenant_id)
    if status:
        q = q.where(Course.status == status)
    elif current_user.role == "employee":
        q = q.where(Course.status == "published")
    courses = db.scalars(q.order_by(Course.created_at.desc())).all()
    return [_course_out(c) for c in courses]


@router.post("/courses", response_model=CourseOut, status_code=201)
def create_course(
    body: CourseCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    course = Course(
        tenant_id=current_user.tenant_id,
        title=body.title, description=body.description, objectives=body.objectives,
        category=body.category, thumbnail_url=body.thumbnail_url,
        level=body.level, difficulty=body.difficulty,
        duration_hours=body.duration_hours, estimated_hours=body.estimated_hours,
        language=body.language, visibility=body.visibility,
        progress_tracking_enabled=body.progress_tracking_enabled,
        certification_enabled=body.certification_enabled,
        instructor_name=body.instructor_name,
        tags_json=body.tags,
        created_by=current_user.id,
    )
    db.add(course)
    db.commit()
    return _course_out(course)


@router.put("/courses/{course_id}", response_model=CourseOut)
def update_course(
    course_id: str,
    body: CourseUpdateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    course = _get_course(db, course_id, current_user.tenant_id)
    updates = body.model_dump(exclude_none=True)
    if "tags" in updates:
        course.tags_json = updates.pop("tags")
    for k, v in updates.items():
        setattr(course, k, v)
    course.updated_at = datetime.utcnow()
    db.commit()
    return _course_out(course)


@router.post("/courses/{course_id}/publish", response_model=CourseOut)
def publish_course(
    course_id: str,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    course = _get_course(db, course_id, current_user.tenant_id)
    course.status = "published"
    course.published_at = datetime.utcnow()
    course.updated_at = datetime.utcnow()
    db.commit()
    return _course_out(course)


@router.post("/courses/{course_id}/archive", response_model=CourseOut)
def archive_course(
    course_id: str,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    course = _get_course(db, course_id, current_user.tenant_id)
    course.status = "archived"
    course.updated_at = datetime.utcnow()
    db.commit()
    return _course_out(course)


@router.post("/courses/{course_id}/enroll-me", response_model=EnrollmentOut)
def self_enroll(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = _get_course(db, course_id, current_user.tenant_id)
    existing = db.scalars(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course.id,
        )
    ).first()
    if existing:
        raise HTTPException(400, "Already enrolled")
    enroll = Enrollment(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        course_id=course.id,
        enrollment_type="self",
    )
    db.add(enroll)
    db.commit()
    return EnrollmentOut(
        id=enroll.id, user_id=enroll.user_id, course_id=enroll.course_id,
        access_type=enroll.access_type, enrollment_type=enroll.enrollment_type,
        enrolled_at=enroll.enrolled_at,
    )


@router.get("/courses/{course_id}/enrollments", response_model=List[EnrollmentOut])
def list_enrollments(
    course_id: str,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    enrollments = db.scalars(
        select(Enrollment).where(Enrollment.course_id == course_id)
    ).all()
    return [EnrollmentOut(
        id=e.id, user_id=e.user_id, course_id=e.course_id,
        access_type=e.access_type, enrollment_type=e.enrollment_type,
        enrolled_at=e.enrolled_at,
    ) for e in enrollments]


@router.post("/enrollments", response_model=EnrollmentOut, status_code=201)
def enroll_user(
    body: EnrollmentCreateRequest,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    enroll = Enrollment(
        tenant_id=current_user.tenant_id,
        user_id=body.user_id,
        course_id=body.course_id,
        access_type=body.access_type,
        enrollment_type=body.enrollment_type,
    )
    db.add(enroll)
    db.commit()
    return EnrollmentOut(
        id=enroll.id, user_id=enroll.user_id, course_id=enroll.course_id,
        access_type=enroll.access_type, enrollment_type=enroll.enrollment_type,
        enrolled_at=enroll.enrolled_at,
    )


# ─── Course Feedback ─────────────────────────────────────────────────────────

@router.post("/courses/{course_id}/feedback", response_model=CourseFeedbackOut, status_code=201)
def submit_feedback(
    course_id: str,
    body: CourseFeedbackCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fb = CourseFeedback(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        course_id=course_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(fb)
    db.commit()
    return CourseFeedbackOut(id=fb.id, user_id=fb.user_id, course_id=fb.course_id,
                             rating=fb.rating, comment=fb.comment, created_at=fb.created_at)


@router.get("/courses/{course_id}/feedback", response_model=List[CourseFeedbackOut])
def list_feedback(
    course_id: str,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    items = db.scalars(select(CourseFeedback).where(CourseFeedback.course_id == course_id)).all()
    return [CourseFeedbackOut(id=f.id, user_id=f.user_id, course_id=f.course_id,
                              rating=f.rating, comment=f.comment, created_at=f.created_at)
            for f in items]


# ─── Certificates ────────────────────────────────────────────────────────────

@router.post("/courses/{course_id}/certificates", response_model=CertificateOut, status_code=201)
def issue_certificate(
    course_id: str,
    user_id: str,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    course = _get_course(db, course_id, current_user.tenant_id)
    target_user = db.get(User, user_id)
    cert_num = f"CERT-{str(uuid.uuid4())[:8].upper()}"
    cert = Certificate(
        tenant_id=current_user.tenant_id,
        user_id=user_id,
        course_id=course_id,
        certificate_number=cert_num,
        recipient_name=target_user.full_name if target_user else "Unknown",
        course_title=course.title,
        instructor_name=course.instructor_name,
        template_data_json={"issued_by": current_user.full_name},
    )
    db.add(cert)
    db.commit()
    return CertificateOut(
        id=cert.id, user_id=cert.user_id, course_id=cert.course_id,
        certificate_number=cert.certificate_number, recipient_name=cert.recipient_name,
        course_title=cert.course_title, instructor_name=cert.instructor_name,
        issued_at=cert.issued_at, template_data_json=cert.template_data_json or {},
    )


@router.get("/certificates/me", response_model=List[CertificateOut])
def my_certificates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    certs = db.scalars(select(Certificate).where(Certificate.user_id == current_user.id)).all()
    return [CertificateOut(
        id=c.id, user_id=c.user_id, course_id=c.course_id,
        certificate_number=c.certificate_number, recipient_name=c.recipient_name,
        course_title=c.course_title, instructor_name=c.instructor_name,
        issued_at=c.issued_at, template_data_json=c.template_data_json or {},
    ) for c in certs]


# ─── Course Assignments ───────────────────────────────────────────────────────

@router.post("/courses/assign", response_model=List[CourseAssignmentOut], status_code=201)
def assign_courses(
    body: CourseAssignRequest,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    course = _get_course(db, str(body.course_id), current_user.tenant_id)
    results = []
    for uid in body.user_ids:
        user = db.get(User, uid)
        ca = CourseAssignment(
            tenant_id=current_user.tenant_id,
            assigned_by_id=current_user.id,
            user_id=uid,
            course_id=body.course_id,
            deadline=body.deadline,
            notes=body.notes,
        )
        db.add(ca)
        # Send notification
        db.add(Notification(
            tenant_id=current_user.tenant_id,
            user_id=uid,
            type="course_assigned",
            title="New Course Assigned",
            message=f"You've been assigned: {course.title}",
            data_json={"course_id": str(body.course_id)},
        ))
        results.append(CourseAssignmentOut(
            id=ca.id, user_id=uid, full_name=user.full_name if user else "",
            course_id=body.course_id, course_title=course.title,
            deadline=body.deadline, status=ca.status,
            assigned_at=ca.assigned_at, notes=body.notes,
        ))
    db.commit()
    return results


@router.get("/courses/assignments", response_model=List[CourseAssignmentOut])
def list_course_assignments(
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    assignments = db.scalars(
        select(CourseAssignment)
        .where(CourseAssignment.tenant_id == current_user.tenant_id)
        .order_by(CourseAssignment.assigned_at.desc())
    ).all()
    result = []
    for ca in assignments:
        user = db.get(User, ca.user_id)
        course = db.get(Course, ca.course_id)
        result.append(CourseAssignmentOut(
            id=ca.id, user_id=ca.user_id, full_name=user.full_name if user else "",
            course_id=ca.course_id, course_title=course.title if course else "",
            deadline=ca.deadline, status=ca.status,
            assigned_at=ca.assigned_at, completed_at=ca.completed_at, notes=ca.notes,
        ))
    return result


@router.get("/courses/progress", response_model=List[CourseProgressSummaryOut])
def course_progress_summary(
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    courses = db.scalars(
        select(Course).where(Course.tenant_id == current_user.tenant_id, Course.status == "published")
    ).all()
    result = []
    for course in courses:
        assignments = db.scalars(
            select(CourseAssignment).where(CourseAssignment.course_id == course.id)
        ).all()
        total = len(assignments)
        not_started = sum(1 for a in assignments if a.status == "not_started")
        in_prog = sum(1 for a in assignments if a.status == "in_progress")
        completed = sum(1 for a in assignments if a.status == "completed")
        result.append(CourseProgressSummaryOut(
            course_id=course.id, course_title=course.title,
            total_assigned=total, not_started=not_started,
            in_progress=in_prog, completed=completed,
        ))
    return result


# ─── Modules ─────────────────────────────────────────────────────────────────

@router.get("/courses/{course_id}/modules", response_model=List[ModuleOut])
def list_modules(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    modules = db.scalars(
        select(Module).where(Module.course_id == course_id, Module.tenant_id == current_user.tenant_id)
        .order_by(Module.order_index)
    ).all()
    return [ModuleOut(
        id=m.id, course_id=m.course_id, title=m.title, description=m.description,
        section_title=m.section_title, order_index=m.order_index,
        estimated_minutes=m.estimated_minutes, created_at=m.created_at,
    ) for m in modules]


@router.post("/courses/{course_id}/modules", response_model=ModuleOut, status_code=201)
def create_module(
    course_id: str,
    body: ModuleCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    _get_course(db, course_id, current_user.tenant_id)
    module = Module(
        tenant_id=current_user.tenant_id,
        course_id=course_id,
        title=body.title, description=body.description,
        section_title=body.section_title, order_index=body.order_index,
        estimated_minutes=body.estimated_minutes,
        unlock_condition=body.unlock_condition,
    )
    db.add(module)
    db.commit()
    return ModuleOut(
        id=module.id, course_id=module.course_id, title=module.title,
        description=module.description, section_title=module.section_title,
        order_index=module.order_index, estimated_minutes=module.estimated_minutes,
        created_at=module.created_at,
    )


# ─── Lessons ─────────────────────────────────────────────────────────────────

@router.get("/modules/{module_id}/lessons", response_model=List[LessonOut])
def list_lessons(
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lessons = db.scalars(
        select(Lesson).where(Lesson.module_id == module_id, Lesson.tenant_id == current_user.tenant_id)
        .order_by(Lesson.order_index)
    ).all()
    return [_lesson_out(l) for l in lessons]


@router.post("/modules/{module_id}/lessons", response_model=LessonOut, status_code=201)
def create_lesson(
    module_id: str,
    body: LessonCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    lesson = Lesson(
        tenant_id=current_user.tenant_id, module_id=module_id,
        title=body.title, content_text=body.content_text,
        content_type=body.content_type,
        video_url=body.video_url, video_duration_sec=body.video_duration_sec,
        subtitle_url=body.subtitle_url,
        reading_materials_json=body.reading_materials,
        downloadable_resources_json=body.downloadable_resources,
        order_index=body.order_index,
        knowledge_refs=body.knowledge_refs,
    )
    db.add(lesson)
    db.commit()
    return _lesson_out(lesson)


@router.put("/lessons/{lesson_id}", response_model=LessonOut)
def update_lesson(
    lesson_id: str,
    body: LessonCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    lesson = db.scalars(
        select(Lesson).where(Lesson.id == lesson_id, Lesson.tenant_id == current_user.tenant_id)
    ).first()
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    # Version current content before overwrite
    if lesson.content_text:
        version_count = db.scalar(select(func.count(LessonVersion.id)).where(LessonVersion.lesson_id == lesson.id)) or 0
        db.add(LessonVersion(
            lesson_id=lesson.id, tenant_id=lesson.tenant_id,
            version=version_count + 1, content_text=lesson.content_text,
            changed_by=current_user.id, change_summary="Updated via API",
        ))

    lesson.title = body.title
    lesson.content_text = body.content_text
    lesson.content_type = body.content_type
    lesson.video_url = body.video_url
    lesson.subtitle_url = body.subtitle_url
    lesson.reading_materials_json = body.reading_materials
    lesson.downloadable_resources_json = body.downloadable_resources
    lesson.order_index = body.order_index
    lesson.updated_at = datetime.utcnow()
    db.commit()
    return _lesson_out(lesson)


@router.get("/lessons/{lesson_id}/versions", response_model=List[LessonVersionOut])
def list_lesson_versions(
    lesson_id: str,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    versions = db.scalars(
        select(LessonVersion).where(LessonVersion.lesson_id == lesson_id)
        .order_by(LessonVersion.version.desc())
    ).all()
    return [LessonVersionOut(
        id=v.id, lesson_id=v.lesson_id, version=v.version,
        content_text=v.content_text, changed_by=v.changed_by,
        change_summary=v.change_summary, changed_at=v.changed_at,
    ) for v in versions]


# ─── Progress ────────────────────────────────────────────────────────────────

@router.post("/progress/lesson-complete", response_model=ProgressOut)
def complete_lesson(
    body: LessonCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.scalars(
        select(LessonProgress).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.lesson_id == body.lesson_id,
        )
    ).first()
    if not existing:
        progress = LessonProgress(
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            lesson_id=body.lesson_id,
            status="completed",
            progress_pct=1.0,
            time_spent_sec=body.time_spent_sec,
            completed_at=datetime.utcnow(),
        )
        db.add(progress)
        # Award XP
        _award_xp(db, current_user, "lesson_complete", str(body.lesson_id), "lesson", 10)
    else:
        existing.status = "completed"
        existing.progress_pct = 1.0
        existing.time_spent_sec += body.time_spent_sec
        existing.completed_at = datetime.utcnow()

    db.commit()

    completed_ids = db.scalars(
        select(LessonProgress.lesson_id).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.tenant_id == current_user.tenant_id,
            LessonProgress.status == "completed",
        )
    ).all()
    return ProgressOut(completed_lesson_ids=list(completed_ids), last_scores=[])


@router.get("/recommendations/next-lessons", response_model=RecommendationOut)
def next_lesson_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Find lowest skill scores
    skills = db.scalars(
        select(SkillScorecard)
        .where(SkillScorecard.user_id == current_user.id)
        .order_by(SkillScorecard.score.asc())
        .limit(3)
    ).all()

    completed_ids = set(db.scalars(
        select(LessonProgress.lesson_id).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.status == "completed",
        )
    ).all())

    all_lessons = db.scalars(
        select(Lesson).where(Lesson.tenant_id == current_user.tenant_id)
        .limit(50)
    ).all()

    result = []
    for lesson in all_lessons:
        if lesson.id in completed_ids:
            continue
        skill_match = next((s.skill_name for s in skills if s.skill_name.lower() in lesson.title.lower()), None)
        reason = f"Addresses skill gap: {skill_match}" if skill_match else "Continue learning"
        result.append(LessonRecommendationOut(
            lesson_id=lesson.id, module_id=lesson.module_id,
            title=lesson.title, reason=reason,
        ))
        if len(result) >= 5:
            break

    return RecommendationOut(next_lessons=result)


# ─── Assignments ─────────────────────────────────────────────────────────────

@router.post("/modules/{module_id}/assignments", response_model=AssignmentOut, status_code=201)
def create_assignment(
    module_id: str,
    body: AssignmentCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    assignment = Assignment(
        tenant_id=current_user.tenant_id, module_id=module_id,
        title=body.title, description=body.description,
        guidelines=body.guidelines, deadline=body.deadline,
    )
    db.add(assignment)
    db.commit()
    return AssignmentOut(
        id=assignment.id, module_id=assignment.module_id,
        title=assignment.title, description=assignment.description,
        guidelines=assignment.guidelines, deadline=assignment.deadline,
        created_at=assignment.created_at,
    )


@router.get("/modules/{module_id}/assignments", response_model=List[AssignmentOut])
def list_assignments(
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.scalars(select(Assignment).where(Assignment.module_id == module_id)).all()
    return [AssignmentOut(
        id=a.id, module_id=a.module_id, title=a.title, description=a.description,
        guidelines=a.guidelines, deadline=a.deadline, created_at=a.created_at,
    ) for a in items]


# ─── Learning Paths ──────────────────────────────────────────────────────────

@router.post("/learning-paths", response_model=LearningPathOut, status_code=201)
def create_learning_path(
    body: LearningPathCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    path = LearningPath(
        tenant_id=current_user.tenant_id,
        name=body.name, description=body.description,
        course_sequence=body.course_sequence,
        target_role=body.target_role,
        thumbnail_url=body.thumbnail_url,
        created_by=current_user.id,
    )
    db.add(path)
    db.commit()
    return LearningPathOut(
        id=path.id, name=path.name, description=path.description,
        is_ai_generated=path.is_ai_generated, course_sequence=path.course_sequence or [],
        target_role=path.target_role, thumbnail_url=path.thumbnail_url,
        created_at=path.created_at,
    )


@router.get("/learning-paths", response_model=List[LearningPathOut])
def list_learning_paths(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    paths = db.scalars(
        select(LearningPath).where(LearningPath.tenant_id == current_user.tenant_id)
    ).all()
    return [LearningPathOut(
        id=p.id, name=p.name, description=p.description,
        is_ai_generated=p.is_ai_generated, course_sequence=p.course_sequence or [],
        target_role=p.target_role, thumbnail_url=p.thumbnail_url,
        created_at=p.created_at,
    ) for p in paths]


# ─── Course Prerequisites ────────────────────────────────────────────────────

@router.post("/courses/{course_id}/prerequisites", status_code=201)
def add_prerequisite(
    course_id: str,
    body: CoursePrerequisiteCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    prereq = CoursePrerequisite(
        tenant_id=current_user.tenant_id,
        course_id=course_id,
        required_course_id=body.required_course_id,
    )
    db.add(prereq)
    db.commit()
    return {"ok": True, "course_id": course_id, "required_course_id": str(body.required_course_id)}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_course(db: Session, course_id: str, tenant_id) -> Course:
    course = db.scalars(
        select(Course).where(Course.id == course_id, Course.tenant_id == tenant_id)
    ).first()
    if not course:
        raise HTTPException(404, "Course not found")
    return course


def _course_out(c: Course) -> CourseOut:
    return CourseOut(
        id=c.id, title=c.title, description=c.description, objectives=c.objectives,
        category=c.category, thumbnail_url=c.thumbnail_url, status=c.status,
        visibility=c.visibility, level=c.level, difficulty=c.difficulty,
        duration_hours=c.duration_hours, estimated_hours=c.estimated_hours,
        language=c.language, progress_tracking_enabled=c.progress_tracking_enabled,
        certification_enabled=c.certification_enabled, instructor_name=c.instructor_name,
        is_ai_generated=c.is_ai_generated, tags_json=c.tags_json or [],
        created_at=c.created_at, published_at=c.published_at,
    )


def _lesson_out(l: Lesson) -> LessonOut:
    return LessonOut(
        id=l.id, module_id=l.module_id, title=l.title, content_text=l.content_text,
        content_type=l.content_type, video_url=l.video_url,
        video_duration_sec=l.video_duration_sec, subtitle_url=l.subtitle_url,
        reading_materials_json=l.reading_materials_json or [],
        downloadable_resources_json=l.downloadable_resources_json or [],
        order_index=l.order_index, is_ai_generated=l.is_ai_generated,
        knowledge_refs=l.knowledge_refs or [],
        created_at=l.created_at,
    )


def _award_xp(db: Session, user: User, action: str, ref_id: str, ref_type: str, points: int):
    gamif = db.scalars(
        select(UserGamification).where(UserGamification.user_id == user.id)
    ).first()
    if not gamif:
        gamif = UserGamification(tenant_id=user.tenant_id, user_id=user.id)
        db.add(gamif)
    gamif.xp_points += points
    gamif.last_activity_at = datetime.utcnow()
    # Level up: every 100 XP = 1 level
    gamif.level = max(1, gamif.xp_points // 100 + 1)
    db.add(XpTransaction(
        user_id=user.id, tenant_id=user.tenant_id,
        action=action, xp_earned=points,
        reference_id=ref_id, reference_type=ref_type,
    ))
