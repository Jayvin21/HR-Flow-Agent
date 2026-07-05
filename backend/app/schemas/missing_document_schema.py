from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MissingDocumentCreate(BaseModel):
    workspace_id: Optional[int] = None
    candidate_id: Optional[int] = None

    person_name: str
    email: Optional[str] = ""
    role: Optional[str] = ""

    required_documents: List[str]
    submitted_documents: List[str] = []

    priority: str = "Medium"


class MissingDocumentStatusUpdate(BaseModel):
    status: str


class MissingDocumentResponse(BaseModel):
    id: int

    workspace_id: Optional[int]
    candidate_id: Optional[int]

    person_name: str
    email: Optional[str]
    role: Optional[str]

    required_documents: str
    submitted_documents: Optional[str]
    missing_documents: Optional[str]

    status: str
    priority: str
    request_draft: Optional[str]

    created_at: datetime

    class Config:
        from_attributes = True
