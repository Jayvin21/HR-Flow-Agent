from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.employee_query import EmployeeQuery
from app.models.dispute import Dispute
from app.models.missing_document import MissingDocumentCase
from app.models.attendance import AttendanceRecord
from app.schemas.case_schema import UnifiedCasesResponse
from app.services.case_service import build_unified_cases

router = APIRouter(
    prefix="/cases",
    tags=["Unified Cases"]
)


@router.get("/", response_model=UnifiedCasesResponse)
def get_unified_cases(
    workspace_id: Optional[int] = None,
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    employee_query_query = db.query(EmployeeQuery)
    dispute_query = db.query(Dispute)
    missing_doc_query = db.query(MissingDocumentCase)
    attendance_query = db.query(AttendanceRecord)

    if workspace_id:
        employee_query_query = employee_query_query.filter(EmployeeQuery.workspace_id == workspace_id)
        dispute_query = dispute_query.filter(Dispute.workspace_id == workspace_id)
        missing_doc_query = missing_doc_query.filter(MissingDocumentCase.workspace_id == workspace_id)
        attendance_query = attendance_query.filter(AttendanceRecord.workspace_id == workspace_id)

    employee_queries = employee_query_query.all() if source_type in [None, "", "All", "Employee Query"] else []
    disputes = dispute_query.all() if source_type in [None, "", "All", "Dispute"] else []
    missing_docs = missing_doc_query.all() if source_type in [None, "", "All", "Missing Docs"] else []
    attendance_records = attendance_query.all() if source_type in [None, "", "All", "Attendance"] else []

    result = build_unified_cases(
        employee_queries=employee_queries,
        disputes=disputes,
        missing_docs=missing_docs,
        attendance_records=attendance_records,
    )

    cases = result["cases"]

    if status and status != "All":
        cases = [item for item in cases if item["status"] == status]

    if priority and priority != "All":
        cases = [item for item in cases if item["priority"] == priority]

    result["cases"] = cases
    result["summary"]["total_cases"] = len(cases)
    result["summary"]["open_cases"] = sum(
        1
        for item in cases
        if item["status"] in {
            "Open",
            "Needs HR Review",
            "Needs Evidence",
            "Under Review",
            "Pending",
            "Partially Pending",
            "Requested",
            "Waiting for Employee",
        }
    )
    result["summary"]["high_priority_cases"] = sum(1 for item in cases if item["priority"] == "High")
    result["summary"]["escalated_cases"] = sum(1 for item in cases if item["status"] == "Escalated")
    result["summary"]["needs_review_cases"] = sum(
        1
        for item in cases
        if item["status"] in {"Needs HR Review", "Needs Evidence", "Under Review"}
    )

    return result
