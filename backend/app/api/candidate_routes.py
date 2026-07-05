from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.document import Document
from app.models.candidate import Candidate
from app.schemas.candidate_schema import CandidateResponse, CandidateStatusUpdate
from app.services.resume_parser import parse_resume_text, parse_candidate_resume

router = APIRouter(
    prefix="/candidates",
    tags=["Candidates"]
)


@router.get("/", response_model=List[CandidateResponse])
def get_candidates(
    workspace_id: Optional[int] = None,
    recruitment_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Candidate)

    if workspace_id:
        query = query.filter(Candidate.workspace_id == workspace_id)

    if recruitment_status:
        query = query.filter(Candidate.recruitment_status == recruitment_status)

    return query.order_by(Candidate.created_at.desc()).all()


@router.post("/parse-resumes")
def parse_uploaded_resumes(
    workspace_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(Document.document_type == "Resume")

    if workspace_id:
        query = query.filter(Document.workspace_id == workspace_id)

    documents = query.all()

    if not documents:
        return {
            "message": "No resume documents found to parse.",
            "created": 0,
            "skipped": 0
        }

    created = 0
    skipped = 0

    for document in documents:
        existing = db.query(Candidate).filter(Candidate.document_id == document.id).first()

        if existing:
            skipped += 1
            continue

        if not document.extracted_text:
            skipped += 1
            continue

        parsed = parse_resume_text(document.extracted_text)

        parsed = {
            "name": parsed.get("name") or "Unknown Candidate",
            "email": parsed.get("email") or "",
            "phone": parsed.get("phone") or "",
            "skills": ", ".join(parsed.get("skills") or []) if isinstance(parsed.get("skills"), list) else (parsed.get("skills") or ""),
            "education": parsed.get("education") or "Not detected",
            "experience": parsed.get("experience") or "Not detected",
            "projects": parsed.get("projects") or "",
            "experience_years": parsed.get("experience_years") or 0,
            "current_role": parsed.get("current_role") or parsed.get("role") or "",
            "role": parsed.get("role") or parsed.get("current_role") or "",
            "summary": parsed.get("summary") or "",
            "raw_text": parsed.get("raw_text") or parsed.get("resume_text") or "",
            "resume_text": parsed.get("resume_text") or parsed.get("raw_text") or "",
        }

        candidate = Candidate(
            workspace_id=document.workspace_id,
            document_id=document.id,
            name=parsed.get("name") or "Unknown Candidate" or "Unknown Candidate",
            email=parsed.get("email") or "",
            phone=parsed.get("phone") or "",
            current_role=parsed.get("current_role") or parsed.get("role") or "",
            skills=parsed.get("skills") or "",
            education=parsed.get("education") or "Not detected",
            experience=parsed.get("experience") or "Not detected",
            projects=parsed.get("projects") or "",
            summary=parsed.get("summary") or "",
            source_filename=document.original_filename,
            status="Parsed",
            recruitment_status="New",
        )

        db.add(candidate)
        created += 1

    db.commit()

    return {
        "message": "Resume parsing completed.",
        "created": created,
        "skipped": skipped
    }



@router.patch("/{candidate_id}/status")
def update_candidate_status(candidate_id: int, payload: dict, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    incoming_status = payload.get("status") or payload.get("recruitment_status") or ""

    status_map = {
        "new": "New",
        "parsed": "Parsed",
        "shortlisted": "Shortlisted",
        "rejected": "Rejected",
        "hired": "Hired",
    }

    normalized = status_map.get(str(incoming_status).strip().lower())

    if not normalized:
        raise HTTPException(status_code=400, detail="Invalid candidate status")

    if hasattr(candidate, "status"):
        candidate.status = normalized

    if hasattr(candidate, "recruitment_status"):
        candidate.recruitment_status = normalized

    db.commit()
    db.refresh(candidate)

    return {
        "id": candidate.id,
        "name": getattr(candidate, "name", ""),
        "email": getattr(candidate, "email", ""),
        "phone": getattr(candidate, "phone", ""),
        "status": getattr(candidate, "status", normalized),
        "recruitment_status": getattr(candidate, "recruitment_status", normalized),
        "skills": getattr(candidate, "skills", ""),
        "education": getattr(candidate, "education", ""),
        "experience": getattr(candidate, "experience", ""),
        "projects": getattr(candidate, "projects", ""),
        "summary": getattr(candidate, "summary", ""),
        "source_filename": getattr(candidate, "source_filename", ""),
        "workspace_id": getattr(candidate, "workspace_id", None),
        "document_id": getattr(candidate, "document_id", None),
    }



@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    from app.models.document import Document

    try:
        from app.models.communication_task import CommunicationTask
    except Exception:
        CommunicationTask = None

    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()

    if not candidate:
        return {
            "message": "Candidate already deleted or not found.",
            "deleted": 0,
            "candidate_id": candidate_id,
        }

    document_id = getattr(candidate, "document_id", None)

    # Delete candidate-related communication tasks.
    if CommunicationTask is not None:
        candidate_source_ids = [
            str(candidate_id),
            f"{candidate_id}-shortlist-email",
            f"{candidate_id}-hiring-email",
        ]

        db.query(CommunicationTask).filter(
            CommunicationTask.source_type == "Candidate",
            CommunicationTask.source_id.in_(candidate_source_ids)
        ).delete(synchronize_session=False)

    # Delete candidate row.
    db.delete(candidate)

    # Delete linked resume document so Parse Resumes cannot recreate the candidate.
    if document_id:
        document = db.query(Document).filter(Document.id == document_id).first()

        if document and getattr(document, "document_type", "") == "Resume":
            db.delete(document)

    db.commit()

    return {
        "message": "Candidate and linked resume document deleted.",
        "deleted": 1,
        "candidate_id": candidate_id,
        "document_id": document_id,
    }

@router.get("/interview-eligible")
def get_interview_eligible_candidates(
    workspace_id: int | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Candidate)

    if workspace_id:
        query = query.filter(Candidate.workspace_id == workspace_id)

    candidates = query.all()

    return [
        candidate
        for candidate in candidates
        if (candidate.recruitment_status or "New") not in ["Rejected", "Hired"]
    ]

# ---------------------------------------------------------------------
# Candidate reparse endpoint
# Re-reads linked resume documents and refreshes extracted candidate fields
# without changing recruitment_status.
# ---------------------------------------------------------------------

@router.post("/reparse")
def reparse_candidates_from_documents(
    workspace_id: int | None = None,
    db: Session = Depends(get_db)
):
    import json
    from sqlalchemy import String, Text
    from app.models.document import Document
    from app.models.candidate import Candidate

    try:
        from app.services.resume_parser import parse_candidate_resume
    except Exception:
        try:
            from app.services.candidate_parser import parse_candidate_resume
        except Exception:
            from app.services.candidate_extractor import parse_candidate_resume

    def has_column(model, field):
        return hasattr(model, field)

    def set_if_exists(obj, field, value):
        if value is None:
            return

        if not hasattr(obj, field):
            return

        # Avoid overwriting useful existing values with weak parser fallbacks.
        if field in ["name", "candidate_name"] and str(value).strip().lower() in ["", "unknown candidate"]:
            return

        column = obj.__table__.columns.get(field)

        if field == "skills":
            if isinstance(value, list):
                if column is not None and isinstance(column.type, (String, Text)):
                    setattr(obj, field, ", ".join(value))
                else:
                    setattr(obj, field, value)
            else:
                setattr(obj, field, value)
            return

        setattr(obj, field, value)

    query = db.query(Candidate)

    if workspace_id:
        query = query.filter(Candidate.workspace_id == workspace_id)

    candidates = query.all()

    reparsed = 0
    skipped = 0
    errors = []

    for candidate in candidates:
        document = None

        # Most candidate rows should have document_id. Keep fallback flexible.
        document_id = getattr(candidate, "document_id", None) or getattr(candidate, "resume_document_id", None)

        if document_id:
            document = db.query(Document).filter(Document.id == document_id).first()

        # Fallback: match by workspace + candidate email/name in document text/title if needed.
        if not document:
            skipped += 1
            errors.append({
                "candidate_id": candidate.id,
                "reason": "No linked resume document found."
            })
            continue

        file_path = getattr(document, "file_path", None)

        if not file_path:
            skipped += 1
            errors.append({
                "candidate_id": candidate.id,
                "reason": "Linked document has no file_path."
            })
            continue

        try:
            parsed = parse_candidate_resume(file_path)

            parsed_name = parsed.get("name") or parsed.get("candidate_name")

            set_if_exists(candidate, "name", parsed_name)
            set_if_exists(candidate, "candidate_name", parsed_name)
            set_if_exists(candidate, "email", parsed.get("email"))
            set_if_exists(candidate, "phone", parsed.get("phone"))
            set_if_exists(candidate, "skills", parsed.get("skills"))
            set_if_exists(candidate, "education", parsed.get("education"))
            set_if_exists(candidate, "experience", parsed.get("experience"))
            set_if_exists(candidate, "experience_years", parsed.get("experience_years"))
            set_if_exists(candidate, "current_role", parsed.get("current_role") or parsed.get("role"))
            set_if_exists(candidate, "role", parsed.get("role"))
            set_if_exists(candidate, "projects", parsed.get("projects"))
            set_if_exists(candidate, "summary", parsed.get("summary"))
            set_if_exists(candidate, "raw_text", parsed.get("raw_text"))
            set_if_exists(candidate, "resume_text", parsed.get("raw_text"))

            reparsed += 1

        except Exception as error:
            skipped += 1
            errors.append({
                "candidate_id": candidate.id,
                "reason": str(error)
            })

    db.commit()

    return {
        "message": "Candidate reparse completed.",
        "reparsed": reparsed,
        "skipped": skipped,
        "errors": errors[:10],
    }









