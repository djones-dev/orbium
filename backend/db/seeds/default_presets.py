from sqlalchemy.orm import Session
from db.models import Preset
import uuid

DEFAULT_PRESETS = [
    {
        "name": "Planet: Pure Sphere",
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
        "name": "Planet: Jagged Core",
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
        "name": "Planet: Soft Prism",
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
        "name": "Moon: Slow Orbital Pulse",
        "description": "Slow LFO modulation for evolving textures.",
        "type": "modulator",
        "category": "moon",
        "parameters": {
            "lfoRate": 0.5,
            "detuneSpread": 10
        }
    },
    {
        "name": "Moon: Rapid Shiver",
        "description": "Fast LFO rate for vibrating, energetic effects.",
        "type": "modulator",
        "category": "moon",
        "parameters": {
            "lfoRate": 8.0,
            "detuneSpread": 25
        }
    },
    {
        "name": "Effect: Atmospheric Sweep",
        "description": "Pushed filter resonant sweep for cinematic reveals.",
        "type": "effect",
        "category": "attribute",
        "parameters": {
            "filterCutoff": 400,
            "gainLevel": -3
        }
    },
    {
        "name": "Effect: Solar Flare",
        "description": "High distortion and noise for chaotic, gritty sounds.",
        "type": "effect",
        "category": "attribute",
        "parameters": {
            "distortion": 80,
            "noiseEnabled": True,
            "noiseVol": -20
        }
    },
    {
        "name": "Phenomenon: Comet",
        "description": "A body on a highly elliptical orbit that modifies the pitch of passing notes based on its velocity.",
        "type": "phenomenon",
        "category": "phenomenon",
        "parameters": {
            "phenomenonType": "comet",
            "zone": { "proximity": 2 }
        }
    },
    {
        "name": "Phenomenon: Pulsar",
        "description": "Emits a rotational beam that acts as a rhythmic gate for notes.",
        "type": "phenomenon",
        "category": "phenomenon",
        "parameters": {
            "phenomenonType": "pulsar",
            "properties": { "rotationSpeed": 0.5, "beamWidth": 0.2 }
        }
    },
    {
        "name": "Phenomenon: Lagrange Point",
        "description": "A gravitational anchor that quantizes the pitch of nearby notes to a scale.",
        "type": "phenomenon",
        "category": "phenomenon",
        "parameters": {
            "phenomenonType": "lagrange_point",
            "zone": { "proximity": 2 },
            "properties": { "scale": "minor", "root": 60 }
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
