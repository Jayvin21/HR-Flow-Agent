from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.database import get_db
from app.models.document import Document
from app.models.attendance import AttendanceRecord
from app.schemas.attendance_schema import (
    AttendanceImportRequest,
    AttendanceImportResponse,
    AttendanceRecordResponse,
    AttendanceSummaryResponse,
)
from app.services.attendance_analyzer import (
    read_attendance_file,
    normalize_attendance_rows,
    build_attendance_summary,
)

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance Assistant"]
)

def attendance_record_exists(db, record):
    return db.query(AttendanceRecord).filter(
        AttendanceRecord.document_id == record.document_id,
        AttendanceRecord.employee_id == record.employee_id,
        AttendanceRecord.employee_name == record.employee_name,
        AttendanceRecord.department == record.department,
        AttendanceRecord.date == record.date,
        AttendanceRecord.check_in == record.check_in,
        AttendanceRecord.check_out == record.check_out,
        AttendanceRecord.status == record.status,
        AttendanceRecord.late_minutes == record.late_minutes,
        AttendanceRecord.issue_type == record.issue_type,
    ).first() is not None
@router.get("/documents")
def get_attendance_documents(
    workspace_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(Document.document_type == "Attendance")

    if workspace_id:
        query = query.filter(Document.workspace_id == workspace_id)

    documents = query.order_by(Document.created_at.desc()).all()

    return [
        {
            "id": document.id,
            "filename": document.original_filename,
            "workspace_id": document.workspace_id,
            "file_type": document.file_type,
            "created_at": document.created_at,
        }
        for document in documents
    ]


@router.post("/import", response_model=AttendanceImportResponse)
def import_attendance(payload: AttendanceImportRequest, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == payload.document_id).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Attendance document not found"
        )

    if document.document_type != "Attendance":
        raise HTTPException(
            status_code=400,
            detail="Selected document is not marked as Attendance"
        )

    # Reimport cleanly: remove old rows for this selected document first.
    # This prevents duplicate loops when the same attendance file is imported again.
    db.query(AttendanceRecord).filter(
        AttendanceRecord.document_id == document.id
    ).delete()
    db.commit()

    try:
        df = read_attendance_file(document.file_path)
        rows = normalize_attendance_rows(df)
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    imported = 0

    for row in rows:
        record = AttendanceRecord(
            workspace_id=document.workspace_id,
            document_id=document.id,
            employee_id=row["employee_id"],
            employee_name=row["employee_name"],
            department=row["department"],
            date=row["date"],
            check_in=row["check_in"],
            check_out=row["check_out"],
            status=row["status"],
            late_minutes=row["late_minutes"],
            issue_type=row["issue_type"],
            severity=row["severity"],
        )

        db.add(record)
        imported += 1

    db.commit()

    return {
        "message": "Attendance import completed.",
        "imported": imported,
        "skipped": 0,
    }


@router.get("/records", response_model=List[AttendanceRecordResponse])
def get_attendance_records(
    workspace_id: Optional[int] = None,
    document_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceRecord)

    if workspace_id:
        query = query.filter(AttendanceRecord.workspace_id == workspace_id)

    if document_id:
        query = query.filter(AttendanceRecord.document_id == document_id)

    return query.order_by(AttendanceRecord.date.desc()).all()


@router.get("/summary", response_model=AttendanceSummaryResponse)
def get_attendance_summary(
    workspace_id: Optional[int] = None,
    document_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceRecord)

    if workspace_id:
        query = query.filter(AttendanceRecord.workspace_id == workspace_id)

    if document_id:
        query = query.filter(AttendanceRecord.document_id == document_id)

    records = query.all()

    return build_attendance_summary(records)


@router.delete("/clear")
def clear_attendance_records(
    workspace_id: Optional[int] = None,
    document_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceRecord)

    if workspace_id:
        query = query.filter(AttendanceRecord.workspace_id == workspace_id)

    if document_id:
        query = query.filter(AttendanceRecord.document_id == document_id)

    deleted = query.delete(synchronize_session=False)
    db.commit()

    return {
        "message": "Attendance records cleared.",
        "deleted": deleted,
    }




