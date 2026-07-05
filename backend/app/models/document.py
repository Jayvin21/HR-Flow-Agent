from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.db.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)

    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    document_type = Column(String, nullable=False, default="General")

    extracted_text = Column(String, nullable=True)
    text_preview = Column(String, nullable=True)
    char_count = Column(Integer, nullable=False, default=0)

    status = Column(String, nullable=False, default="Processed")
    created_at = Column(DateTime, default=datetime.utcnow)
