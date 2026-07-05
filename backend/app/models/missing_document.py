from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from app.db.database import Base


class MissingDocumentCase(Base):
    __tablename__ = "missing_document_cases"

    id = Column(Integer, primary_key=True, index=True)

    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=True)

    person_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    role = Column(String, nullable=True)

    required_documents = Column(Text, nullable=False)
    submitted_documents = Column(Text, nullable=True)
    missing_documents = Column(Text, nullable=True)

    status = Column(String, nullable=False, default="Pending")
    priority = Column(String, nullable=False, default="Medium")
    request_draft = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
