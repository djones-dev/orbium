from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID

from db.session import get_db
from models.body import BodyInstanceCreate, BodyInstanceUpdate, BodyInstanceResponse
from services import body_service

router = APIRouter(prefix="/api/bodies", tags=["bodies"])

@router.post("", response_model=BodyInstanceResponse)
def create_body(body_in: BodyInstanceCreate, db: Session = Depends(get_db)):
    return body_service.create_body(db, body_in)

@router.get("", response_model=List[BodyInstanceResponse])
def list_bodies(db: Session = Depends(get_db)):
    return body_service.list_bodies(db)

@router.patch("/{body_id}", response_model=BodyInstanceResponse)
def update_body(body_id: UUID, updates: BodyInstanceUpdate, db: Session = Depends(get_db)):
    updated = body_service.update_body(db, body_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Body not found")
    return updated

@router.delete("/{body_id}")
def delete_body(body_id: UUID, db: Session = Depends(get_db)):
    success = body_service.delete_body(db, body_id)
    if not success:
        raise HTTPException(status_code=404, detail="Body not found")
    return {"status": "deleted"}

@router.delete("")
def delete_all_bodies(db: Session = Depends(get_db)):
    count = body_service.delete_all_bodies(db)
    return {"status": "cleared", "count": count}

@router.post("/{body_id}/attributes", response_model=BodyInstanceResponse)
def add_attribute(body_id: UUID, attribute: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    updated = body_service.add_attribute(db, body_id, attribute)
    if not updated:
        raise HTTPException(status_code=404, detail="Body not found")
    return updated
