from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from db.models import BodyInstance
from models.body import BodyInstanceCreate, BodyInstanceUpdate

def get_body(db: Session, body_id: UUID) -> Optional[BodyInstance]:
    return db.query(BodyInstance).filter(BodyInstance.id == body_id).first()

def list_bodies(db: Session, user_id: str = "anonymous") -> List[BodyInstance]:
    return db.query(BodyInstance).filter(BodyInstance.user_id == user_id).all()

def create_body(db: Session, body_in: BodyInstanceCreate, user_id: str = "anonymous") -> BodyInstance:
    data = body_in.model_dump()
    if body_in.id:
        data['id'] = body_in.id
    
    db_body = BodyInstance(
        **data,
        user_id=user_id
    )
    db.add(db_body)
    db.commit()
    db.refresh(db_body)
    return db_body

def update_body(db: Session, body_id: UUID, updates: BodyInstanceUpdate) -> Optional[BodyInstance]:
    db_body = get_body(db, body_id)
    if not db_body:
        return None
        
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_body, key, value)
        
    db.commit()
    db.refresh(db_body)
    return db_body

def delete_body(db: Session, body_id: UUID) -> bool:
    db_body = get_body(db, body_id)
    if not db_body:
        return False
        
    db.delete(db_body)
    db.commit()
    return True

def add_attribute(db: Session, body_id: UUID, attribute: dict) -> Optional[BodyInstance]:
    db_body = get_body(db, body_id)
    if not db_body:
        return None
    
    current_attrs = list(db_body.attributes) if db_body.attributes else []
    current_attrs.append(attribute)
    db_body.attributes = current_attrs
    
    db.commit()
    db.refresh(db_body)
    return db_body
