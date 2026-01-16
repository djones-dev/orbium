from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from db.session import get_db
from models.preset import PresetCreate, PresetUpdate, PresetResponse
from services import preset_service

router = APIRouter(prefix="/api/presets", tags=["presets"])

@router.post("", response_model=PresetResponse)
def create_preset(preset_in: PresetCreate, db: Session = Depends(get_db)):
    # Hardcoded user_id for now, can be extracted from auth later
    return preset_service.create_preset(db, preset_in, user_id="anonymous")

@router.get("", response_model=List[PresetResponse])
def list_presets(
    type: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: str = Query("name", regex="^(name|type|category|created_at)$"),
    order: str = Query("asc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    return preset_service.list_presets(
        db, 
        user_id="anonymous", 
        type=type, 
        category=category, 
        sort_by=sort_by, 
        order=order
    )

@router.get("/defaults", response_model=List[PresetResponse])
def get_defaults(db: Session = Depends(get_db)):
    return preset_service.get_default_presets(db)

@router.get("/{preset_id}", response_model=PresetResponse)
def get_preset(preset_id: UUID, db: Session = Depends(get_db)):
    db_preset = preset_service.get_preset(db, preset_id)
    if not db_preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return db_preset

@router.patch("/{preset_id}", response_model=PresetResponse)
def update_preset(preset_id: UUID, updates: PresetUpdate, db: Session = Depends(get_db)):
    db_preset = preset_service.get_preset(db, preset_id)
    if not db_preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    if db_preset.is_default:
        raise HTTPException(status_code=403, detail="Cannot update system presets")
        
    updated = preset_service.update_preset(db, preset_id, updates)
    return updated

@router.delete("/{preset_id}")
def delete_preset(preset_id: UUID, db: Session = Depends(get_db)):
    db_preset = preset_service.get_preset(db, preset_id)
    if not db_preset:
        raise HTTPException(status_code=404, detail="Preset not found")
        
    if db_preset.is_default:
        raise HTTPException(status_code=403, detail="Cannot delete system presets")
        
    preset_service.delete_preset(db, preset_id)
    return {"status": "deleted"}
