from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.candidate import Candidate
from app.schemas.interview_schema import InterviewGenerateRequest, InterviewGenerateResponse
from app.services.interview_generator import generate_interview_pack

router = APIRouter(
    prefix="/interview",
    tags=["Interview Assistant"]
)


@router.post("/generate", response_model=InterviewGenerateResponse)
def generate_interview(payload: InterviewGenerateRequest, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()

    if candidate and (candidate.recruitment_status or "New") in ["Rejected", "Hired"]:
        raise HTTPException(
            status_code=400,
            detail="This candidate is not interview eligible because their recruitment status is Rejected or Hired."
        )

    if not candidate:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found"
        )

    return generate_interview_pack(candidate, payload.jd_text)

