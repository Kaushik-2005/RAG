"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PipelineResponse } from "@/lib/api";
import { stageTabs } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];

type Props = {
  currentStage: StageMeta;
  loading: boolean;
  error: string | null;
  result: PipelineResponse | null;
  onRun: (event?: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function VectorIndexTab({ currentStage, loading, error, result, onRun }: Props) {
  const index = result?.vector_index;
  const previewRows = result?.chunks?.slice(0, 8).map((chunk, index) => ({
    slot: index,
    chunk: chunk.index + 1,
    start: chunk.start_char,
    end: chunk.end_char,
    dims: result?.chunk_embeddings?.[index]?.length ?? 0,
    words: chunk.word_count,
    preview: chunk.text.slice(0, 120),
  })) ?? [];

  const indexObject = index ?? {
    index_type: "flat-array",
    distance_metric: result?.vector_store ?? "cosine",
    vector_dimension: result?.embedding_dimension ?? 0,
    item_count: result?.chunks?.length ?? 0,
    build_notes: [],
  };

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>This stage is the handoff from representation to retrieval. The previous stage produced embeddings; this stage stores them in an indexed structure that search can score against.</p>
          <p>In this demo, the index is intentionally simple: one in-memory array entry per chunk, with its vector and chunk boundaries kept aligned by position.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={onRun}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">Rebuild the current vector index from the latest chunks and embeddings.</div>
            <Button type="submit" disabled={loading}>{loading ? "Building index..." : "Build index"}</Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Index type</div><div className="mt-2 text-lg font-semibold">{indexObject.index_type}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Distance metric</div><div className="mt-2 text-lg font-semibold uppercase">{indexObject.distance_metric}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Vector dimension</div><div className="mt-2 text-lg font-semibold">{indexObject.vector_dimension}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Indexed items</div><div className="mt-2 text-lg font-semibold">{indexObject.item_count}</div></div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">What this stage actually does</div>
          <ul className="space-y-2">
            <li>• Takes the chunk embeddings produced in the previous stage.</li>
            <li>• Stores them in a fixed array-like index where each slot maps to one chunk.</li>
            <li>• Preserves the link between vector position and chunk metadata such as boundaries and text.</li>
            <li>• Exposes a structure that Semantic Search can scan with cosine or dot-product scoring.</li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">Pipeline handoff</div>
          <p><span className="font-medium text-foreground">Text Splitting</span> creates chunks → <span className="font-medium text-foreground">Vector Embedding</span> converts each chunk into a vector → <span className="font-medium text-foreground">Vector Index</span> stores those vectors in retrievable slots → <span className="font-medium text-foreground">Semantic Search</span> compares the query vector against those stored slots.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-2">
            <label className="text-sm font-medium">Indexed entries</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                <div className="space-y-3">
                  {previewRows.length ? previewRows.map((row) => (
                    <article key={`${row.slot}-${row.start}`} className="rounded-2xl border border-border bg-muted/20 p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>Index slot {row.slot}</span>
                        <span>Chunk {row.chunk}</span>
                        <span>{row.dims} dims</span>
                        <span>{row.words} words</span>
                        <span>{row.start}-{row.end}</span>
                      </div>
                      <p className="mb-3 text-sm leading-relaxed text-foreground">{row.preview}{row.preview.length >= 120 ? "..." : ""}</p>
                      <pre className="rounded-xl border border-border bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">{`{
  slot: ${row.slot},
  chunk_index: ${row.chunk - 1},
  vector_dimension: ${row.dims},
  source_range: [${row.start}, ${row.end}]
}`}</pre>
                    </article>
                  )) : <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">Build the pipeline to inspect indexed entries.</div>}
                </div>
              </ScrollArea>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Why this is not retrieval yet</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• No user query has been embedded at this stage.</li>
                <li>• No similarity scores have been computed yet.</li>
                <li>• No top-k ranking has been applied yet.</li>
                <li>• This stage only prepares the searchable store.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Index build notes</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(indexObject.build_notes.length ? indexObject.build_notes : ["Run this stage to build the current vector index."]).map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">What Semantic Search reads next</p>
              <ul className="space-y-2">
                <li>• stored chunk vectors</li>
                <li>• chunk-to-slot alignment</li>
                <li>• the configured distance metric</li>
                <li>• the number of indexed candidates available for ranking</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Index object summary</div>
              <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{JSON.stringify(indexObject, null, 2)}</pre>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
