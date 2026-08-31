"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PipelineResponse } from "@/lib/api";
import LowVectorVisualization from "./low-vector-visualization";
import { embeddingOptions, type EmbeddingValue, stageTabs } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];
type Point = { x: number; y: number; label: string; chunk: number };

const previewVector = (vector: number[], limit = 8) => {
  const informative = vector.filter((value) => Math.abs(value) > 1e-8);
  const sample = (informative.length ? informative : vector).slice(0, limit);
  return `[${sample.map((value) => Number(value).toFixed(4)).join(", ")}${(informative.length ? informative : vector).length > limit ? ", ..." : ""}]`;
};

type Props = {
  currentStage: StageMeta;
  embeddingModel: EmbeddingValue;
  setEmbeddingModel: (value: EmbeddingValue) => void;
  loading: boolean;
  error: string | null;
  result: PipelineResponse | null;
  points: Point[];
  activeDocumentId: string;
  onRun: (event?: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function EmbeddingTab({ currentStage, embeddingModel, setEmbeddingModel, loading, error, result, points, activeDocumentId, onRun }: Props) {
  const activeRows = useMemo(() => {
    if (!result?.chunks?.length || !result?.chunk_embeddings?.length) return [] as Array<{ chunk: PipelineResponse["chunks"][number]; vector: number[] }>;
    return result.chunks.map((chunk, index) => ({ chunk, vector: result.chunk_embeddings[index] })).filter((row) => row.chunk.document_id === activeDocumentId && row.vector);
  }, [activeDocumentId, result]);

  return (
    <Card className="border-0 bg-transparent shadow-none rounded-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>Embedding models convert chunk text into numerical vectors so retrieval can compare meaning instead of exact wording.</p>
          <p>This view focuses on the active document, while the same embedding choice is applied to the full corpus during indexing and search.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={onRun}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Embedding Model:</span>
              <Select value={embeddingModel} onValueChange={(value) => setEmbeddingModel(value as EmbeddingValue)}>
                <SelectTrigger className="w-[400px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {embeddingOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading}>{loading ? "Updating embeddings..." : "Update embeddings"}</Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><span className="text-sm font-medium">{loading ? "Loading model..." : "Model loaded"}</span><span className="text-green-500">✓</span></div>
            <span className="text-sm text-muted-foreground">{result?.embedding_dimension ?? 0} dims</span>
          </div>
          {loading ? <Progress value={72} className="w-full" /> : null}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Provider: {result?.embedding_backend ?? "—"}</span>
            <span>Model: {result?.embedding_model ?? embeddingModel}</span>
            <span>Corpus chunks encoded: {result?.chunks.length ?? 0}</span>
            <span>Active document chunks shown: {activeRows.length}</span>
          </div>
        </div>

        {points.length > 0 ? <div className="embed-top-grid"><section className="embed-chart-panel"><LowVectorVisualization data={points.map((point) => ({ x: point.x, y: point.y, title: point.label }))} title="Chunk Embedding Space" datasetLabel="Chunks" className="h-[400px]" /></section><section className="embed-notes-panel"><div className="embed-notes-text embed-notes-card"><p>This visualization uses UMAP to reduce the active document chunk embeddings into 2D so you can compare their relative positions.</p><p><strong>Important notes:</strong></p><ul className="embed-notes-list"><li>The visualization is approximate. Distances in 2D do not exactly match the original high-dimensional similarities.</li><li>The same embeddings may appear slightly differently across runs depending on the projection.</li><li>This view isolates the active document for readability even though later retrieval uses the full indexed corpus.</li></ul></div></section></div> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="space-y-2"><label className="embed-section-label">Active document chunks</label><div className="embed-list-frame"><ScrollArea className="h-[560px] p-4"><div className="embed-scroll-list">{activeRows.length ? activeRows.map(({ chunk }) => <article key={`${chunk.document_id}-${chunk.document_chunk_index}`} className="embed-chunk-item"><p>{chunk.text}</p><p className="embed-vector-meta">{chunk.document_title} • Chunk {chunk.document_chunk_index + 1} • {chunk.char_count} characters</p></article>) : <div className="flex h-full min-h-[320px] items-center justify-center text-muted-foreground">Run the pipeline to inspect chunk embeddings.</div>}</div></ScrollArea></div></section>
          <section className="space-y-2"><label className="embed-section-label">Active document embedding vectors</label><div className="embed-list-frame"><ScrollArea className="h-[560px] p-4"><div className="embed-scroll-list">{activeRows.length ? activeRows.map(({ chunk, vector }) => <article key={`${chunk.document_id}-${chunk.document_chunk_index}-vector`} className="embed-vector-item"><pre className="embed-vector-preview">{previewVector(vector)}</pre><p className="embed-vector-meta">{chunk.document_title} • Chunk {chunk.document_chunk_index + 1} • {vector.length} dimensions</p></article>) : <div className="flex h-full min-h-[320px] items-center justify-center text-muted-foreground">No chunks to embed.</div>}</div></ScrollArea></div></section>
        </div>
      </CardContent>
    </Card>
  );
}
