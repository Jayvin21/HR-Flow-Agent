from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DocumentResponse(BaseModel):
    id: int
    workspace_id: Optional[int]
    original_filename: str
    stored_filename: str
    file_path: str
    file_type: str
    document_type: str
    text_preview: Optional[str]
    char_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
