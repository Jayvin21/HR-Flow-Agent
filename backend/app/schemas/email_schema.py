from pydantic import BaseModel
from typing import Optional


class EmailGenerateRequest(BaseModel):
    email_type: str
    candidate_id: Optional[int] = None
    recipient_name: Optional[str] = ""
    role: Optional[str] = ""
    interview_date: Optional[str] = ""
    interview_time: Optional[str] = ""
    company_name: Optional[str] = "Acme Corp"
    hr_name: Optional[str] = "HR Team"
    extra_notes: Optional[str] = ""


class EmailGenerateResponse(BaseModel):
    subject: str
    body: str
    email_type: str
    recipient_name: str
