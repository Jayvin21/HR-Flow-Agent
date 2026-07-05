from pydantic import BaseModel
from typing import List, Optional


class InterviewGenerateRequest(BaseModel):
    candidate_id: int
    jd_text: Optional[str] = ""


class InterviewSection(BaseModel):
    title: str
    questions: List[str]


class InterviewScorecardItem(BaseModel):
    criterion: str
    what_to_check: str
    max_score: int


class InterviewGenerateResponse(BaseModel):
    candidate_id: int
    candidate_name: str
    role: Optional[str]
    summary: str
    sections: List[InterviewSection]
    scorecard: List[InterviewScorecardItem]
