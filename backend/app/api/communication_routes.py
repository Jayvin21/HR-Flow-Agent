from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.communication_task import CommunicationTask
from app.models.candidate import Candidate
from app.models.attendance import AttendanceRecord
from app.services.attendance_analyzer import build_attendance_summary

router = APIRouter(
    prefix="/communications",
    tags=["Communications"]
)


def clean_text(value, fallback=""):
    if value is None:
        return fallback

    value = str(value).strip()
    return value if value else fallback


def clean_status(value):
    return clean_text(value).lower()


def task_exists(
    db: Session,
    source_type: str,
    source_id,
    channel: str,
    task_type: str,
    title: str,
    recipient_name: str = "",
):
    query = db.query(CommunicationTask).filter(
        CommunicationTask.source_type == source_type,
        CommunicationTask.channel == channel,
        CommunicationTask.task_type == task_type,
        CommunicationTask.title == title,
    )

    if source_id is None:
        query = query.filter(CommunicationTask.source_id.is_(None))
    else:
        query = query.filter(CommunicationTask.source_id == source_id)

    if recipient_name:
        query = query.filter(CommunicationTask.recipient_name == recipient_name)

    return query.first()


def create_task_if_missing(
    db: Session,
    workspace_id=None,
    source_type="General",
    source_id=None,
    channel="Email",
    task_type="Follow-up",
    title="HR Follow-up",
    recipient_name="",
    recipient_email="",
    priority="Medium",
    suggested_template="General HR Email",
    context="",
):
    existing = task_exists(
        db=db,
        source_type=source_type,
        source_id=source_id,
        channel=channel,
        task_type=task_type,
        title=title,
        recipient_name=recipient_name,
    )

    if existing:
        return None

    task = CommunicationTask(
        workspace_id=workspace_id,
        source_type=source_type,
        source_id=source_id,
        channel=channel,
        task_type=task_type,
        title=title,
        recipient_name=recipient_name,
        recipient_email=recipient_email,
        priority=priority,
        status="Pending",
        suggested_template=suggested_template,
        context=context,
    )

    db.add(task)
    db.flush()

    return task


def sync_candidate_tasks(db: Session):
    candidates = db.query(Candidate).all()
    created = 0

    for candidate in candidates:
        status = (
            getattr(candidate, "recruitment_status", None)
            or getattr(candidate, "status", None)
            or ""
        )

        normalized = clean_status(status)

        candidate_id = getattr(candidate, "id", None)
        workspace_id = getattr(candidate, "workspace_id", None)
        name = clean_text(getattr(candidate, "name", ""), "Candidate")
        email = clean_text(getattr(candidate, "email", ""), "")
        role = clean_text(getattr(candidate, "current_role", ""), "the selected role")

        skills = clean_text(getattr(candidate, "skills", ""), "")
        summary = clean_text(getattr(candidate, "summary", ""), "")
        projects = clean_text(getattr(candidate, "projects", ""), "")

        candidate_context = "\n".join(
            [
                f"Candidate: {name}",
                f"Email: {email}",
                f"Role/context: {role}",
                f"Status: {status}",
                f"Skills: {skills}",
                f"Summary: {summary}",
                f"Projects: {projects}",
            ]
        ).strip()

        if normalized == "shortlisted":
            task = create_task_if_missing(
                db=db,
                workspace_id=workspace_id,
                source_type="Candidate",
                source_id=candidate_id,
                channel="Interview",
                task_type="Generate Interview Pack",
                title=f"Generate interview pack for {name}",
                recipient_name=name,
                recipient_email=email,
                priority="High",
                suggested_template="Interview Pack",
                context=(
                    f"{candidate_context}\n\n"
                    "The candidate has been shortlisted. Generate structured interview questions, "
                    "resume verification prompts, project deep-dive questions, HR questions, and a scoring rubric."
                ),
            )
            if task:
                created += 1

            task = create_task_if_missing(
                db=db,
                workspace_id=workspace_id,
                source_type="Candidate",
                source_id=candidate_id,
                channel="Email",
                task_type="Shortlisting Email",
                title=f"Send shortlisting email to {name}",
                recipient_name=name,
                recipient_email=email,
                priority="Medium",
                suggested_template="Shortlist Email",
                context=(
                    f"{candidate_context}\n\n"
                    "Send a professional shortlisting email and ask the candidate for interview availability."
                ),
            )
            if task:
                created += 1

        elif normalized == "rejected":
            task = create_task_if_missing(
                db=db,
                workspace_id=workspace_id,
                source_type="Candidate",
                source_id=candidate_id,
                channel="Email",
                task_type="Rejection Email",
                title=f"Send rejection email to {name}",
                recipient_name=name,
                recipient_email=email,
                priority="Medium",
                suggested_template="Rejection Email",
                context=(
                    f"{candidate_context}\n\n"
                    "Send a polite rejection email. Keep it respectful, concise, and professional."
                ),
            )
            if task:
                created += 1

        elif normalized == "hired":
            task = create_task_if_missing(
                db=db,
                workspace_id=workspace_id,
                source_type="Candidate",
                source_id=candidate_id,
                channel="Letter",
                task_type="Hiring Letter",
                title=f"Generate hiring letter for {name}",
                recipient_name=name,
                recipient_email=email,
                priority="High",
                suggested_template="Offer Letter",
                context=(
                    f"{candidate_context}\n\n"
                    "Generate an offer or hiring letter for the selected candidate."
                ),
            )
            if task:
                created += 1

            task = create_task_if_missing(
                db=db,
                workspace_id=workspace_id,
                source_type="Candidate",
                source_id=candidate_id,
                channel="Email",
                task_type="Hiring Email",
                title=f"Send hiring email to {name}",
                recipient_name=name,
                recipient_email=email,
                priority="High",
                suggested_template="Offer Email",
                context=(
                    f"{candidate_context}\n\n"
                    "Send a congratulatory hiring email and mention that formal joining details will follow."
                ),
            )
            if task:
                created += 1

    return created


