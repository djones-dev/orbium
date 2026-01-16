import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .base import Base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://orbium:orbium_secret@db:5432/orbium_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models here so they registered with Base
    from . import models
    Base.metadata.create_all(bind=engine)
