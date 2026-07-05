from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.document import Document
from app.models.candidate import Candidate
from app.schemas.jd_schema import JDMatchRequest, JDMatchResponse
from app.services.jd_matcher import match_candidates_to_jd

router = APIRouter(
    prefix="/jd",
    tags=["JD Matcher"]
)


@router.get("/documents")
def get_jd_documents(
    workspace_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(Document.document_type == "Job Description")

    if workspace_id:
        query = query.filter(Document.workspace_id == workspace_id)

    documents = query.order_by(Document.created_at.desc()).all()

    return [
        {
            "id": document.id,
            "filename": document.original_filename,
            "document_type": document.document_type,
            "text_preview": document.text_preview,
            "extracted_text": document.extracted_text,
        }
        for document in documents
    ]


@router.post("/match", response_model=JDMatchResponse)
def match_jd(payload: JDMatchRequest, db: Session = Depends(get_db)):
    if not payload.jd_text.strip():
        raise HTTPException(status_code=400, detail="JD text is required")

    query = db.query(Candidate)

    if payload.workspace_id:
        query = query.filter(Candidate.workspace_id == payload.workspace_id)

    candidates = query.all()

    return match_candidates_to_jd(
        candidates=candidates,
        jd_text=payload.jd_text,
    )
