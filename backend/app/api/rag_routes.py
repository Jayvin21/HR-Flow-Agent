from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.rag_schema import RagChatRequest, RagChatResponse
from app.services.rag_service import retrieve_relevant_sources, build_grounded_answer

router = APIRouter(
    prefix="/rag",
    tags=["RAG Chat"]
)


@router.post("/chat", response_model=RagChatResponse)
def rag_chat(payload: RagChatRequest, db: Session = Depends(get_db)):
    question = payload.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question is required"
        )

    sources = retrieve_relevant_sources(
        db=db,
        question=question,
        workspace_id=payload.workspace_id,
        limit=5
    )

    answer, confidence = build_grounded_answer(question, sources)

    return {
        "answer": answer,
        "sources": sources,
        "confidence": confidence
    }
