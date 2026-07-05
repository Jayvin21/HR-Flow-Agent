from pydantic import BaseModel
from typing import List, Optional


class JDMatchRequest(BaseModel):
    workspace_id: Optional[int] = None
    jd_text: str


class JDDocumentResponse(BaseModel):
    id: int
    filename: str
    document_type: str
    text_preview: Optional[str]


class JDMatchResult(BaseModel):
    candidate_id: int
    candidate_name: str
    candidate_role: Optional[str]
    candidate_email: Optional[str]
    recruitment_status: str

    match_score: int
    verdict: str

    matched_skills: List[str]
    missing_skills: List[str]
    candidate_skills: List[str]
    required_skills: List[str]

    strengths: List[str]
    gaps: List[str]
    explanation: str


class JDMatchResponse(BaseModel):
    jd_required_skills: List[str]
    total_candidates: int
    average_score: float
    matches: List[JDMatchResult]
