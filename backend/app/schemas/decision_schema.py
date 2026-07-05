from pydantic import BaseModel
from typing import Optional, List


class DecisionGenerateRequest(BaseModel):
    decision_type: str
    source_type: str
    source_id: Optional[int] = None

    person_name: Optional[str] = ""
    role_or_category: Optional[str] = ""
    situation: Optional[str] = ""
    evidence: Optional[str] = ""
    recommendation: Optional[str] = ""
    reviewer_name: Optional[str] = "HR Team"


class DecisionSection(BaseModel):
    title: str
    content: str


class DecisionGenerateResponse(BaseModel):
    title: str
    person_name: str
    decision_type: str
    recommendation: str
    risk_level: str
    memo: str
    sections: List[DecisionSection]
