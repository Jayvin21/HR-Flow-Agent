from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.workspace import Workspace
from app.schemas.workspace_schema import WorkspaceCreate, WorkspaceResponse

router = APIRouter(
    prefix="/workspaces",
    tags=["Workspaces"]
)


@router.get("/", response_model=List[WorkspaceResponse])
def get_workspaces(db: Session = Depends(get_db)):
    return db.query(Workspace).order_by(Workspace.created_at.desc()).all()


@router.post("/", response_model=WorkspaceResponse)
def create_workspace(payload: WorkspaceCreate, db: Session = Depends(get_db)):
    existing = db.query(Workspace).filter(Workspace.name == payload.name).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Workspace with this name already exists"
        )

    workspace = Workspace(
        name=payload.name,
        description=payload.description,
        category=payload.category,
    )

    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    return workspace


@router.delete("/{workspace_id}")
def delete_workspace(workspace_id: int, db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()

    if not workspace:
        raise HTTPException(
            status_code=404,
            detail="Workspace not found"
        )

    db.delete(workspace)
    db.commit()

    return {"message": "Workspace deleted successfully"}

