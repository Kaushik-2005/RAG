# Local Setup

This project runs as a single Next.js app.

## Requirements

- Node.js 20+
- npm
- Groq API key

## Run locally

1. Change into `frontend/`.
2. Install dependencies with `npm install`.
3. Create `frontend/.env.local`.
4. Add:
   - `GROQ_API_KEY=your_key`
5. Start the app with `npm run dev`.

## Notes

- Chunking, embeddings, retrieval, and visualization run in the browser.
- Only final answer generation uses the server route at `/api/generate`.
- No Python backend or Docker setup is required.

## Deployment

Deploy `frontend/` to Vercel and add `GROQ_API_KEY` in the Vercel project environment variables.