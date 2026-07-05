from app.services.attendance_issue_engine import infer_attendance_issue
from pathlib import Path
from typing import Dict, List, Any
import pandas as pd


REQUIRED_COLUMNS = {
    "employee_id",
    "employee_name",
    "department",
    "date",
    "check_in",
    "check_out",
    "status",
    "late_minutes",
}


def normalize_column(column: str) -> str:
    return str(column).strip().lower().replace(" ", "_").replace("-", "_")


def read_attendance_file(file_path: str) -> pd.DataFrame:
    path = Path(file_path)
    extension = path.suffix.lower()

    if extension == ".csv":
        df = pd.read_csv(path)
    elif extension in [".xlsx", ".xls"]:
        df = pd.read_excel(path)
    else:
        raise ValueError("Unsupported attendance file type. Upload CSV, XLSX, or XLS.")

    df.columns = [normalize_column(column) for column in df.columns]

    return df


def clean_value(value) -> str:
    if pd.isna(value):
        return ""

    return str(value).strip()


def parse_late_minutes(value) -> int:
    try:
        if pd.isna(value) or value == "":
            return 0
        return int(float(value))
    except Exception:
        return 0


def detect_issue_type(status: str, check_in: str, check_out: str, late_minutes: int) -> tuple[str | None, str]:
    status_lower = (status or "").lower()

    if status_lower == "absent":
        return "Absent", "High"

    if not check_in or not check_out:
        return "Missing Punch", "Medium"

    if late_minutes > 15:
        return "Late Mark", "Medium"

    if late_minutes > 0:
        return "Minor Late", "Low"

    return None, "Normal"


def normalize_attendance_rows(df: pd.DataFrame) -> List[Dict[str, Any]]:
    rows = []

    for _, row in df.iterrows():
        employee_name = clean_value(row.get("employee_name", ""))

        if not employee_name:
            continue

        status = clean_value(row.get("status", "Present")) or "Present"
        check_in = clean_value(row.get("check_in", ""))
        check_out = clean_value(row.get("check_out", ""))
        late_minutes = parse_late_minutes(row.get("late_minutes", 0))

        issue_type, severity = detect_issue_type(status, check_in, check_out, late_minutes)

        rows.append({
            "employee_id": clean_value(row.get("employee_id", "")),
            "employee_name": employee_name,
            "department": clean_value(row.get("department", "")),
            "date": clean_value(row.get("date", "")),
            "check_in": check_in,
            "check_out": check_out,
            "status": status,
            "late_minutes": late_minutes,
            "issue_type": infer_attendance_issue(status=row.get("status"), check_in=row.get("check_in"), check_out=row.get("check_out"), late_minutes=row.get("late_minutes")) or row.get("issue_type", ""),
            "severity": severity,
        })

    return rows


def get_recommended_action(absent_days: int, late_marks: int, missing_punches: int) -> tuple[str, str]:
    if absent_days >= 2:
        return "High", "Request explanation and check leave approval immediately."

    if late_marks > 3:
        return "High", "Send attendance warning or formal HR follow-up."

    if missing_punches >= 2:
        return "Medium", "Ask employee to regularize missing punch records."

    if late_marks >= 2:
        return "Medium", "Send soft reminder about reporting time."

    if absent_days == 1:
        return "Medium", "Ask for absence clarification."

    return "Low", "Monitor for repeated pattern."


def build_follow_up_draft(employee_name: str, absent_days: int, late_marks: int, missing_punches: int, total_late_minutes: int) -> str:
    issue_parts = []

    if absent_days:
        issue_parts.append(f"{absent_days} absence record(s)")

    if late_marks:
        issue_parts.append(f"{late_marks} late mark(s) totaling {total_late_minutes} late minute(s)")

    if missing_punches:
        issue_parts.append(f"{missing_punches} missing punch record(s)")

    issue_text = ", ".join(issue_parts) if issue_parts else "attendance irregularities"

    return f"""Hi {employee_name},

We noticed the following attendance concern(s): {issue_text}.

Please review your attendance records and share clarification with HR. If any record needs correction, submit the required regularization request or supporting approval details.

Regards,
HR Team"""


def build_attendance_summary(records) -> Dict[str, Any]:
    grouped: Dict[str, Dict[str, Any]] = {}

    total_records = len(records)
    absent_records = 0
    late_records = 0
    missing_punch_records = 0

    for record in records:
        key = record.employee_id or record.employee_name

        if key not in grouped:
            grouped[key] = {
                "employee_id": record.employee_id,
                "employee_name": record.employee_name,
                "department": record.department,
                "total_records": 0,
                "present_days": 0,
                "absent_days": 0,
                "late_marks": 0,
                "missing_punches": 0,
                "total_late_minutes": 0,
            }

        item = grouped[key]
        item["total_records"] += 1

        if (record.status or "").lower() == "absent":
            item["absent_days"] += 1
            absent_records += 1
        else:
            item["present_days"] += 1

        if record.late_minutes and record.late_minutes > 0:
            item["late_marks"] += 1
            item["total_late_minutes"] += record.late_minutes
            late_records += 1

        if not record.check_in or not record.check_out:
            item["missing_punches"] += 1
            missing_punch_records += 1

    issues = []

    for item in grouped.values():
        severity, action = get_recommended_action(
            item["absent_days"],
            item["late_marks"],
            item["missing_punches"],
        )

        if severity == "Low" and item["absent_days"] == 0 and item["late_marks"] == 0 and item["missing_punches"] == 0:
            continue

        item["severity"] = severity
        item["recommended_action"] = action
        item["follow_up_draft"] = build_follow_up_draft(
            item["employee_name"],
            item["absent_days"],
            item["late_marks"],
            item["missing_punches"],
            item["total_late_minutes"],
        )

        issues.append(item)

    severity_rank = {"High": 3, "Medium": 2, "Low": 1}
    issues.sort(key=lambda item: severity_rank.get(item["severity"], 0), reverse=True)

    return {
        "total_records": total_records,
        "employees_tracked": len(grouped),
        "absent_records": absent_records,
        "late_records": late_records,
        "missing_punch_records": missing_punch_records,
        "issues": issues,
    }


