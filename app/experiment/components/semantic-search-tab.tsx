"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import LowVectorVisualization from "./low-vector-visualization";
import type { PipelineResponse } from "@/lib/api";
import { type VectorStoreValue, vectorStoreOptions, stageTabs } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];
type Point = { x: number; y: number; label: string; chunk: number };

const previewVector = (vector: number[], limit = 8) => {
  const informative = vector.filter((value) => Math.abs(value) > 1e-8);
  const sample = (informative.length ? informative : vector).slice(0, limit);
  return `[${sample.map((value) => Number(value).toFixed(4)).join(", ")}${(informative.length ? informative : vector).length > limit ? ", ..." : ""}]`;
};

type Props = {
  currentStage: StageMeta;
  query: string;
  setQuery: (value: string) => void;
  vectorStore: VectorStoreValue;
  setVectorStore: (value: VectorStoreValue) => void;
  topK: number;
  setTopK: (value: number) => void;
  loading: boolean;
  error: string | null;
  result: PipelineResponse | null;
  points: Point[];
  queryPoint: { x: number; y: number } | null;
  onRun: (event?: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function SemanticSearchTab({ currentStage, query, setQuery, vectorStore, setVectorStore, topK, setTopK, loading, error, result, points, queryPoint, onRun }: Props) {
  return (
    <Card className="border-0 bg-transparent shadow-none rounded-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={onRun}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ask a question to find similar content:</label>
            <Textarea value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-[80px]" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Vector Store:</span>
              <Select value={vectorStore} onValueChange={(value) => setVectorStore(value as VectorStoreValue)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vectorStoreOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><span className="text-sm font-medium">Top-k:</span><Input type="number" min={1} max={8} value={topK} onChange={(event) => setTopK(Number(event.target.value))} className="w-24" /></div>
            <Button type="submit" disabled={loading}>{loading ? "Searching..." : "Run search"}</Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <section className="search-query-panel"><label className="search-section-label">Question embedding</label><pre className="search-embedding-preview">{result?.query_embedding?.length ? previewVector(result.query_embedding) : "Run the search to generate a query embedding."}</pre><p className="embed-vector-meta">Question embedding • {result?.query_embedding?.length ?? 0} dimensions</p></section>

        {points.length > 0 ? <div className="search-top-grid"><section className="search-chart-panel"><LowVectorVisualization data={points.map((point) => ({ x: point.x, y: point.y, title: point.label }))} query={queryPoint ? { x: queryPoint.x, y: queryPoint.y, title: "Question" } : undefined} title="Query Similarity" datasetLabel="Chunks" queryLabel="Question" className="h-[400px]" neighborCount={topK} /></section><section className="search-notes-panel"><div className="search-notes-card"><p>The query is embedded with the same model as the knowledge-base chunks, then ranked by vector similarity.</p><p>This separates indexing from retrieval: chunk embeddings are prepared first, while query embedding and similarity scoring happen when a question is asked.</p><p>The chart is computed from the raw query embedding and chunk embeddings together, then projected into the same 2D space.</p><div className="pipeline-metadata search-meta"><span>Vector store: {result?.vector_store ?? vectorStore}</span><span>Backend: {result?.vector_store_backend ?? "—"}</span><span>Embedding model: {result?.embedding_model ?? "—"}</span><span>Top-k: {result?.top_k ?? topK}</span></div></div></section></div> : null}

        <section className="search-results-panel"><label className="search-section-label">Similar Chunks:</label><div className="search-results-frame"><ScrollArea className="h-[560px] p-4"><div className="search-results-list">{result?.retrieved_chunks?.length ? result.retrieved_chunks.map((match) => <article key={`${match.rank}-${match.chunk_index}`} className="search-result-item"><p>{match.text}</p><p className="embed-vector-meta">Chunk {match.chunk_index + 1} • Similarity: {match.score.toFixed(4)} • Rank {match.rank}</p></article>) : <div className="flex h-full min-h-[320px] items-center justify-center text-muted-foreground">Ask a question to see similar chunks.</div>}</div></ScrollArea></div></section>
      </CardContent>
    </Card>
  );
}


