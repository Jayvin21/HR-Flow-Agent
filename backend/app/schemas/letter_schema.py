from pydantic import BaseModel
from typing import Optional


class LetterGenerateRequest(BaseModel):
    letter_type: str
    candidate_id: Optional[int] = None

    recipient_name: Optional[str] = ""
    role: Optional[str] = ""
    department: Optional[str] = ""
    company_name: Optional[str] = "Acme Corp"
    hr_name: Optional[str] = "HR Team"

    joining_date: Optional[str] = ""
    last_working_day: Optional[str] = ""
    salary: Optional[str] = ""
    location: Optional[str] = ""
    reason: Optional[str] = ""
    extra_notes: Optional[str] = ""


class LetterGenerateResponse(BaseModel):
    title: str
    body: str
    letter_type: str
    recipient_name: str
