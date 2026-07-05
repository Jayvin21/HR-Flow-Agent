from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "General"


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
