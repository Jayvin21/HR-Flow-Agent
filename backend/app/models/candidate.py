from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from app.db.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)

    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)

    name = Column(String, nullable=False, default="Unknown Candidate")
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    current_role = Column(String, nullable=True)
    skills = Column(Text, nullable=True)
    education = Column(Text, nullable=True)
    experience = Column(Text, nullable=True)
    projects = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)

    source_filename = Column(String, nullable=True)
    status = Column(String, nullable=False, default="Parsed")
    recruitment_status = Column(String, nullable=False, default="New")

    created_at = Column(DateTime, default=datetime.utcnow)
