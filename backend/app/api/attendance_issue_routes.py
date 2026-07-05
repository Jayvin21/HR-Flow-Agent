from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from app.db.database import get_db
from app.models.attendance_issue_status import AttendanceIssueStatus

router = APIRouter(
    prefix="/attendance-issues",
    tags=["Attendance Issues"]
)


class AttendanceIssueDoneRequest(BaseModel):
    issue_key: str
    employee_name: Optional[str] = None
    issue_type: Optional[str] = None
    issue_date: Optional[str] = None


@router.patch("/done")
def mark_attendance_issue_done(
    payload: AttendanceIssueDoneRequest,
    db: Session = Depends(get_db)
):
    if not payload.issue_key:
        raise HTTPException(status_code=400, detail="issue_key is required")

    issue = (
        db.query(AttendanceIssueStatus)
        .filter(AttendanceIssueStatus.issue_key == payload.issue_key)
        .first()
    )

    if not issue:
        issue = AttendanceIssueStatus(
            issue_key=payload.issue_key,
            employee_name=payload.employee_name,
            issue_type=payload.issue_type,
            issue_date=payload.issue_date,
        )
        db.add(issue)

    issue.status = "Done"
    issue.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(issue)

    return issue


@router.patch("/reopen")
def reopen_attendance_issue(
    payload: AttendanceIssueDoneRequest,
    db: Session = Depends(get_db)
):
    issue = (
        db.query(AttendanceIssueStatus)
        .filter(AttendanceIssueStatus.issue_key == payload.issue_key)
        .first()
    )

    if not issue:
        raise HTTPException(status_code=404, detail="Attendance issue not found")

    issue.status = "Open"
    issue.completed_at = None

    db.commit()
    db.refresh(issue)

    return issue


@router.get("/completed-keys")
def get_completed_attendance_issue_keys(db: Session = Depends(get_db)):
    issues = (
        db.query(AttendanceIssueStatus)
        .filter(AttendanceIssueStatus.status == "Done")
        .all()
    )

    return {
        "completed_keys": [issue.issue_key for issue in issues]
    }
