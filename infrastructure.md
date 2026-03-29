# Infrastructure Overview

Orbium is a full-stack browser application composed of four containerised
services. All communication between services is internal — only port 80 is
exposed on the host.

---

## Service Map

```
Host port 80
      │
 ┌────▼────────────────────────────────────────────┐
 │  Nginx  (nginx:alpine)                          │
 │                                                  │
 │  /* ──────────────────→ frontend :5173 (dev)    │
 │                       → frontend :80   (prod)   │
 │  /api/* ──────────────→ backend  :8000           │
 └─────────────────────────────────────────────────┘
          │                        │
 ┌────────▼────────┐     ┌─────────▼────────┐
 │ Frontend        │     │ Backend          │
 │ React + Vite    │     │ FastAPI + Python  │
 │ Three.js / R3F  │     │                  │
 │ Web Audio API   │     │  └── /api/*      │
 └─────────────────┘     └─────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │ PostgreSQL :5432 │
                          │ (internal only)  │
                          └─────────────────┘
```

All four services share the `orbium-network` Docker bridge. The database port
is **not** mapped to the host.

---

## Services

### Frontend

| Property | Value |
|----------|-------|
| Image | `node:18-alpine` (dev) / `nginx:alpine` (prod) |
| Dev server | Vite on `:5173` with HMR over WebSocket |
| Prod build | `tsc && vite build` → static assets served by Nginx |
| Key env vars | `VITE_API_URL=/api` |

The frontend contains the entire real-time engine: Web Audio synthesis, Three.js
rendering, and the ECS simulation. Nothing latency-sensitive touches the network
at runtime.

### Backend

| Property | Value |
|----------|-------|
| Image | `python:3.11-slim` |
| Framework | FastAPI 0.109 with uvicorn |
| Port | `:8000` (internal) |
| Key env vars | `DATABASE_URL` |
| Startup | `init_db()` + `seed_defaults()` run in FastAPI lifespan |

Handles non-real-time operations only: preset storage, scene persistence, and
future user accounts.

### Database

| Property | Value |
|----------|-------|
| Image | `postgres:15-alpine` |
| Port | `:5432` (internal) |
| Data | Named volume `postgres_data` |
| Key env vars | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` |

Schema is managed by SQLAlchemy models and (once Phase 1 lands) Alembic
migrations. Default presets are seeded automatically on first boot.

### Nginx

| Property | Value |
|----------|-------|
| Image | `nginx:alpine` |
| Host port | `:80` |
| Config | `nginx/nginx.conf` (dev), `nginx/nginx-production.conf` (prod) |

Routes `/api/*` to the backend and everything else to the frontend. WebSocket
upgrade headers are set for Vite HMR in development.

---

## Development Setup

**Prerequisites**: Docker Engine 20.10+, Docker Compose 2.0+

```bash
git clone https://github.com/djones-dev/orbium.git
cd orbium

# Full stack (all services)
docker-compose up --build

# Frontend only (fastest for UI work)
cd frontend && npm install && npm run dev

# Backend only
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
```

| URL | Service |
|-----|---------|
| `http://localhost` | Full application (via Nginx) |
| `http://localhost:5173` | Frontend dev server (direct) |
| `http://localhost:8000` | Backend API (direct) |
| `http://localhost:8000/api/health` | Health check |
| `http://localhost:8000/docs` | FastAPI auto-docs (Swagger) |

---

## Environment Configuration

Copy `.env.example` to `.env` and fill in values before running any Docker
commands. The `.env` file is git-ignored.

```bash
cp .env.example .env
```

Key variables:

| Variable | Used By | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | db, backend | Database username |
| `POSTGRES_PASSWORD` | db, backend | Database password |
| `POSTGRES_DB` | db, backend | Database name |
| `DATABASE_URL` | backend | Full SQLAlchemy connection string |
| `VITE_API_URL` | frontend | API base path (default `/api`) |
| `BACKEND_ENV` | backend | `development` or `production` |

---

## Production Deployment

Use the production compose file, which replaces dev servers with optimised
multi-stage builds.

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Apply database migrations
docker-compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify
curl http://localhost/api/health
```

Production differences from development:

| Concern | Development | Production |
|---------|-------------|------------|
| Frontend serving | Vite dev server | Nginx static files |
| Backend reload | `--reload` enabled | Reload disabled |
| Docker images | Single-stage | Multi-stage (smaller) |
| Credentials | From `.env` | From `.env` (same, but rotate passwords) |
| Nginx config | `nginx.conf` | `nginx-production.conf` (timeouts, security headers) |

---

## Database Management

```bash
# Create a new migration after changing db/models.py
docker-compose exec backend alembic revision --autogenerate -m "describe change"

# Apply pending migrations
docker-compose exec backend alembic upgrade head

# Roll back one step
docker-compose exec backend alembic downgrade -1

# Backup
docker-compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql

# Restore
docker-compose exec -T db psql -U $POSTGRES_USER $POSTGRES_DB < backup.sql
```

---

## Running Tests

### Frontend

```bash
cd frontend
npm test                         # All tests (watch mode)
npm test -- --run                # Single pass
npm test -- path/to/test.ts      # Single file
```

### Backend

```bash
cd backend
pip install pytest httpx
pytest                           # All tests
pytest tests/test_bodies.py      # Single file
pytest -v -k "test_creates"      # By name pattern
```

Backend tests use an in-memory SQLite database — no live PostgreSQL required.

---

## Architecture Evolution

Orbium is undergoing a planned migration to an **Entity Component System (ECS)**
architecture. The migration is phased to avoid breaking changes.

### Current (Object-Oriented)

```
OrbitalBody (monolithic)
├── position + velocity      ← physics in useFrame
├── audioParams              ← drives SunLayer directly
└── visualConfig             ← read by Three.js mesh
```

### Target (ECS)

```
Entity (id only)
├── PositionComponent   { radius, angle }
├── VelocityComponent   { angular, radial }
├── AudioComponent      { layerId, parameters }
├── VisualComponent     { color, size, shaderUniforms }
├── PhysicsComponent    { mass, forces, damping }
├── HierarchyComponent  { parentId, childrenIds }
└── ModulationComponent { routes[] }

Systems (operate on component queries each frame)
├── HierarchySystem  (priority  50) — parent-child positions
├── PhysicsSystem    (priority  90) — forces → velocity
├── MovementSystem   (priority 100) — velocity → position
├── CollisionSystem  (priority 150) — proximity events
├── AudioSystem      (priority 200) — sync audio layers
├── ModulationSystem (priority 250) — route modulation
└── RenderSystem     (priority 300) — prepare Three.js data
```

The `EventBus` replaces constructor callbacks between `AudioEngine` and
`OrbitalBodiesManager`. An adapter layer maintains backward compatibility
through the transition and is removed in the final phase.

See `docs/architecture/CURRENT_STATE.md` for a snapshot of the pre-migration
architecture and known issues being addressed.

---

## Health & Observability

```bash
# Service health (includes DB connectivity check)
GET /api/health
→ { "status": "ok" | "degraded", "service": "orbium-backend", "database": "healthy" | "unhealthy: ..." }

# Container status
docker-compose ps

# Logs
docker-compose logs -f           # All services
docker-compose logs -f backend   # Single service
docker-compose logs --tail=100 backend
```

---

## Security Notes

- Never commit `.env` — it is git-ignored
- Rotate `POSTGRES_PASSWORD` before any public deployment
- The database port is not exposed on the host
- CORS is restricted to `localhost:5173` and `localhost:8080` in development;
  update `backend/main.py` `origins` list for production domains
- Default presets are protected from update/delete via API
