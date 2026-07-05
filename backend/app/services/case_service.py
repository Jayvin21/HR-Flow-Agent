from typing import List, Dict, Any
from app.models.employee_query import EmployeeQuery
from app.models.dispute import Dispute
from app.models.missing_document import MissingDocumentCase
from app.models.attendance import AttendanceRecord
from app.services.attendance_analyzer import build_attendance_summary


def normalize_datetime(value) -> str:
    if not value:
        return ""
    try:
        return value.isoformat()
    except Exception:
        return str(value)


def priority_rank(priority: str) -> int:
    ranks = {
        "High": 3,
        "Medium": 2,
        "Low": 1,
    }
    return ranks.get(priority or "", 1)


def status_needs_review(status: str) -> bool:
    return status in {
        "Open",
        "Needs HR Review",
        "Needs Evidence",
        "Under Review",
        "Pending",
        "Partially Pending",
        "Requested",
        "Waiting for Employee",
    }


def employee_query_to_case(item: EmployeeQuery) -> Dict[str, Any]:
    return {
        "id": f"employee-query-{item.id}",
        "source_type": "Employee Query",
        "source_id": item.id,

        "title": f"{item.query_type} Query",
        "person_name": item.employee_name,
        "department": item.department,
        "category": item.query_type,
        "status": item.status,
        "priority": item.priority,
        "risk_level": None,

        "summary": item.question,
        "recommended_action": "Resolve with policy evidence and send HR response draft." if item.status == "Open" else item.policy_answer,
        "draft": item.response_draft,
        "created_at": normalize_datetime(item.created_at),
    }


def dispute_to_case(item: Dispute) -> Dict[str, Any]:
    return {
        "id": f"dispute-{item.id}",
        "source_type": "Dispute",
        "source_id": item.id,

        "title": f"{item.dispute_type} Dispute",
        "person_name": item.employee_name,
        "department": item.department,
        "category": item.dispute_type,
        "status": item.status,
        "priority": item.priority,
        "risk_level": item.risk_level,

        "summary": item.claim,
        "recommended_action": item.recommended_action,
        "draft": item.response_draft,
        "created_at": normalize_datetime(item.created_at),
    }


def missing_doc_to_case(item: MissingDocumentCase) -> Dict[str, Any]:
    return {
        "id": f"missing-doc-{item.id}",
        "source_type": "Missing Docs",
        "source_id": item.id,

        "title": "Missing Document Checklist",
        "person_name": item.person_name,
        "department": None,
        "category": item.role or "Onboarding",
        "status": item.status,
        "priority": item.priority,
        "risk_level": None,

        "summary": f"Pending document review for {item.person_name}. Missing documents: {item.missing_documents or '[]'}",
        "recommended_action": "Request pending documents and update checklist status.",
        "draft": item.request_draft,
        "created_at": normalize_datetime(item.created_at),
    }


def attendance_issue_to_case(issue: Dict[str, Any]) -> Dict[str, Any]:
    severity = issue.get("severity", "Medium")

    return {
        "id": f"attendance-{issue.get('employee_id') or issue.get('employee_name')}",
        "source_type": "Attendance",
        "source_id": 0,

        "title": "Attendance Issue",
        "person_name": issue.get("employee_name", "Unknown Employee"),
        "department": issue.get("department"),
        "category": "Attendance",
        "status": "Open",
        "priority": "High" if severity == "High" else "Medium" if severity == "Medium" else "Low",
        "risk_level": severity,

        "summary": (
            f"Absent: {issue.get('absent_days', 0)}, "
            f"Late marks: {issue.get('late_marks', 0)}, "
            f"Missing punches: {issue.get('missing_punches', 0)}."
        ),
        "recommended_action": issue.get("recommended_action"),
        "draft": issue.get("follow_up_draft"),
        "created_at": "",
    }


def build_unified_cases(
    employee_queries: List[EmployeeQuery],
    disputes: List[Dispute],
    missing_docs: List[MissingDocumentCase],
    attendance_records: List[AttendanceRecord],
) -> Dict[str, Any]:
    cases = []

    for item in employee_queries:
        cases.append(employee_query_to_case(item))

    for item in disputes:
        cases.append(dispute_to_case(item))

    for item in missing_docs:
        cases.append(missing_doc_to_case(item))

    attendance_summary = build_attendance_summary(attendance_records)

    for issue in attendance_summary.get("issues", []):
        cases.append(attendance_issue_to_case(issue))

    def sort_key(item):
        is_open = 1 if status_needs_review(item.get("status")) else 0
        priority = priority_rank(item.get("priority"))
        created = item.get("created_at") or ""
        return (is_open, priority, created)

    cases.sort(key=sort_key, reverse=True)

    total_cases = len(cases)
    open_cases = sum(1 for item in cases if status_needs_review(item.get("status")))
    high_priority_cases = sum(1 for item in cases if item.get("priority") == "High")
    escalated_cases = sum(1 for item in cases if item.get("status") == "Escalated")
    needs_review_cases = sum(
        1
        for item in cases
        if item.get("status") in {"Needs HR Review", "Needs Evidence", "Under Review"}
    )

    return {
        "summary": {
            "total_cases": total_cases,
            "open_cases": open_cases,
            "high_priority_cases": high_priority_cases,
            "escalated_cases": escalated_cases,
            "needs_review_cases": needs_review_cases,
        },
        "cases": cases,
    }
