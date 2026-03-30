# Infrastructure Guide

This document describes the Orbium service topology, development setup, and deployment workflows.

## Architecture Overview

Orbium is a containerized full-stack application consisting of four primary services.

```
       [ Internet ]
            │
            ▼
      ┌─────────────┐
      │    Nginx    │ (Port 80)
      │  Reverse    │
      │  Proxy      │
      └─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌────────┐      ┌────────┐      ┌────────┐
│ Frontend│      │ Backend│◄────►│ Postgre│
│ (Vite/ │      │(FastAPI│      │  SQL   │
│ React) │      │ Python)│      └────────┘
└────────┘      └────────┘
```

All services communicate over an internal Docker bridge network named `orbium-network`.

## Service Details

### 1. Nginx (`nginx`)
- **Role**: Entry point for all traffic. Proxies `/api/*` to the backend and all other requests to the frontend.
- **Image**: `nginx:alpine`
- **Exposed Ports**: 80 (Host) → 80 (Container)
- **Configuration**:
  - Development: `nginx/nginx.conf` (Proxies to Vite dev server)
  - Production: `nginx/nginx-production.conf` (Serves static assets via frontend container)

### 2. Frontend (`frontend`)
- **Role**: React single-page application (SPA).
- **Image**: 
  - Development: Node.js 18 + Vite (supports HMR)
  - Production: Multi-stage build (Node builder → Nginx runtime)
- **Port**: 5173 (Dev only, not exposed to host)
- **Health Check**: `wget --spider http://localhost:5173`

### 3. Backend (`backend`)
- **Role**: FastAPI REST API providing preset management and body persistence.
- **Image**:
  - Development: Python 3.11-slim (with hot-reload)
  - Production: Multi-stage build (Python builder → slim runtime, 2 Gunicorn workers)
- **Port**: 8000 (Not exposed to host)
- **Health Check**: `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"`

### 4. Database (`db`)
- **Role**: Relational storage for presets and celestial bodies.
- **Image**: `postgres:15-alpine`
- **Port**: 5432 (Not exposed to host)
- **Health Check**: `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}`

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd orbium
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env to set your local database credentials if needed.
   ```

3. **Launch the stack**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - Web UI: `http://localhost`
   - API Docs: `http://localhost/api/docs` (Swagger)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `orbium` |
| `POSTGRES_PASSWORD` | Database password | `change_me_in_production` |
| `POSTGRES_DB` | Database name | `orbium_db` |
| `DATABASE_URL` | SQLAlchemy connection string | `postgresql://${USER}:${PASS}@db:5432/${DB}` |
| `BACKEND_ENV` | `development` or `production` | `development` |
| `VITE_API_URL` | API base path for frontend | `/api` |
| `VITE_ENV` | `development` or `production` | `development` |
| `NGINX_PORT` | Host port for Nginx | `80` |
| `CORS_ORIGINS` | (Prod only) Allowed CORS origins | `http://localhost` |

## Production Deployment

Orbium uses a separate Compose file for production-optimized builds.

1. **Build and start**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

2. **Run migrations**:
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
   ```

3. **Verify health**:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

## Database Migrations

Orbium uses **Alembic** for backend database migrations.

- **Create a new migration**:
  ```bash
  docker-compose run --rm backend alembic revision --autogenerate -m "description"
  ```
- **Apply migrations**:
  ```bash
  docker-compose run --rm backend alembic upgrade head
  ```
- **Rollback one step**:
  ```bash
  docker-compose run --rm backend alembic downgrade -1
  ```

## Troubleshooting

- **Database connection failures**: Ensure `DATABASE_URL` matches the `POSTGRES_*` variables and the service name is `db`.
- **HMR not working**: Ensure `CHOKIDAR_USEPOLLING=true` is set in the frontend service if using Docker on Windows or macOS.
- **Permission errors on Linux**: If `postgres_data` volume creation fails, ensure the Docker user has write permissions to the project directory.
- **Frontend build fails**: Check for TypeScript errors using `npm run build` locally before building the Docker image.
