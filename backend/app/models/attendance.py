from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.db.database import Base


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)

    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)

    employee_id = Column(String, nullable=True)
    employee_name = Column(String, nullable=False)
    department = Column(String, nullable=True)

    date = Column(String, nullable=False)
    check_in = Column(String, nullable=True)
    check_out = Column(String, nullable=True)
    status = Column(String, nullable=False, default="Present")
    late_minutes = Column(Integer, nullable=False, default=0)

    issue_type = Column(String, nullable=True)
    severity = Column(String, nullable=False, default="Normal")

    created_at = Column(DateTime, default=datetime.utcnow)
