from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import Base, engine
from app.db.migrations import run_lightweight_migrations
from app.api.workspace_routes import router as workspace_router
from app.api.document_routes import router as document_router
from app.api.rag_routes import router as rag_router
from app.api.candidate_routes import router as candidate_router
from app.api.jd_routes import router as jd_router
from app.api.interview_routes import router as interview_router
from app.api.email_routes import router as email_router
from app.api.letter_routes import router as letter_router
from app.api.attendance_routes import router as attendance_router
from app.api.attendance_issue_routes import router as attendance_issue_router
from app.api.employee_query_routes import router as employee_query_router
from app.api.dispute_routes import router as dispute_router
from app.api.missing_document_routes import router as missing_document_router
from app.api.case_routes import router as case_router
from app.api.communication_routes import router as communication_router
from app.api.dashboard_routes import router as dashboard_router
from app.api.admin_routes import router as admin_router
from app.api.decision_routes import router as decision_router

Base.metadata.create_all(bind=engine)
run_lightweight_migrations(engine)

app = FastAPI(
    title="HRFlow RAG AI API",
    description="Agentic HR assistant for recruitment, policy Q&A, attendance follow-ups, employee queries, disputes, and HR document intelligence.",
    version="0.1.0"
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workspace_router)
app.include_router(document_router)
app.include_router(rag_router)
app.include_router(candidate_router)
app.include_router(jd_router)
app.include_router(interview_router)
app.include_router(email_router)
app.include_router(letter_router)
app.include_router(attendance_router)
app.include_router(attendance_issue_router)
app.include_router(employee_query_router)
app.include_router(dispute_router)
app.include_router(missing_document_router)
app.include_router(case_router)
app.include_router(communication_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(decision_router)


@app.get("/")
def root():
    return {
        "message": "HRFlow RAG AI backend is running",
        "status": "ok"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "hrflow-rag-ai-api"
    }






