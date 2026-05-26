# RegNav Backend

FastAPI service that fronts the RegNav.AI agents, manages multi-tenant
data, and brokers LLM access via Azure Key Vault and Azure OpenAI.

## Status

Phase 0 — scaffold only. Provides:

- FastAPI app factory with structured logging
- Health and readiness probes
- Tenant context primitives (populated by JWT auth in Phase 1)
- Pydantic-based settings via environment / Azure Key Vault
- Docker image and Docker Compose target

The auth middleware, database layer, agent workers, and LLM routing
land in subsequent phases — see the architecture document for the
sequencing.

## Prerequisites

- Python 3.11 or 3.12
- Postgres 15+ with the `pgvector` extension
- Redis 7+

## Local setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Or with Docker Compose from the repo root:

```bash
docker compose up backend
```

## Commands

| Command | Purpose |
| --- | --- |
| `uvicorn app.main:app --reload` | Start the dev server on http://localhost:8000 |
| `pytest` | Run the test suite |
| `ruff check app tests` | Lint |
| `ruff format app tests` | Format |
| `mypy app` | Type-check |

## Project layout

```
app/
├── api/         # Versioned API routers (health, tenants, agents, ...)
├── core/        # Settings, logging, tenant context, auth helpers
├── db/          # SQLAlchemy models, RLS migrations
├── llm/         # Azure OpenAI client + credential resolution
├── agents/      # Agent worker entry points
└── services/    # Business logic services
```
