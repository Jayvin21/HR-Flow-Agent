from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint
from sqlalchemy.sql import func

from app.db.database import Base


class AttendanceIssueStatus(Base):
    __tablename__ = "attendance_issue_statuses"

    id = Column(Integer, primary_key=True, index=True)

    issue_key = Column(String, nullable=False, unique=True, index=True)
    employee_name = Column(String, nullable=True)
    issue_type = Column(String, nullable=True)
    issue_date = Column(String, nullable=True)

    status = Column(String, default="Open")  # Open or Done

    completed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("issue_key", name="uq_attendance_issue_key"),
    )
