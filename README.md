# RAG Lab

RAG Lab is an educational RAG playground inspired by RAG Play.

The app now runs with a frontend-first architecture:

- Next.js UI and browser-side pipeline logic
- browser-side chunking, embeddings, and similarity search
- a small Next.js server route for Groq generation
- Vercel-friendly deployment with no separate backend required

## Current architecture

- `app/` — Next.js routes and pages
- `components/` — shared UI components
- `lib/` — browser-side pipeline logic and client utilities
- `docs/` — setup and architecture notes
- `scripts/` — local helpers
- `shared/` — shared project assets if needed later

## Environment

For local development and Vercel deployment, set:

- `GROQ_API_KEY`

## Local development

See `docs/setup.md`.