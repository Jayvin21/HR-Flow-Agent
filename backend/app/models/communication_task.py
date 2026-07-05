from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from app.db.database import Base


class CommunicationTask(Base):
    __tablename__ = "communication_tasks"

    id = Column(Integer, primary_key=True, index=True)

    workspace_id = Column(Integer, nullable=True)

    source_type = Column(String, nullable=False)
    source_id = Column(Integer, nullable=True)

    channel = Column(String, nullable=False)  # Email or Letter
    task_type = Column(String, nullable=False)

    title = Column(String, nullable=False)
    recipient_name = Column(String, nullable=True)
    recipient_email = Column(String, nullable=True)

    priority = Column(String, default="Medium")
    status = Column(String, default="Pending")  # Pending or Completed

    suggested_template = Column(String, nullable=True)
    context = Column(Text, nullable=True)

    completed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
