"""HR & Operations: attendance, leave requests, leave types router."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, require_roles
from app.models import AttendanceRecord, LeaveRequest, LeaveType, User, Notification
from app.schemas import (
    AttendanceCreateRequest, AttendanceRecordOut, AttendanceSummaryOut,
    LeaveRequestCreateRequest, LeaveRequestOut, LeaveActionRequest,
    LeaveTypeCreateRequest, LeaveTypeOut,
)

router = APIRouter(prefix="/api", tags=["HR"])


# ─── Leave Types ─────────────────────────────────────────────────────────────

@router.post("/leave-types", response_model=LeaveTypeOut, status_code=201)
def create_leave_type(
    body: LeaveTypeCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    lt = LeaveType(
        tenant_id=current_user.tenant_id,
        name=body.name, days_allowed=body.days_allowed,
        carry_forward=body.carry_forward, requires_approval=body.requires_approval,
    )
    db.add(lt)
    db.commit()
    return LeaveTypeOut(
        id=lt.id, name=lt.name, days_allowed=lt.days_allowed,
        carry_forward=lt.carry_forward, requires_approval=lt.requires_approval,
        created_at=lt.created_at,
    )


@router.get("/leave-types", response_model=List[LeaveTypeOut])
def list_leave_types(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    types = db.scalars(
        select(LeaveType).where(LeaveType.tenant_id == current_user.tenant_id)
    ).all()
    return [LeaveTypeOut(
        id=lt.id, name=lt.name, days_allowed=lt.days_allowed,
        carry_forward=lt.carry_forward, requires_approval=lt.requires_approval,
        created_at=lt.created_at,
    ) for lt in types]


# ─── Attendance ───────────────────────────────────────────────────────────────

@router.post("/attendance", response_model=AttendanceRecordOut, status_code=201)
def create_attendance(
    body: AttendanceCreateRequest,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    existing = db.scalars(
        select(AttendanceRecord).where(
            AttendanceRecord.user_id == body.user_id,
            AttendanceRecord.date == body.date,
            AttendanceRecord.tenant_id == current_user.tenant_id,
        )
    ).first()
    if existing:
        existing.status = body.status
        existing.check_in_time = body.check_in_time
        existing.check_out_time = body.check_out_time
        existing.location = body.location
        existing.notes = body.notes or ""
        db.commit()
        record = existing
    else:
        record = AttendanceRecord(
            tenant_id=current_user.tenant_id,
            user_id=body.user_id, date=body.date, status=body.status,
            check_in_time=body.check_in_time, check_out_time=body.check_out_time,
            location=body.location, notes=body.notes or "",
        )
        db.add(record)
        db.commit()

    user = db.get(User, body.user_id)
    return AttendanceRecordOut(
        id=record.id, user_id=record.user_id,
        full_name=user.full_name if user else "",
        date=record.date, status=record.status,
        check_in_time=record.check_in_time, check_out_time=record.check_out_time,
        location=record.location, notes=record.notes, created_at=record.created_at,
    )


@router.get("/attendance", response_model=List[AttendanceRecordOut])
def list_attendance(
    date: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    q = select(AttendanceRecord).where(AttendanceRecord.tenant_id == current_user.tenant_id)
    if date:
        q = q.where(AttendanceRecord.date == date)
    if user_id:
        q = q.where(AttendanceRecord.user_id == user_id)
    records = db.scalars(q.order_by(AttendanceRecord.date.desc())).all()
    result = []
    for r in records:
        user = db.get(User, r.user_id)
        result.append(AttendanceRecordOut(
            id=r.id, user_id=r.user_id, full_name=user.full_name if user else "",
            date=r.date, status=r.status, check_in_time=r.check_in_time,
            check_out_time=r.check_out_time, location=r.location,
            notes=r.notes, created_at=r.created_at,
        ))
    return result


@router.get("/attendance/summary", response_model=List[AttendanceSummaryOut])
def attendance_summary(
    date: Optional[str] = None,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    q = select(AttendanceRecord).where(AttendanceRecord.tenant_id == current_user.tenant_id)
    if date:
        q = q.where(AttendanceRecord.date == date)
    records = db.scalars(q).all()
    by_date: dict = {}
    for r in records:
        if r.date not in by_date:
            by_date[r.date] = {"present": 0, "absent": 0, "late": 0, "on_leave": 0, "total": 0}
        by_date[r.date]["total"] += 1
        status = r.status if r.status in ("present", "absent", "late", "on_leave") else "present"
        by_date[r.date][status] += 1

    return [AttendanceSummaryOut(
        date=d, present=v["present"], absent=v["absent"],
        late=v["late"], on_leave=v["on_leave"], total=v["total"],
    ) for d, v in sorted(by_date.items(), reverse=True)]


# ─── Leave Requests ──────────────────────────────────────────────────────────

@router.post("/leave-requests", response_model=LeaveRequestOut, status_code=201)
def create_leave_request(
    body: LeaveRequestCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lr = LeaveRequest(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        leave_type=body.leave_type,
        leave_type_id=body.leave_type_id,
        start_date=body.start_date, end_date=body.end_date,
        days_count=body.days_count, reason=body.reason,
    )
    db.add(lr)
    db.commit()
    return _leave_out(lr, current_user.full_name)


@router.get("/leave-requests", response_model=List[LeaveRequestOut])
def list_leave_requests(
    status: Optional[str] = None,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    q = select(LeaveRequest).where(LeaveRequest.tenant_id == current_user.tenant_id)
    if status:
        q = q.where(LeaveRequest.status == status)
    requests = db.scalars(q.order_by(LeaveRequest.applied_at.desc())).all()
    result = []
    for lr in requests:
        user = db.get(User, lr.user_id)
        result.append(_leave_out(lr, user.full_name if user else ""))
    return result


@router.get("/leave-requests/my", response_model=List[LeaveRequestOut])
def my_leave_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    requests = db.scalars(
        select(LeaveRequest).where(LeaveRequest.user_id == current_user.id)
        .order_by(LeaveRequest.applied_at.desc())
    ).all()
    return [_leave_out(lr, current_user.full_name) for lr in requests]


@router.post("/leave/{leave_id}/approve", response_model=LeaveRequestOut)
def approve_leave(
    leave_id: str,
    body: LeaveActionRequest,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    lr = _get_leave(db, leave_id, current_user.tenant_id)
    lr.status = "approved"
    lr.manager_comment = body.comment
    lr.reviewed_by_id = current_user.id
    lr.reviewed_at = datetime.utcnow()

    # Send notification
    db.add(Notification(
        tenant_id=current_user.tenant_id, user_id=lr.user_id,
        type="leave_approved", title="Leave Request Approved",
        message=f"Your {lr.leave_type} leave from {lr.start_date} to {lr.end_date} was approved.",
    ))
    db.commit()
    user = db.get(User, lr.user_id)
    return _leave_out(lr, user.full_name if user else "")


@router.post("/leave/{leave_id}/reject", response_model=LeaveRequestOut)
def reject_leave(
    leave_id: str,
    body: LeaveActionRequest,
    current_user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
):
    lr = _get_leave(db, leave_id, current_user.tenant_id)
    lr.status = "rejected"
    lr.rejection_reason = body.comment
    lr.manager_comment = body.comment
    lr.reviewed_by_id = current_user.id
    lr.reviewed_at = datetime.utcnow()

    db.add(Notification(
        tenant_id=current_user.tenant_id, user_id=lr.user_id,
        type="leave_rejected", title="Leave Request Rejected",
        message=f"Your {lr.leave_type} leave was rejected. Reason: {body.comment or 'N/A'}",
    ))
    db.commit()
    user = db.get(User, lr.user_id)
    return _leave_out(lr, user.full_name if user else "")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_leave(db: Session, leave_id: str, tenant_id) -> LeaveRequest:
    lr = db.scalars(
        select(LeaveRequest).where(LeaveRequest.id == leave_id, LeaveRequest.tenant_id == tenant_id)
    ).first()
    if not lr:
        raise HTTPException(404, "Leave request not found")
    return lr


def _leave_out(lr: LeaveRequest, full_name: str) -> LeaveRequestOut:
    return LeaveRequestOut(
        id=lr.id, user_id=lr.user_id, full_name=full_name,
        leave_type=lr.leave_type, start_date=lr.start_date, end_date=lr.end_date,
        days_count=lr.days_count, reason=lr.reason, status=lr.status,
        manager_comment=lr.manager_comment, rejection_reason=lr.rejection_reason,
        applied_at=lr.applied_at, reviewed_at=lr.reviewed_at,
    )
