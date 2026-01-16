from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime
from uuid import UUID

class PresetBase(BaseModel):
    name: str
    description: str
    type: Literal['generator', 'effect', 'modulator']
    category: Literal['planet', 'moon', 'attribute', 'sun']
    parameters: Dict[str, Any]

class PresetCreate(PresetBase):
    pass

class PresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[Literal['generator', 'effect', 'modulator']] = None
    category: Optional[Literal['planet', 'moon', 'attribute', 'sun']] = None
    parameters: Optional[Dict[str, Any]] = None

class PresetResponse(PresetBase):
    id: UUID
    user_id: str
    is_default: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
