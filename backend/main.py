from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from contextlib import asynccontextmanager

from db.session import init_db, SessionLocal
from db.seeds.default_presets import seed_defaults
from routes import presets

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database
    init_db()
    # Seed defaults
    db = SessionLocal()
    try:
        seed_defaults(db)
    finally:
        db.close()
    yield

app = FastAPI(title="Orbium API", version="1.0.0", lifespan=lifespan)

# CORS configuration
origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(presets.router)
from routes import bodies
app.include_router(bodies.router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok", 
        "service": "orbium-backend",
        "database_url": os.getenv("DATABASE_URL", "not_set")[:15] + "..." # Masked for safety
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
