# RAG Lab

RAG Lab is an open-source educational platform for learning retrieval-augmented generation.

The project is intentionally local-first and free-to-run by default:

- no mandatory paid APIs
- no mandatory cloud services
- no Docker requirement for local development
- free-tier external services are optional, not required

## Current status

Milestone 1 foundation is being scaffolded:

- FastAPI backend
- Next.js frontend
- shared API contract layer
- local run scripts
- docs and tooling

## Repository layout

- `backend/` — FastAPI application and tests
- `frontend/` — Next.js application
- `shared/` — shared contracts and types
- `docs/` — setup and architecture notes
- `scripts/` — local run helpers

## Local development

See `docs/setup.md` for the exact setup commands.