def sync_attendance_tasks(db: Session):
    records = db.query(AttendanceRecord).all()

    if not records:
        return 0

    summary = build_attendance_summary(records)
    issues = summary.get("issues", [])
    created = 0

    for index, issue in enumerate(issues, start=1):
        employee_name = clean_text(issue.get("employee_name"), "Employee")
        severity = clean_text(issue.get("severity"), "Medium")

        issue_text = clean_text(
            issue.get("issue_text")
            or issue.get("issue_type")
            or issue.get("reason"),
            "attendance irregularity",
        )

        workspace_id = issue.get("workspace_id")

        context = (
            f"Employee: {employee_name}\n"
            f"Issue: {issue_text}\n"
            f"Severity: {severity}\n\n"
            "Request clarification or regularization for the attendance issue."
        )

        task = create_task_if_missing(
            db=db,
            workspace_id=workspace_id,
            source_type="Attendance",
            source_id=None,
            channel="Email",
            task_type="Attendance Follow-up",
            title=f"Attendance follow-up for {employee_name}",
            recipient_name=employee_name,
            recipient_email="",
            priority=severity,
            suggested_template="Attendance Follow-up",
            context=context,
        )

        if task:
            created += 1

    return created


def sync_optional_case_tasks(db: Session):
    created = 0

    try:
        from app.models.employee_query import EmployeeQuery

        for item in db.query(EmployeeQuery).all():
            status = clean_status(getattr(item, "status", ""))
            if status in ["resolved", "closed", "done", "completed"]:
                continue

            employee_name = clean_text(
                getattr(item, "employee_name", None)
                or getattr(item, "name", None),
                "Employee",
            )

            context = clean_text(
                getattr(item, "description", None)
                or getattr(item, "query_text", None)
                or getattr(item, "question", None),
                "Employee query requires HR response.",
            )

            task = create_task_if_missing(
                db=db,
                workspace_id=getattr(item, "workspace_id", None),
                source_type="Employee Query",
                source_id=getattr(item, "id", None),
                channel="Email",
                task_type="Employee Query Response",
                title=f"Respond to employee query - {employee_name}",
                recipient_name=employee_name,
                recipient_email=clean_text(
                    getattr(item, "employee_email", None)
                    or getattr(item, "email", None),
                    "",
                ),
                priority=clean_text(getattr(item, "priority", None), "Medium"),
                suggested_template="Policy Response",
                context=context,
            )

            if task:
                created += 1
    except Exception:
        pass

    try:
        from app.models.missing_document import MissingDocument

        for item in db.query(MissingDocument).all():
            status = clean_status(getattr(item, "status", ""))
            if status in ["resolved", "closed", "done", "completed", "submitted"]:
                continue

            employee_name = clean_text(
                getattr(item, "employee_name", None)
                or getattr(item, "candidate_name", None),
                "Employee",
            )

            document_name = clean_text(
                getattr(item, "document_name", None)
                or getattr(item, "missing_document", None)
                or getattr(item, "document_type", None),
                "required document",
            )

            task = create_task_if_missing(
                db=db,
                workspace_id=getattr(item, "workspace_id", None),
                source_type="Missing Document",
                source_id=getattr(item, "id", None),
                channel="Email",
                task_type="Missing Document Reminder",
                title=f"Request missing document from {employee_name}",
                recipient_name=employee_name,
                recipient_email=clean_text(
                    getattr(item, "employee_email", None)
                    or getattr(item, "email", None),
                    "",
                ),
                priority=clean_text(getattr(item, "priority", None), "Medium"),
                suggested_template="Missing Document Request",
                context=f"Ask {employee_name} to submit: {document_name}.",
            )

            if task:
                created += 1
    except Exception:
        pass

    try:
        from app.models.dispute import Dispute

        for item in db.query(Dispute).all():
            status = clean_status(getattr(item, "status", ""))
            if status in ["resolved", "closed", "done", "completed"]:
                continue

            employee_name = clean_text(
                getattr(item, "employee_name", None)
                or getattr(item, "name", None),
                "Employee",
            )

            context = clean_text(
                getattr(item, "description", None)
                or getattr(item, "details", None),
                "Dispute requires HR response.",
            )

            task = create_task_if_missing(
                db=db,
                workspace_id=getattr(item, "workspace_id", None),
                source_type="Dispute",
                source_id=getattr(item, "id", None),
                channel="Email",
                task_type="Dispute Response",
                title=f"Respond to dispute - {employee_name}",
                recipient_name=employee_name,
                recipient_email=clean_text(
                    getattr(item, "employee_email", None)
                    or getattr(item, "email", None),
                    "",
                ),
                priority=clean_text(getattr(item, "priority", None), "High"),
                suggested_template="Dispute Follow-up",
                context=context,
            )

            if task:
                created += 1
    except Exception:
        pass

    return created


