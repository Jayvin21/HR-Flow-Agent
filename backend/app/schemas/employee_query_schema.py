from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.rag_schema import RagSource


class EmployeeQueryCreate(BaseModel):
    workspace_id: Optional[int] = None
    employee_name: str
    department: Optional[str] = ""
    query_type: str = "General"
    priority: str = "Medium"
    question: str


class EmployeeQueryUpdateStatus(BaseModel):
    status: str


class EmployeeQueryResponse(BaseModel):
    id: int
    workspace_id: Optional[int]

    employee_name: str
    department: Optional[str]
    query_type: str
    priority: str
    status: str

    question: str
    policy_answer: Optional[str]
    response_draft: Optional[str]
    sources_json: Optional[str]

    created_at: datetime

    class Config:
        from_attributes = True


class EmployeeQueryResolveResponse(BaseModel):
    query: EmployeeQueryResponse
    sources: List[RagSource]
