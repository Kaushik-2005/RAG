# Architecture

## Core shape

`Next.js UI -> browser-side pipeline -> /api/generate -> Groq`

## What runs in the browser

- text splitting
- local embedding generation
- similarity scoring
- retrieval ranking
- 2D projection for charts
- prompt context assembly

## What runs on the server

- Groq chat completion call from the Next.js route handler

## Why this shape

- simple Vercel deployment
- no separate backend host
- no heavy Python or ML runtime in serverless functions
- keeps the educational pipeline interactive and easy to inspect