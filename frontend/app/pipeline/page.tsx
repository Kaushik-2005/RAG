"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

import { getDatasets, runPipeline, type DatasetSummary, type PipelineResponse } from "@/lib/api";

const chunkers = ["recursive", "character", "token", "markdown"] as const;
const vectorStores = ["faiss", "chroma"] as const;

export default function PipelinePage() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [query, setQuery] = useState("What is RAG and why does chunking matter?");
  const [chunker, setChunker] = useState<(typeof chunkers)[number]>("recursive");
  const [vectorStore, setVectorStore] = useState<(typeof vectorStores)[number]>("faiss");
  const [topK, setTopK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResponse | null>(null);

  useEffect(() => {
    getDatasets()
      .then((data) => {
        setDatasets(data.items);
        setSelectedDataset(data.items[0]?.id ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load datasets."));
  }, []);

  const selectedDatasetPreview = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDataset),
    [datasets, selectedDataset],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("query", query);
      formData.append("dataset_id", selectedDataset);
      formData.append("chunker", chunker);
      formData.append("vector_store", vectorStore);
      formData.append("top_k", String(topK));

      const response = await runPipeline(formData);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="hero card pipeline-hero">
        <div className="stack">
          <p className="eyebrow">Pipeline lab</p>
          <h1>Run an experiment and inspect every stage.</h1>
          <p className="lede">
            Pick a dataset, then compare how chunking and retrieval affect the final answer.
          </p>
        </div>
        <div className="pipeline-summary card stack">
          <p className="eyebrow">Current setup</p>
          <p><strong>Chunker:</strong> {chunker}</p>
          <p><strong>Vector store:</strong> {vectorStore}</p>
          <p><strong>Top-k:</strong> {topK}</p>
        </div>
      </section>

      <section className="grid two-up">
        <form className="card stack" onSubmit={handleSubmit}>
          <div className="section-head">
            <div>
              <p className="eyebrow">Run a trace</p>
              <h2>Query and controls</h2>
            </div>
            <span className="pill">Live backend</span>
          </div>

          <label className="field">
            <span>Dataset</span>
            <select value={selectedDataset} onChange={(event) => setSelectedDataset(event.target.value)}>
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Query</span>
            <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={4} />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Chunker</span>
              <select value={chunker} onChange={(event) => setChunker(event.target.value as typeof chunker)}>
                {chunkers.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Vector store</span>
              <select value={vectorStore} onChange={(event) => setVectorStore(event.target.value as typeof vectorStore)}>
                {vectorStores.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Top-k</span>
              <input
                type="number"
                min={1}
                max={8}
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
              />
            </label>
          </div>

          <button className="button" type="submit" disabled={loading}>
            {loading ? "Running..." : "Run pipeline"}
          </button>

          {error ? <p className="error">{error}</p> : null}
        </form>

        <section className="card stack">
          <div className="section-head">
            <div>
              <p className="eyebrow">Dataset preview</p>
              <h2>What the pipeline sees</h2>
            </div>
          </div>
          <p><strong>{selectedDatasetPreview?.name ?? "No dataset loaded"}</strong></p>
          <p>{selectedDatasetPreview?.description}</p>
          <p className="muted">{selectedDatasetPreview?.preview}</p>
          <div className="pill-row">
            <span className="pill">Recommended chunker: {selectedDatasetPreview?.recommended_chunker ?? "-"}</span>
            <span className="pill">Source: {selectedDatasetPreview?.source ?? "-"}</span>
          </div>
        </section>
      </section>

      {result ? (
        <>
          <section className="grid two-up">
            <article className="card stack">
              <h2>Retrieved chunks</h2>
              {result.retrieved_chunks.map((match) => (
                <div key={`${match.rank}-${match.chunk_index}`} className="result-row">
                  <div className="pill">Rank {match.rank}</div>
                  <div>
                    <strong>Chunk {match.chunk_index}</strong>
                    <p className="muted">Score: {match.score.toFixed(4)}</p>
                    <p>{match.text}</p>
                  </div>
                </div>
              ))}
            </article>

            <article className="card stack">
              <h2>Answer</h2>
              <p className="muted">Embedding provider: {result.embedding_provider} ({result.embedding_model})</p>
              <p className="muted">Vector store: {result.vector_store}</p>
              <p className="muted">LLM provider: {result.llm_provider}</p>
              <pre className="answer-box">{result.answer}</pre>
            </article>
          </section>

          <section className="grid two-up">
            <article className="card stack">
              <h2>Chunk visualization</h2>
              <div className="bars">
                {(result.visuals.chunk_lengths ?? []).map((length, index) => (
                  <div key={`${index}-${length}`} className="bar-row">
                    <span className="bar-label">{index + 1}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${Math.min(100, length)}%` }} />
                    </div>
                    <span className="bar-value">{length}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="card stack">
              <h2>Similarity scores</h2>
              <div className="bars">
                {(result.visuals.scores ?? []).map((score, index) => (
                  <div key={`${index}-${score}`} className="bar-row">
                    <span className="bar-label">{index + 1}</span>
                    <div className="bar-track">
                      <div className="bar-fill bar-fill-alt" style={{ width: `${Math.max(5, Math.min(100, score * 100))}%` }} />
                    </div>
                    <span className="bar-value">{Number(score).toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="card stack">
            <h2>Generated context</h2>
            <pre className="answer-box">{result.context}</pre>
          </section>
        </>
      ) : null}
    </main>
  );
}
