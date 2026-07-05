from pydantic import BaseModel
from typing import List, Optional


class RagChatRequest(BaseModel):
    question: str
    workspace_id: Optional[int] = None


class RagSource(BaseModel):
    document_id: int
    filename: str
    document_type: str
    snippet: str
    score: int


class RagChatResponse(BaseModel):
    answer: str
    sources: List[RagSource]
    confidence: str
