import Link from "next/link";

const stages = [
  {
    title: "1. Load",
    text: "Read a built-in dataset from the catalog.",
    detail: "This is where raw content becomes a document the pipeline can reason about.",
  },
  {
    title: "2. Chunk",
    text: "Split the document into smaller units with the selected chunking strategy.",
    detail: "Chunking is the first place where design choices affect downstream retrieval quality.",
  },
  {
    title: "3. Embed",
    text: "Convert each chunk into vectors that reflect semantic meaning.",
    detail: "Similarity is computed in vector space, not with simple keyword matching.",
  },
  {
    title: "4. Retrieve",
    text: "Rank the most relevant chunks for the user query.",
    detail: "This stage determines what context reaches the answer generator.",
  },
  {
    title: "5. Generate",
    text: "Combine query and context into a grounded response.",
    detail: "The model should explain the answer using the retrieved evidence.",
  },
];

const teachingPoints = [
  {
    title: "Why chunk size matters",
    text: "Small chunks improve precision. Larger chunks preserve more context. The right balance depends on the corpus.",
  },
  {
    title: "Why embeddings matter",
    text: "Embeddings let the system compare meaning instead of exact text overlap.",
  },
  {
    title: "Why retrieval matters",
    text: "Good retrieval keeps the prompt grounded and limits hallucination risk.",
  },
];

export default function LearnPage() {
  return (
    <main>
      <section className="hero card learn-hero">
        <div className="stack">
          <p className="eyebrow">Learn page</p>
          <h1>Understand the pipeline in the same order the system uses it.</h1>
          <p className="lede">
            The goal here is explanation first: every stage is shown separately so learners can connect the UI to the backend behavior.
          </p>
        </div>
        <div className="hero-links">
          <Link href="/pipeline" className="button">
            Try the pipeline
          </Link>
        </div>
      </section>

      <section className="grid two-up">
        {stages.map((stage) => (
          <article key={stage.title} className="card stack">
            <p className="eyebrow">Pipeline stage</p>
            <h2>{stage.title}</h2>
            <p>{stage.text}</p>
            <p className="muted">{stage.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid three-up">
        {teachingPoints.map((item) => (
          <article key={item.title} className="card stack note-card">
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="card stack">
        <div className="section-head">
          <div>
            <p className="eyebrow">Free-first stack</p>
            <h2>Milestone 2 stays runnable without paid infrastructure.</h2>
          </div>
          <Link href="/pipeline" className="button button-secondary">
            Open pipeline lab
          </Link>
        </div>
        <ul className="list">
          <li>Groq generates answers when GROQ_API_KEY is configured</li>
          <li>Fallback text keeps the app usable if the API key is absent</li>
          <li>The rest of the flow stays local and explainable</li>
        </ul>
      </section>
    </main>
  );
}
