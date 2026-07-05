from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from urllib.parse import urlencode

from app.db.database import get_db
from app.models.candidate import Candidate
from app.models.communication_task import CommunicationTask
from app.models.attendance_issue_status import AttendanceIssueStatus

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


def safe_count(query):
    try:
        return query.count()
    except Exception:
        return 0


def get_case_data(db: Session):
    active_cases = []
    history_cases = []

    try:
        from app.api.case_routes import get_unified_cases

        data = get_unified_cases(
            workspace_id=None,
            source_type="All",
            status="All",
            priority="All",
            db=db,
        )

        cases = data.get("cases", [])

        completed_attendance_keys = {
            item.issue_key
            for item in db.query(AttendanceIssueStatus)
            .filter(AttendanceIssueStatus.status == "Done")
            .all()
        }

        for case in cases:
            source_type = case.get("source_type")
            person_name = case.get("person_name") or "unknown_employee"
            status = case.get("status") or "Open"

            employee_key = (
                "attendance_employee_"
                + person_name.lower()
                .replace(" ", "_")
                .replace("-", "_")
            )

            if source_type == "Attendance" and employee_key in completed_attendance_keys:
                history_cases.append(case)
                continue

            if status in ["Resolved", "Complete", "Closed"]:
                history_cases.append(case)
            else:
                active_cases.append(case)

    except Exception:
        active_cases = []
        history_cases = []

    return active_cases, history_cases


def communication_destination(task):
    params = {
        "task_id": task.id,
        "source_type": task.source_type or "",
        "source_id": task.source_id or "",
        "recipient_name": task.recipient_name or "",
        "recipient_email": task.recipient_email or "",
        "template": task.suggested_template or task.task_type or "",
        "context": task.context or "",
    }

    if task.channel == "Interview":
        params["candidate_id"] = task.source_id or ""
        return f"/interview-assistant?{urlencode(params)}"

    if task.channel == "Letter":
        return f"/letters?{urlencode(params)}"

    return f"/emails?{urlencode(params)}"


@router.get("/command-center")
def get_dashboard_command_center(db: Session = Depends(get_db)):
    active_cases, history_cases = get_case_data(db)

    communication_tasks = db.query(CommunicationTask).all()

    pending_tasks = [
        task for task in communication_tasks
        if task.status == "Pending"
    ]

    pending_emails = [
        task for task in pending_tasks
        if task.channel == "Email"
    ]

    pending_letters = [
        task for task in pending_tasks
        if task.channel == "Letter"
    ]

    pending_interviews = [
        task for task in pending_tasks
        if task.channel == "Interview"
    ]

    candidates = db.query(Candidate).all()

    shortlisted_candidates = [
        candidate for candidate in candidates
        if (candidate.recruitment_status or "New") == "Shortlisted"
    ]

    hired_candidates = [
        candidate for candidate in candidates
        if (candidate.recruitment_status or "New") == "Hired"
    ]

    rejected_candidates = [
        candidate for candidate in candidates
        if (candidate.recruitment_status or "New") == "Rejected"
    ]

    high_priority_cases = [
        case for case in active_cases
        if case.get("priority") == "High"
    ]

    attendance_cases = [
        case for case in active_cases
        if case.get("source_type") == "Attendance"
    ]

    open_disputes = [
        case for case in active_cases
        if case.get("source_type") == "Dispute"
    ]

    missing_docs = [
        case for case in active_cases
        if case.get("source_type") == "Missing Docs"
    ]

    action_items = []

    for case in high_priority_cases[:4]:
        action_items.append({
            "type": "Case",
            "priority": case.get("priority", "High"),
            "title": case.get("title", "High priority case"),
            "description": case.get("summary", "Review this HR case."),
            "href": "/cases",
        })

    for task in pending_interviews[:3]:
        action_items.append({
            "type": "Interview",
            "priority": task.priority or "High",
            "title": task.title,
            "description": task.context or "Create interview pack.",
            "href": communication_destination(task),
        })

    for task in pending_emails[:3]:
        action_items.append({
            "type": "Email",
            "priority": task.priority or "Medium",
            "title": task.title,
            "description": task.context or "Draft pending HR email.",
            "href": communication_destination(task),
        })

    for task in pending_letters[:3]:
        action_items.append({
            "type": "Letter",
            "priority": task.priority or "Medium",
            "title": task.title,
            "description": task.context or "Generate pending HR letter.",
            "href": communication_destination(task),
        })

    workload_score = (
        len(active_cases)
        + len(pending_tasks)
        + len(shortlisted_candidates)
        + len(high_priority_cases) * 2
    )

    if workload_score >= 15:
        workload_level = "Heavy"
    elif workload_score >= 7:
        workload_level = "Moderate"
    else:
        workload_level = "Light"

    return {
        "summary": {
            "workload_level": workload_level,
            "workload_score": workload_score,
            "active_cases": len(active_cases),
            "history_cases": len(history_cases),
            "high_priority_cases": len(high_priority_cases),
            "pending_communications": len(pending_tasks),
            "pending_emails": len(pending_emails),
            "pending_letters": len(pending_letters),
            "pending_interview_packs": len(pending_interviews),
            "attendance_followups": len(attendance_cases),
            "open_disputes": len(open_disputes),
            "missing_docs": len(missing_docs),
            "shortlisted_candidates": len(shortlisted_candidates),
            "hired_candidates": len(hired_candidates),
            "rejected_candidates": len(rejected_candidates),
        },
        "action_items": action_items[:10],
        "sections": {
            "high_priority_cases": high_priority_cases[:5],
            "attendance_followups": attendance_cases[:5],
            "pending_emails": [
                {
                    "id": task.id,
                    "title": task.title,
                    "recipient_name": task.recipient_name,
                    "priority": task.priority,
                    "task_type": task.task_type,
                }
                for task in pending_emails[:5]
            ],
            "pending_letters": [
                {
                    "id": task.id,
                    "title": task.title,
                    "recipient_name": task.recipient_name,
                    "priority": task.priority,
                    "task_type": task.task_type,
                }
                for task in pending_letters[:5]
            ],
            "pending_interviews": [
                {
                    "id": task.id,
                    "title": task.title,
                    "recipient_name": task.recipient_name,
                    "priority": task.priority,
                    "task_type": task.task_type,
                }
                for task in pending_interviews[:5]
            ],
        },
    }
