from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from app.db.database import Base


class EmployeeQuery(Base):
    __tablename__ = "employee_queries"

    id = Column(Integer, primary_key=True, index=True)

    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)

    employee_name = Column(String, nullable=False)
    department = Column(String, nullable=True)
    query_type = Column(String, nullable=False, default="General")
    priority = Column(String, nullable=False, default="Medium")
    status = Column(String, nullable=False, default="Open")

    question = Column(Text, nullable=False)
    policy_answer = Column(Text, nullable=True)
    response_draft = Column(Text, nullable=True)
    sources_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
