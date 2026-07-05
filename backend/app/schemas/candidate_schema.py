from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CandidateStatusUpdate(BaseModel):
    recruitment_status: str


class CandidateResponse(BaseModel):
    id: int
    workspace_id: Optional[int]
    document_id: Optional[int]

    name: str
    email: Optional[str]
    phone: Optional[str]

    current_role: Optional[str]
    skills: Optional[str]
    education: Optional[str]
    experience: Optional[str]
    projects: Optional[str]
    summary: Optional[str]

    source_filename: Optional[str]
    status: str
    recruitment_status: str = "New"
    created_at: datetime

    class Config:
        from_attributes = True
