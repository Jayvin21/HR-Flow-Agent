from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.rag_schema import RagSource


class DisputeCreate(BaseModel):
    workspace_id: Optional[int] = None
    employee_name: str
    department: Optional[str] = ""
    dispute_type: str = "General"
    priority: str = "Medium"
    claim: str
    hr_notes: Optional[str] = ""


class DisputeUpdateStatus(BaseModel):
    status: str


class DisputeResponse(BaseModel):
    id: int
    workspace_id: Optional[int]

    employee_name: str
    department: Optional[str]
    dispute_type: str
    priority: str
    status: str

    claim: str
    hr_notes: Optional[str]

    evidence_summary: Optional[str]
    risk_level: Optional[str]
    recommended_action: Optional[str]
    response_draft: Optional[str]
    sources_json: Optional[str]

    created_at: datetime

    class Config:
        from_attributes = True


class DisputeResolveResponse(BaseModel):
    dispute: DisputeResponse
    sources: List[RagSource]
