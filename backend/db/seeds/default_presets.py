from sqlalchemy.orm import Session
from db.models import Preset
import uuid

DEFAULT_PRESETS = [
    {
        "name": "Pure Sphere",
        "description": "Clean sine wave generator for smooth, melodic layers.",
        "type": "generator",
        "category": "planet",
        "parameters": {
            "waveform": "sine",
            "filterCutoff": 20000,
            "distortion": 0,
            "gainLevel": -6
        }
    },
    {
        "name": "Jagged Core",
        "description": "Aggressive sawtooth wave for rich harmonics and presence.",
        "type": "generator",
        "category": "planet",
        "parameters": {
            "waveform": "sawtooth",
            "filterCutoff": 5000,
            "distortion": 10,
            "gainLevel": -12
        }
    },
    {
        "name": "Soft Prism",
        "description": "Mellow triangle wave with a gentle character.",
        "type": "generator",
        "category": "planet",
        "parameters": {
            "waveform": "triangle",
            "filterCutoff": 8000,
            "distortion": 0,
            "gainLevel": -9
        }
    },
    {
        "name": "Slow Orbital Pulse",
        "description": "Slow LFO modulation for evolving textures.",
        "type": "modulator",
        "category": "moon",
        "parameters": {
            "lfoRate": 0.5,
            "detuneSpread": 10
        }
    },
    {
        "name": "Rapid Shiver",
        "description": "Fast LFO rate for vibrating, energetic effects.",
        "type": "modulator",
        "category": "moon",
        "parameters": {
            "lfoRate": 8.0,
            "detuneSpread": 25
        }
    },
    {
        "name": "Atmospheric Sweep",
        "description": "Pushed filter resonant sweep for cinematic reveals.",
        "type": "effect",
        "category": "attribute",
        "parameters": {
            "filterCutoff": 400,
            "gainLevel": -3
        }
    },
    {
        "name": "Solar Flare",
        "description": "High distortion and noise for chaotic, gritty sounds.",
        "type": "effect",
        "category": "attribute",
        "parameters": {
            "distortion": 80,
            "noiseEnabled": True,
            "noiseVol": -20
        }
    }
]

def seed_defaults(db: Session):
    for p_data in DEFAULT_PRESETS:
        # Check if already exists
        exists = db.query(Preset).filter(Preset.name == p_data["name"], Preset.is_default == True).first()
        if not exists:
            preset = Preset(
                **p_data,
                user_id="system",
                is_default=True
            )
            db.add(preset)
    db.commit()
