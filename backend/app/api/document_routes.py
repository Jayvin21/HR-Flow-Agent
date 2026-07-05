from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import uuid
from typing import Optional

from app.db.database import get_db
from app.models.document import Document
from app.schemas.document_schema import DocumentResponse
from app.services.document_parser import (
    SUPPORTED_EXTENSIONS,
    extract_text_from_file,
    build_text_preview,
)

router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    workspace_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    original_filename = file.filename or "unknown_file"
    extension = Path(original_filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {extension}"
        )

    stored_filename = f"{uuid.uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / stored_filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_text = extract_text_from_file(str(file_path))
    text_preview = build_text_preview(extracted_text)

    document = Document(
        workspace_id=workspace_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_path=str(file_path),
        file_type=extension.replace(".", ""),
        document_type=document_type,
        extracted_text=extracted_text,
        text_preview=text_preview,
        char_count=len(extracted_text or ""),
        status="Processed" if extracted_text else "No Text",
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document


@router.get("/", response_model=list[DocumentResponse])
def get_documents(
    workspace_id: Optional[int] = None,
    document_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Document)

    if workspace_id:
        query = query.filter(Document.workspace_id == workspace_id)

    if document_type:
        query = query.filter(Document.document_type == document_type)

    return query.order_by(Document.created_at.desc()).all()


@router.post("/{document_id}/reprocess", response_model=DocumentResponse)
def reprocess_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    extracted_text = extract_text_from_file(document.file_path)
    text_preview = build_text_preview(extracted_text)

    document.extracted_text = extracted_text
    document.text_preview = text_preview
    document.char_count = len(extracted_text or "")
    document.status = "Processed" if extracted_text else "No Text"

    db.commit()
    db.refresh(document)

    return document


@router.post("/reprocess-all")
def reprocess_all_documents(db: Session = Depends(get_db)):
    documents = db.query(Document).all()

    updated = 0
    failed = 0

    for document in documents:
        try:
            extracted_text = extract_text_from_file(document.file_path)
            text_preview = build_text_preview(extracted_text)

            document.extracted_text = extracted_text
            document.text_preview = text_preview
            document.char_count = len(extracted_text or "")
            document.status = "Processed" if extracted_text else "No Text"
            updated += 1
        except Exception:
            failed += 1

    db.commit()

    return {
        "message": "Reprocess completed.",
        "updated": updated,
        "failed": failed,
    }


@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    file_path = Path(document.file_path)

    if file_path.exists():
        file_path.unlink()

    db.delete(document)
    db.commit()

    return {
        "message": "Document deleted successfully"
    }