def build_summary(tasks):
    total = len(tasks)

    pending = len([
        task for task in tasks
        if clean_text(getattr(task, "status", "")) == "Pending"
    ])

    completed = len([
        task for task in tasks
        if clean_text(getattr(task, "status", "")) == "Completed"
    ])

    emails = len([
        task for task in tasks
        if clean_text(getattr(task, "channel", "")) == "Email"
    ])

    letters = len([
        task for task in tasks
        if clean_text(getattr(task, "channel", "")) == "Letter"
    ])

    interviews = len([
        task for task in tasks
        if clean_text(getattr(task, "channel", "")) == "Interview"
    ])

    return {
        "total": total,
        "pending": pending,
        "completed": completed,
        "emails": emails,
        "letters": letters,
        "interviews": interviews,
    }


def serialize_task(task: CommunicationTask):
    return {
        "id": task.id,
        "workspace_id": task.workspace_id,
        "source_type": task.source_type,
        "source_id": task.source_id,
        "channel": task.channel,
        "task_type": task.task_type,
        "title": task.title,
        "recipient_name": task.recipient_name,
        "recipient_email": task.recipient_email,
        "priority": task.priority,
        "status": task.status,
        "suggested_template": task.suggested_template,
        "context": task.context,
        "completed_at": task.completed_at,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


@router.post("/sync")
def sync_communication_queue(db: Session = Depends(get_db)):
    created = 0

    created += sync_candidate_tasks(db)
    created += sync_attendance_tasks(db)
    created += sync_optional_case_tasks(db)

    db.commit()

    return {
        "message": "Communication queue synced.",
        "created": created,
    }


@router.get("/queue")
def get_communication_queue(
    workspace_id: Optional[int] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(CommunicationTask)

    if workspace_id:
        query = query.filter(CommunicationTask.workspace_id == workspace_id)

    if channel and channel != "All":
        query = query.filter(CommunicationTask.channel == channel)

    if status and status != "All":
        query = query.filter(CommunicationTask.status == status)

    tasks = query.order_by(CommunicationTask.id.desc()).all()

    return {
        "summary": build_summary(tasks),
        "tasks": [serialize_task(task) for task in tasks],
    }


@router.get("/{task_id}")
def get_communication_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(CommunicationTask).filter(CommunicationTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Communication task not found")

    return serialize_task(task)


@router.patch("/{task_id}/complete")
def complete_communication_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(CommunicationTask).filter(CommunicationTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Communication task not found")

    task.status = "Completed"
    task.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    return serialize_task(task)


@router.patch("/{task_id}/reopen")
def reopen_communication_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(CommunicationTask).filter(CommunicationTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Communication task not found")

    task.status = "Pending"
    task.completed_at = None

    db.commit()
    db.refresh(task)

    return serialize_task(task)


@router.delete("/{task_id}")
def delete_communication_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(CommunicationTask).filter(CommunicationTask.id == task_id).first()

    if not task:
        return {
            "message": "Communication task already deleted or not found.",
            "deleted": 0,
            "task_id": task_id,
        }

    db.delete(task)
    db.commit()

    return {
        "message": "Communication task deleted.",
        "deleted": 1,
        "task_id": task_id,
    }
