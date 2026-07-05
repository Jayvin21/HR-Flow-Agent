from pydantic import BaseModel
from typing import List, Optional


class AttendanceImportRequest(BaseModel):
    document_id: int


class AttendanceRecordResponse(BaseModel):
    id: int
    workspace_id: Optional[int]
    document_id: Optional[int]

    employee_id: Optional[str]
    employee_name: str
    department: Optional[str]

    date: str
    check_in: Optional[str]
    check_out: Optional[str]
    status: str
    late_minutes: int

    issue_type: Optional[str]
    severity: str

    class Config:
        from_attributes = True


class AttendanceEmployeeIssue(BaseModel):
    employee_id: Optional[str]
    employee_name: str
    department: Optional[str]

    total_records: int
    present_days: int
    absent_days: int
    late_marks: int
    missing_punches: int
    total_late_minutes: int

    severity: str
    recommended_action: str
    follow_up_draft: str


class AttendanceImportResponse(BaseModel):
    message: str
    imported: int
    skipped: int


class AttendanceSummaryResponse(BaseModel):
    total_records: int
    employees_tracked: int
    absent_records: int
    late_records: int
    missing_punch_records: int
    issues: List[AttendanceEmployeeIssue]
