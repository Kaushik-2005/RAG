import Link from "next/link";

import { getContracts, getHealth } from "@/lib/api";

type HealthData = Awaited<ReturnType<typeof getHealth>>;
type ContractsData = Awaited<ReturnType<typeof getContracts>>;

const capabilityCards = [
  {
    title: "Text Splitting",
    description: "Split documents into meaningful chunks while keeping the surrounding context easy to inspect.",
    hint: "Character, recursive, token, and markdown chunking",
  },
  {
    title: "Vector Embedding",
    description: "Turn text into vectors so the app can compare meaning instead of just keywords.",
    hint: "Free lightweight embedding path by default",
  },
  {
    title: "Semantic Search",
    description: "Rank chunks by relevance and show why the most similar context was chosen.",
    hint: "FAISS-style and cosine retrieval views",
  },
  {
    title: "Context Generation",
    description: "Combine retrieved chunks with the query to produce a grounded answer trace.",
    hint: "Groq-backed generation with template fallback",
  },
];

export default async function HomePage() {
  let health: HealthData | undefined;
  let contracts: ContractsData | undefined;
  let error: string | null = null;

  try {
    [health, contracts] = await Promise.all([getHealth(), getContracts()]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unable to reach the backend.";
  }

  return (
    <main>
      <section className="hero card hero-grid">
        <div className="stack hero-copy">
          <p className="eyebrow">Interactive RAG Playground</p>
          <h1>Debug, visualize, and understand every stage of RAG.</h1>
          <p className="lede">
            Learn how documents are loaded, split, embedded, searched, and used to generate grounded answers.
            The UI is structured around the core educational flow from RAG Play, but stays aligned with our
            Python backend and free-first execution model.
          </p>
          <div className="hero-links">
            <Link href="/pipeline" className="button">
              Start experiment
            </Link>
            <Link href="/learn" className="button button-secondary">
              Explore the pipeline
            </Link>
          </div>
        </div>

        <div className="hero-panel stack">
          <div className="stat-card">
            <span className="stat-label">Backend</span>
            <strong>{error ? "offline" : health?.status ?? "loading"}</strong>
            <p>{error ? error : `${health?.app_name ?? "RAG Lab API"} · ${health?.version ?? "0.2.0"}`}</p>
          </div>
          <div className="stat-card">
            <span className="stat-label">Pipeline modes</span>
            <strong>Load → Chunk → Embed → Retrieve → Generate</strong>
            <p>Every stage is surfaced separately so the flow is easy to teach and inspect.</p>
          </div>
        </div>
      </section>

      <section className="grid four-up">
        {capabilityCards.map((card) => (
          <article key={card.title} className="card stack feature-card">
            <p className="eyebrow">Core stage</p>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <p className="muted">{card.hint}</p>
          </article>
        ))}
      </section>

      <section className="grid two-up">
        <article className="card stack">
          <p className="eyebrow">What is working now</p>
          <h2>Foundation features</h2>
          <ul className="list">
            <li>Built-in demo datasets</li>
            <li>Chunking strategies: character, recursive, token, markdown</li>
            <li>Retrieval with FAISS or cosine fallback</li>
            <li>Groq-backed answer generation with template fallback</li>
            <li>Step-by-step educational pages</li>
          </ul>
        </article>
        <article className="card stack">
          <p className="eyebrow">API contract</p>
          <h2>Available endpoints</h2>
          <ul className="list">
            {contracts?.endpoints.map((endpoint) => (
              <li key={`${endpoint.method}-${endpoint.path}`}>
                <strong>{endpoint.method}</strong> {endpoint.path} — {endpoint.purpose}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card stack">
        <div className="section-head">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Open the guided pipeline lab</h2>
          </div>
          <Link href="/pipeline" className="button">
            Open pipeline
          </Link>
        </div>
        <p className="muted">
          Use the pipeline page to select a dataset, run a query, and inspect the retrieved context.
        </p>
      </section>
    </main>
  );
}
