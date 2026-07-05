from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.candidate import Candidate
from app.models.dispute import Dispute
from app.models.employee_query import EmployeeQuery
from app.models.missing_document import MissingDocumentCase
from app.schemas.decision_schema import DecisionGenerateRequest, DecisionGenerateResponse
from app.services.decision_service import (
    candidate_context,
    dispute_context,
    employee_query_context,
    missing_doc_context,
    manual_context,
    generate_decision_memo,
)

router = APIRouter(
    prefix="/decisions",
    tags=["Decision Summary"]
)


@router.post("/generate", response_model=DecisionGenerateResponse)
def generate_decision_summary(payload: DecisionGenerateRequest, db: Session = Depends(get_db)):
    source_type = payload.source_type

    if source_type == "Candidate":
        if not payload.source_id:
            raise HTTPException(status_code=400, detail="Candidate source_id is required")

        candidate = db.query(Candidate).filter(Candidate.id == payload.source_id).first()

        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        context = candidate_context(candidate)

    elif source_type == "Dispute":
        if not payload.source_id:
            raise HTTPException(status_code=400, detail="Dispute source_id is required")

        dispute = db.query(Dispute).filter(Dispute.id == payload.source_id).first()

        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")

        context = dispute_context(dispute)

    elif source_type == "Employee Query":
        if not payload.source_id:
            raise HTTPException(status_code=400, detail="Employee Query source_id is required")

        query = db.query(EmployeeQuery).filter(EmployeeQuery.id == payload.source_id).first()

        if not query:
            raise HTTPException(status_code=404, detail="Employee query not found")

        context = employee_query_context(query)

    elif source_type == "Missing Docs":
        if not payload.source_id:
            raise HTTPException(status_code=400, detail="Missing Docs source_id is required")

        case = db.query(MissingDocumentCase).filter(MissingDocumentCase.id == payload.source_id).first()

        if not case:
            raise HTTPException(status_code=404, detail="Missing document case not found")

        context = missing_doc_context(case)

    else:
        context = manual_context(payload)

    return generate_decision_memo(payload, context)
