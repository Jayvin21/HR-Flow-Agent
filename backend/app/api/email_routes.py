from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.candidate import Candidate
from app.schemas.email_schema import EmailGenerateRequest, EmailGenerateResponse
from app.services.email_generator import generate_email

router = APIRouter(
    prefix="/emails",
    tags=["Email Generator"]
)


@router.post("/generate", response_model=EmailGenerateResponse)
def generate_email_draft(payload: EmailGenerateRequest, db: Session = Depends(get_db)):
    candidate = None

    if payload.candidate_id:
        candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()

        if not candidate:
            raise HTTPException(
                status_code=404,
                detail="Candidate not found"
            )

    return generate_email(payload, candidate)
