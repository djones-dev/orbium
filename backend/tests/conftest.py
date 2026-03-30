"""
Shared pytest fixtures for backend API integration tests.
Uses an in-memory SQLite database so no live PostgreSQL instance is required.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db.base import Base
from db.session import get_db
from db.seeds.default_presets import seed_defaults
from main import app

SQLITE_URL = "sqlite:///./test.db"

engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_defaults(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


# ── Reusable payload factories ────────────────────────────────────────────────

def body_payload(**overrides) -> dict:
    base = {
        "type": "planet",
        "position": {"radius": 5.0, "angle": 1.0},
        "velocity": 0.2,
        "audio_params": {
            "rootFrequency": 110,
            "filterCutoff": 1000,
            "filterResonance": 1.0,
            "detuneSpread": 10,
            "lfoRate": 0.5,
            "gainLevel": -12,
            "waveform": "sine",
            "distortion": 0,
            "noiseVol": -40,
            "subVol": -12,
            "noiseEnabled": True,
            "subEnabled": True,
        },
        "attributes": [],
    }
    base.update(overrides)
    return base


def preset_payload(**overrides) -> dict:
    base = {
        "name": "Test Preset",
        "description": "A preset for testing",
        "type": "generator",
        "category": "planet",
        "parameters": {
            "rootFrequency": 220,
            "filterCutoff": 2000,
            "gainLevel": -8,
            "waveform": "triangle",
        },
    }
    base.update(overrides)
    return base
