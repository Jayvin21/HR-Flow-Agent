from fastapi import APIRouter
from sqlalchemy import text

from app.db.database import engine

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.delete("/reset-data")
def reset_all_demo_data():
    tables_to_clear = [
        "communication_tasks",
        "attendance_issue_statuses",
        "attendance_records",
        "candidates",
        "documents",
        "workspaces",
        "employee_queries",
        "missing_documents",
        "missing_docs",
        "disputes",
        "letters",
        "emails",
        "interview_packs",
        "job_descriptions",
    ]

    deleted = {}

    with engine.connect() as conn:
        existing_tables = {
            row.name
            for row in conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            ).fetchall()
        }

        conn.execute(text("PRAGMA foreign_keys = OFF"))

        for table in tables_to_clear:
            if table not in existing_tables:
                continue

            result = conn.execute(text(f"DELETE FROM {table}"))
            deleted[table] = result.rowcount

        if "sqlite_sequence" in existing_tables:
            for table in tables_to_clear:
                conn.execute(
                    text("DELETE FROM sqlite_sequence WHERE name = :table_name"),
                    {"table_name": table},
                )

        conn.execute(text("PRAGMA foreign_keys = ON"))
        conn.commit()

    return {
        "message": "All demo data erased.",
        "deleted": deleted,
    }
