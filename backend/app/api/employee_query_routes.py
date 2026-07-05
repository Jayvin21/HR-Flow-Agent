from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.employee_query import EmployeeQuery
from app.schemas.employee_query_schema import (
    EmployeeQueryCreate,
    EmployeeQueryResponse,
    EmployeeQueryResolveResponse,
    EmployeeQueryUpdateStatus,
)
from app.services.rag_service import retrieve_relevant_sources, build_grounded_answer
from app.services.employee_query_service import (
    build_employee_response_draft,
    serialize_sources,
)

router = APIRouter(
    prefix="/employee-queries",
    tags=["Employee Queries"]
)

HR_POLICY_DOCUMENT_TYPES = [
    "HR Policy",
    "Attendance",
    "Employee Query",
    "General",
]


@router.get("/", response_model=List[EmployeeQueryResponse])
def get_employee_queries(
    workspace_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(EmployeeQuery)

    if workspace_id:
        query = query.filter(EmployeeQuery.workspace_id == workspace_id)

    if status:
        query = query.filter(EmployeeQuery.status == status)

    return query.order_by(EmployeeQuery.created_at.desc()).all()


@router.post("/", response_model=EmployeeQueryResponse)
def create_employee_query(payload: EmployeeQueryCreate, db: Session = Depends(get_db)):
    if not payload.employee_name.strip():
        raise HTTPException(status_code=400, detail="Employee name is required")

    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question is required")

    query = EmployeeQuery(
        workspace_id=payload.workspace_id,
        employee_name=payload.employee_name.strip(),
        department=payload.department,
        query_type=payload.query_type,
        priority=payload.priority,
        question=payload.question.strip(),
        status="Open",
    )

    db.add(query)
    db.commit()
    db.refresh(query)

    return query


@router.post("/{query_id}/resolve", response_model=EmployeeQueryResolveResponse)
def resolve_employee_query(query_id: int, db: Session = Depends(get_db)):
    query = db.query(EmployeeQuery).filter(EmployeeQuery.id == query_id).first()

    if not query:
        raise HTTPException(status_code=404, detail="Employee query not found")

    enhanced_question = f"{query.query_type} HR policy employee query: {query.question}"

    sources = retrieve_relevant_sources(
        db=db,
        question=enhanced_question,
        workspace_id=query.workspace_id,
        limit=5,
        allowed_document_types=HR_POLICY_DOCUMENT_TYPES,
    )

    if not sources:
        sources = retrieve_relevant_sources(
            db=db,
            question=enhanced_question,
            workspace_id=None,
            limit=5,
            allowed_document_types=HR_POLICY_DOCUMENT_TYPES,
        )

    answer, confidence = build_grounded_answer(enhanced_question, sources)

    response_draft = build_employee_response_draft(
        employee_name=query.employee_name,
        question=query.question,
        policy_answer=answer,
        sources=sources,
    )

    query.policy_answer = answer
    query.response_draft = response_draft
    query.sources_json = serialize_sources(sources)
    query.status = "Resolved" if sources else "Needs HR Review"

    db.commit()
    db.refresh(query)

    return {
        "query": query,
        "sources": sources,
    }


@router.patch("/{query_id}/status", response_model=EmployeeQueryResponse)
def update_employee_query_status(
    query_id: int,
    payload: EmployeeQueryUpdateStatus,
    db: Session = Depends(get_db)
):
    query = db.query(EmployeeQuery).filter(EmployeeQuery.id == query_id).first()

    if not query:
        raise HTTPException(status_code=404, detail="Employee query not found")

    allowed = {"Open", "Resolved", "Needs HR Review", "Waiting for Employee", "Escalated"}

    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")

    query.status = payload.status
    db.commit()
    db.refresh(query)

    return query


@router.delete("/{query_id}")
def delete_employee_query(query_id: int, db: Session = Depends(get_db)):
    query = db.query(EmployeeQuery).filter(EmployeeQuery.id == query_id).first()

    if not query:
        raise HTTPException(status_code=404, detail="Employee query not found")

    db.delete(query)
    db.commit()

    return {"message": "Employee query deleted successfully"}
