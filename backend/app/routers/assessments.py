"""Assessments, question bank, submissions router."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, require_roles
from app.models import (
    Assessment, AssessmentQuestion, AssessmentSubmission,
    QuestionBank, AssessmentQuestionLink,
    UserGamification, XpTransaction, SkillScorecard, Notification, User,
)
from app.schemas import (
    AssessmentCreateRequest, AssessmentOut,
    AssessmentQuestionCreateRequest, AssessmentQuestionOut,
    AssessmentSubmissionRequest, AssessmentSubmissionOut,
    QuestionBankCreateRequest, QuestionBankOut, QuestionBankUpdateRequest,
    LinkBankQuestionsRequest,
)

router = APIRouter(prefix="/api", tags=["Assessments"])


# ─── Assessments ─────────────────────────────────────────────────────────────

@router.get("/assessments", response_model=List[AssessmentOut])
def list_assessments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.scalars(
        select(Assessment).where(Assessment.tenant_id == current_user.tenant_id)
    ).all()
    return [_assessment_out(a) for a in items]


@router.post("/assessments", response_model=AssessmentOut, status_code=201)
def create_assessment(
    body: AssessmentCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    a = Assessment(
        tenant_id=current_user.tenant_id,
        title=body.title, assessment_type=body.assessment_type,
        module_id=body.module_id, instructions=body.instructions,
        passing_score=body.passing_score, time_limit_minutes=body.time_limit_minutes,
        time_limit_sec=body.time_limit_sec, max_attempts=body.max_attempts,
        marks_per_question=body.marks_per_question,
        shuffle_questions=body.shuffle_questions, shuffle_options=body.shuffle_options,
    )
    db.add(a)
    db.commit()
    return _assessment_out(a)


@router.post("/modules/{module_id}/assessments", response_model=AssessmentOut, status_code=201)
def create_module_assessment(
    module_id: str,
    body: AssessmentCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    body.module_id = module_id
    return create_assessment(body, current_user, db)


@router.get("/modules/{module_id}/assessments", response_model=List[AssessmentOut])
def list_module_assessments(
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.scalars(
        select(Assessment).where(Assessment.module_id == module_id)
    ).all()
    return [_assessment_out(a) for a in items]


# ─── Questions (legacy direct) ───────────────────────────────────────────────

@router.get("/assessments/{assessment_id}/questions", response_model=List[AssessmentQuestionOut])
def list_questions(
    assessment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.scalars(
        select(AssessmentQuestion).where(AssessmentQuestion.assessment_id == assessment_id)
    ).all()
    return [AssessmentQuestionOut(
        id=q.id, question_text=q.question_text, question_type=q.question_type,
        options_json=q.options_json, correct_answer_index=q.correct_answer_index,
        marks=q.marks, bank_question_id=q.bank_question_id,
    ) for q in items]


@router.post("/assessments/{assessment_id}/questions", response_model=AssessmentQuestionOut, status_code=201)
def add_question(
    assessment_id: str,
    body: AssessmentQuestionCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    q = AssessmentQuestion(
        tenant_id=current_user.tenant_id, assessment_id=assessment_id,
        question_text=body.question_text, question_type=body.question_type,
        options_json=body.options_json, correct_answer_index=body.correct_answer_index,
        marks=body.marks, bank_question_id=body.bank_question_id,
    )
    db.add(q)
    db.commit()
    return AssessmentQuestionOut(
        id=q.id, question_text=q.question_text, question_type=q.question_type,
        options_json=q.options_json, correct_answer_index=q.correct_answer_index,
        marks=q.marks, bank_question_id=q.bank_question_id,
    )


# ─── Question Bank ───────────────────────────────────────────────────────────

@router.get("/question-bank", response_model=List[QuestionBankOut])
def list_question_bank(
    domain: Optional[str] = None,
    difficulty: Optional[str] = None,
    review_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    q = select(QuestionBank).where(QuestionBank.tenant_id == current_user.tenant_id)
    if domain:
        q = q.where(QuestionBank.domain == domain)
    if difficulty:
        q = q.where(QuestionBank.difficulty == difficulty)
    if review_status:
        q = q.where(QuestionBank.review_status == review_status)
    items = db.scalars(q.order_by(QuestionBank.created_at.desc()).limit(limit).offset(offset)).all()
    return [_qbank_out(item) for item in items]


@router.post("/question-bank", response_model=QuestionBankOut, status_code=201)
def create_question_bank_entry(
    body: QuestionBankCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    q = QuestionBank(
        tenant_id=current_user.tenant_id,
        question_text=body.question_text, question_type=body.question_type,
        options_json=body.options_json, correct_answer_json=body.correct_answer_json,
        explanation=body.explanation, difficulty=body.difficulty,
        tags_json=body.tags, domain=body.domain, language=body.language,
        created_by=current_user.id,
    )
    db.add(q)
    db.commit()
    return _qbank_out(q)


@router.patch("/question-bank/{question_id}", response_model=QuestionBankOut)
def update_question_bank_entry(
    question_id: str,
    body: QuestionBankUpdateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    q = db.scalars(
        select(QuestionBank).where(QuestionBank.id == question_id)
    ).first()
    if not q:
        raise HTTPException(404, "Question not found")
    updates = body.model_dump(exclude_none=True)
    if "tags" in updates:
        q.tags_json = updates.pop("tags")
    if body.review_status:
        q.reviewed_by = current_user.id
    for k, v in updates.items():
        setattr(q, k, v)
    q.updated_at = datetime.utcnow()
    db.commit()
    return _qbank_out(q)


@router.post("/assessments/{assessment_id}/link-questions", status_code=201)
def link_bank_questions(
    assessment_id: str,
    body: LinkBankQuestionsRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    for idx, qid in enumerate(body.question_ids):
        link = AssessmentQuestionLink(
            assessment_id=assessment_id,
            question_id=qid,
            tenant_id=current_user.tenant_id,
            order_index=idx,
        )
        db.add(link)
        # bump usage_count
        q = db.get(QuestionBank, qid)
        if q:
            q.usage_count += 1
    db.commit()
    return {"ok": True, "linked": len(body.question_ids)}


# ─── Submissions ─────────────────────────────────────────────────────────────

@router.post("/submissions", response_model=AssessmentSubmissionOut, status_code=201)
def submit_assessment(
    body: AssessmentSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assessment = db.scalars(
        select(Assessment).where(Assessment.id == body.assessment_id)
    ).first()
    if not assessment:
        raise HTTPException(404, "Assessment not found")

    # Count previous attempts
    attempt_num = (db.scalar(
        select(func.count(AssessmentSubmission.id)).where(
            AssessmentSubmission.assessment_id == body.assessment_id,
            AssessmentSubmission.user_id == current_user.id,
        )
    ) or 0) + 1

    if attempt_num > assessment.max_attempts:
        raise HTTPException(400, f"Max attempts ({assessment.max_attempts}) exceeded")

    # Score calculation
    questions = db.scalars(
        select(AssessmentQuestion).where(AssessmentQuestion.assessment_id == body.assessment_id)
    ).all()
    total_marks = sum(q.marks for q in questions) or 1
    earned = 0
    for q in questions:
        user_ans = body.answers.get(str(q.id))
        if user_ans is not None and user_ans == q.correct_answer_index:
            earned += q.marks
    score_pct = int((earned / total_marks) * 100)
    passed = score_pct >= assessment.passing_score

    sub = AssessmentSubmission(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        assessment_id=body.assessment_id,
        attempt_number=attempt_num,
        answers_json=body.answers,
        score=score_pct,
        passed=passed,
        time_taken_sec=body.time_taken_sec,
    )
    db.add(sub)

    if passed:
        # Award XP and update skill scorecard
        _award_xp(db, current_user, "assessment_pass", str(body.assessment_id), "assessment", 25)

    db.commit()
    return AssessmentSubmissionOut(
        id=sub.id, assessment_id=sub.assessment_id,
        score=sub.score, passed=sub.passed,
        attempt_number=sub.attempt_number,
        time_taken_sec=sub.time_taken_sec,
        ai_feedback=sub.ai_feedback,
        submitted_at=sub.submitted_at,
    )


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _assessment_out(a: Assessment) -> AssessmentOut:
    return AssessmentOut(
        id=a.id, title=a.title, assessment_type=a.assessment_type,
        module_id=a.module_id, instructions=a.instructions or "",
        passing_score=a.passing_score, time_limit_minutes=a.time_limit_minutes,
        time_limit_sec=a.time_limit_sec, max_attempts=a.max_attempts,
        marks_per_question=a.marks_per_question,
        shuffle_questions=a.shuffle_questions, shuffle_options=a.shuffle_options,
        is_ai_generated=a.is_ai_generated, created_at=a.created_at,
    )


def _qbank_out(q: QuestionBank) -> QuestionBankOut:
    return QuestionBankOut(
        id=q.id, question_text=q.question_text, question_type=q.question_type,
        options_json=q.options_json or {}, correct_answer_json=q.correct_answer_json or {},
        explanation=q.explanation or "", difficulty=q.difficulty,
        tags_json=q.tags_json or [], domain=q.domain or "",
        language=q.language, is_ai_generated=q.is_ai_generated,
        ai_model_used=q.ai_model_used, usage_count=q.usage_count,
        avg_correct_rate=q.avg_correct_rate, review_status=q.review_status,
        created_at=q.created_at,
    )


def _award_xp(db: Session, user: User, action: str, ref_id: str, ref_type: str, points: int):
    gamif = db.scalars(select(UserGamification).where(UserGamification.user_id == user.id)).first()
    if not gamif:
        gamif = UserGamification(tenant_id=user.tenant_id, user_id=user.id)
        db.add(gamif)
    gamif.xp_points += points
    gamif.level = max(1, gamif.xp_points // 100 + 1)
    gamif.last_activity_at = datetime.utcnow()
    db.add(XpTransaction(
        user_id=user.id, tenant_id=user.tenant_id,
        action=action, xp_earned=points,
        reference_id=ref_id, reference_type=ref_type,
    ))
