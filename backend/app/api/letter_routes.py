from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.candidate import Candidate
from app.schemas.letter_schema import LetterGenerateRequest, LetterGenerateResponse
from app.services.letter_generator import generate_letter

router = APIRouter(
    prefix="/letters",
    tags=["Letter Generator"]
)


@router.post("/generate", response_model=LetterGenerateResponse)
def generate_letter_draft(payload: LetterGenerateRequest, db: Session = Depends(get_db)):
    candidate = None

    if payload.candidate_id:
        candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()

        if not candidate:
            raise HTTPException(
                status_code=404,
                detail="Candidate not found"
            )

    return generate_letter(payload, candidate)
