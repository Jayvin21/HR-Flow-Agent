from pydantic import BaseModel
from typing import Optional, List


class UnifiedCaseItem(BaseModel):
    id: str
    source_type: str
    source_id: int

    title: str
    person_name: str
    department: Optional[str]
    category: str
    status: str
    priority: str
    risk_level: Optional[str]

    summary: str
    recommended_action: Optional[str]
    draft: Optional[str]
    created_at: str


class UnifiedCasesSummary(BaseModel):
    total_cases: int
    open_cases: int
    high_priority_cases: int
    escalated_cases: int
    needs_review_cases: int


class UnifiedCasesResponse(BaseModel):
    summary: UnifiedCasesSummary
    cases: List[UnifiedCaseItem]
