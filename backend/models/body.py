from pydantic import BaseModel
from typing import Optional, Dict, Any, Literal, List
from datetime import datetime
from uuid import UUID

class BodyInstanceBase(BaseModel):
    name: Optional[str] = None
    preset_id: Optional[str] = None
    type: Literal['sun', 'planet', 'moon']
    position: Dict[str, float] # { radius: float, angle: float }
    velocity: float = 0.0
    audio_params: Dict[str, Any]
    attributes: List[Dict[str, Any]] = []
    parent_id: Optional[str] = None

class BodyInstanceCreate(BodyInstanceBase):
    id: Optional[UUID] = None

class BodyInstanceUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[Dict[str, float]] = None
    velocity: Optional[float] = None
    audio_params: Optional[Dict[str, Any]] = None
    attributes: Optional[List[Dict[str, Any]]] = None
    parent_id: Optional[str] = None


class BodyInstanceResponse(BodyInstanceBase):
    id: UUID
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True
