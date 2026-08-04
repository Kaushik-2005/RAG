# Local Setup

This project runs as a single Next.js app from the repo root.

## Requirements

- Node.js 20+
- npm
- Groq API key

## Run locally

1. Install dependencies with `npm install`.
2. Create `.env.local` or `.env` at the repo root.
3. Add:
   - `GROQ_API_KEY=your_key`
4. Start the app with `npm run dev`.

## Notes

- Chunking, embeddings, retrieval, and visualization run in the browser.
- Only final answer generation uses the server route at `/api/generate`.
- No Python backend or Docker setup is required.

## Deployment

Deploy the repo root to Vercel and add `GROQ_API_KEY` in the Vercel project environment variables.