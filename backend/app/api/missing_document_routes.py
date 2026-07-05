from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.candidate import Candidate
from app.models.missing_document import MissingDocumentCase
from app.schemas.missing_document_schema import (
    MissingDocumentCreate,
    MissingDocumentResponse,
    MissingDocumentStatusUpdate,
)
from app.services.missing_document_service import (
    DEFAULT_REQUIRED_DOCUMENTS,
    build_case_payload,
    build_from_candidate,
)

router = APIRouter(
    prefix="/missing-docs",
    tags=["Missing Documents"]
)


@router.get("/defaults")
def get_default_required_documents():
    return {
        "required_documents": DEFAULT_REQUIRED_DOCUMENTS
    }


@router.get("/", response_model=List[MissingDocumentResponse])
def get_missing_document_cases(
    workspace_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MissingDocumentCase)

    if workspace_id:
        query = query.filter(MissingDocumentCase.workspace_id == workspace_id)

    if status:
        query = query.filter(MissingDocumentCase.status == status)

    return query.order_by(MissingDocumentCase.created_at.desc()).all()


@router.post("/", response_model=MissingDocumentResponse)
def create_missing_document_case(payload: MissingDocumentCreate, db: Session = Depends(get_db)):
    if not payload.person_name.strip() and not payload.candidate_id:
        raise HTTPException(status_code=400, detail="Person name or candidate is required")

    required_documents = payload.required_documents or DEFAULT_REQUIRED_DOCUMENTS
    submitted_documents = payload.submitted_documents or []

    candidate = None

    person_name = payload.person_name.strip()
    email = payload.email or ""
    role = payload.role or ""
    workspace_id = payload.workspace_id

    if payload.candidate_id:
        candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()

        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        person_name = candidate.name
        email = candidate.email or email
        role = candidate.current_role or role
        workspace_id = candidate.workspace_id or workspace_id

        generated = build_from_candidate(
            candidate=candidate,
            required_documents=required_documents,
            submitted_documents=submitted_documents,
        )
    else:
        generated = build_case_payload(
            person_name=person_name,
            email=email,
            role=role,
            required_documents=required_documents,
            submitted_documents=submitted_documents,
        )

    case = MissingDocumentCase(
        workspace_id=workspace_id,
        candidate_id=payload.candidate_id,
        person_name=person_name,
        email=email,
        role=role,
        required_documents=generated["required_documents"],
        submitted_documents=generated["submitted_documents"],
        missing_documents=generated["missing_documents"],
        status=generated["status"],
        priority=payload.priority,
        request_draft=generated["request_draft"],
    )

    db.add(case)
    db.commit()
    db.refresh(case)

    return case


@router.post("/{case_id}/recalculate", response_model=MissingDocumentResponse)
def recalculate_missing_document_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(MissingDocumentCase).filter(MissingDocumentCase.id == case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="Missing document case not found")

    import json

    try:
        required_documents = json.loads(case.required_documents or "[]")
        submitted_documents = json.loads(case.submitted_documents or "[]")
    except Exception:
        required_documents = []
        submitted_documents = []

    generated = build_case_payload(
        person_name=case.person_name,
        email=case.email or "",
        role=case.role or "",
        required_documents=required_documents,
        submitted_documents=submitted_documents,
    )

    case.missing_documents = generated["missing_documents"]
    case.status = generated["status"]
    case.request_draft = generated["request_draft"]

    db.commit()
    db.refresh(case)

    return case


@router.patch("/{case_id}/status", response_model=MissingDocumentResponse)
def update_missing_document_status(
    case_id: int,
    payload: MissingDocumentStatusUpdate,
    db: Session = Depends(get_db)
):
    case = db.query(MissingDocumentCase).filter(MissingDocumentCase.id == case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="Missing document case not found")

    allowed = {
        "Pending",
        "Partially Pending",
        "Complete",
        "Requested",
        "Escalated",
        "Closed",
    }

    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")

    case.status = payload.status
    db.commit()
    db.refresh(case)

    return case


@router.delete("/{case_id}")
def delete_missing_document_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(MissingDocumentCase).filter(MissingDocumentCase.id == case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="Missing document case not found")

    db.delete(case)
    db.commit()

    return {"message": "Missing document case deleted successfully"}
