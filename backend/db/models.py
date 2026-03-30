import uuid
from sqlalchemy import Column, String, DateTime, JSON, Boolean, Index, Float
from sqlalchemy.types import Uuid
from sqlalchemy.sql import func
from .base import Base


class Preset(Base):
    __tablename__ = "presets"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String)
    type = Column(String, nullable=False) # generator, effect, modulator
    category = Column(String, nullable=False) # planet, moon, attribute, sun
    parameters = Column(JSON, nullable=False)
    user_id = Column(String, nullable=False, default="anonymous")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('ix_presets_user_id', 'user_id'),
        Index('ix_presets_type', 'type'),
        Index('ix_presets_category', 'category'),
    )

class BodyInstance(Base):
    __tablename__ = "bodies"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    preset_id = Column(String, nullable=True)
    type = Column(String, nullable=False)
    position = Column(JSON, nullable=False)
    velocity = Column(Float, nullable=False, default=0.0)
    audio_params = Column(JSON, nullable=False)
    attributes = Column(JSON, default=list)
    parent_id = Column(String, nullable=True)
    user_id = Column(String, nullable=False, default="anonymous")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('ix_bodies_user_id', 'user_id'),
    )
