from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.dispute import Dispute
from app.schemas.dispute_schema import (
    DisputeCreate,
    DisputeResponse,
    DisputeResolveResponse,
    DisputeUpdateStatus,
)
from app.services.rag_service import retrieve_relevant_sources
from app.services.dispute_service import (
    resolve_dispute_payload,
    serialize_sources,
)

router = APIRouter(
    prefix="/disputes",
    tags=["Disputes"]
)

HR_EVIDENCE_DOCUMENT_TYPES = [
    "HR Policy",
    "Attendance",
    "Dispute",
    "Employee Query",
    "General",
]


@router.get("/", response_model=List[DisputeResponse])
def get_disputes(
    workspace_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Dispute)

    if workspace_id:
        query = query.filter(Dispute.workspace_id == workspace_id)

    if status:
        query = query.filter(Dispute.status == status)

    return query.order_by(Dispute.created_at.desc()).all()


@router.post("/", response_model=DisputeResponse)
def create_dispute(payload: DisputeCreate, db: Session = Depends(get_db)):
    if not payload.employee_name.strip():
        raise HTTPException(status_code=400, detail="Employee name is required")

    if not payload.claim.strip():
        raise HTTPException(status_code=400, detail="Dispute claim is required")

    dispute = Dispute(
        workspace_id=payload.workspace_id,
        employee_name=payload.employee_name.strip(),
        department=payload.department,
        dispute_type=payload.dispute_type,
        priority=payload.priority,
        claim=payload.claim.strip(),
        hr_notes=payload.hr_notes,
        status="Open",
    )

    db.add(dispute)
    db.commit()
    db.refresh(dispute)

    return dispute


@router.post("/{dispute_id}/resolve", response_model=DisputeResolveResponse)
def resolve_dispute(dispute_id: int, db: Session = Depends(get_db)):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()

    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    search_question = f"""
    {dispute.dispute_type} attendance salary deduction leave policy warning payroll missing punch late marks absence.
    Employee claim: {dispute.claim}
    HR notes: {dispute.hr_notes or ""}
    Find relevant HR policy, attendance, salary, leave, warning, payroll, or dispute evidence.
    """

    sources = retrieve_relevant_sources(
        db=db,
        question=search_question,
        workspace_id=dispute.workspace_id,
        limit=5,
        allowed_document_types=HR_EVIDENCE_DOCUMENT_TYPES,
    )

    # Fallback to all workspaces, but still only HR evidence docs.
    if not sources:
        sources = retrieve_relevant_sources(
            db=db,
            question=search_question,
            workspace_id=None,
            limit=5,
            allowed_document_types=HR_EVIDENCE_DOCUMENT_TYPES,
        )

    resolved = resolve_dispute_payload(dispute, sources)

    dispute.evidence_summary = resolved["evidence_summary"]
    dispute.risk_level = resolved["risk_level"]
    dispute.recommended_action = resolved["recommended_action"]
    dispute.response_draft = resolved["response_draft"]
    dispute.sources_json = serialize_sources(sources)
    dispute.status = "Under Review" if sources else "Needs Evidence"

    db.commit()
    db.refresh(dispute)

    return {
        "dispute": dispute,
        "sources": sources,
    }


@router.patch("/{dispute_id}/status", response_model=DisputeResponse)
def update_dispute_status(
    dispute_id: int,
    payload: DisputeUpdateStatus,
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()

    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    allowed = {
        "Open",
        "Under Review",
        "Needs Evidence",
        "Waiting for Employee",
        "Escalated",
        "Closed",
    }

    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")

    dispute.status = payload.status
    db.commit()
    db.refresh(dispute)

    return dispute


@router.delete("/{dispute_id}")
def delete_dispute(dispute_id: int, db: Session = Depends(get_db)):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()

    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    db.delete(dispute)
    db.commit()

    return {"message": "Dispute deleted successfully"}
