from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional, Dict, Any
from uuid import UUID
from db.models import Preset
from models.preset import PresetCreate, PresetUpdate

def get_preset(db: Session, preset_id: UUID) -> Optional[Preset]:
    return db.query(Preset).filter(Preset.id == preset_id).first()

def list_presets(
    db: Session, 
    user_id: str = "anonymous", 
    type: Optional[str] = None, 
    category: Optional[str] = None,
    sort_by: str = "name",
    order: str = "asc"
) -> List[Preset]:
    # Include both user's presets and default presets
    query = db.query(Preset).filter(
        or_(Preset.user_id == user_id, Preset.is_default == True)
    )
    
    if type:
        query = query.filter(Preset.type == type)
    if category:
        query = query.filter(Preset.category == category)
        
    # Handle sorting
    column = getattr(Preset, sort_by, Preset.name)
    if order.lower() == "desc":
        query = query.order_by(column.desc())
    else:
        query = query.order_by(column.asc())
        
    return query.all()

def create_preset(db: Session, preset_in: PresetCreate, user_id: str = "anonymous") -> Preset:
    db_preset = Preset(
        **preset_in.model_dump(),
        user_id=user_id,
        is_default=False
    )
    db.add(db_preset)
    db.commit()
    db.refresh(db_preset)
    return db_preset

def update_preset(db: Session, preset_id: UUID, updates: PresetUpdate) -> Optional[Preset]:
    db_preset = get_preset(db, preset_id)
    if not db_preset:
        return None
    
    # Don't allow updating default presets
    if db_preset.is_default:
        return None
        
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_preset, key, value)
        
    db.commit()
    db.refresh(db_preset)
    return db_preset

def delete_preset(db: Session, preset_id: UUID) -> bool:
    db_preset = get_preset(db, preset_id)
    if not db_preset:
        return False
        
    # Don't allow deleting default presets
    if db_preset.is_default:
        return False
        
    db.delete(db_preset)
    db.commit()
    return True

def get_default_presets(db: Session) -> List[Preset]:
    return db.query(Preset).filter(Preset.is_default == True).all()
