"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { PipelineResponse } from "@/lib/api";
import { stageTabs } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];

type Props = {
  currentStage: StageMeta;
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
  error: string | null;
  result: PipelineResponse | null;
  onRun: (event?: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function QueryProcessingTab({ currentStage, query, setQuery, loading, error, result, onRun }: Props) {
  const processed = result?.query_processing;

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>This stage happens before embedding. The system first decides what exact query text should move forward into retrieval.</p>
          <p>In production pipelines this can grow into rewriting, expansion, classification, safety checks, or metadata-aware routing.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={onRun}>
          <div className="space-y-2">
            <label className="text-sm font-medium">User question</label>
            <Textarea value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-[96px]" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">Run query processing to inspect the cleaned query form before semantic search.</div>
            <Button type="submit" disabled={loading}>{loading ? "Processing query..." : "Process query"}</Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Original length</div><div className="mt-2 text-lg font-semibold">{processed?.original_query.length ?? query.length}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Normalized length</div><div className="mt-2 text-lg font-semibold">{processed?.normalized_query.length ?? 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Token count</div><div className="mt-2 text-lg font-semibold">{processed?.token_count ?? 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Keyword terms</div><div className="mt-2 text-lg font-semibold">{processed?.keyword_tokens.length ?? 0}</div></div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">What changed from the previous phase</div>
          <p>The document side is already prepared and indexed. Query-Time Retrieval now starts by cleaning and inspecting the user question before any embedding or candidate ranking happens.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <label className="text-sm font-medium">Processed query object</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-4">
              <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{JSON.stringify(processed ?? {
                original_query: query,
                normalized_query: query.trim(),
                lowered_query: query.trim().toLowerCase(),
                token_count: 0,
                keyword_tokens: [],
                processing_notes: [],
              }, null, 2)}</pre>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Visible query transformations</div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Original:</span> {processed?.original_query ?? query}</p>
                <p><span className="font-medium text-foreground">Normalized:</span> {processed?.normalized_query ?? query.trim()}</p>
                <p><span className="font-medium text-foreground">Lowercased:</span> {processed?.lowered_query ?? query.trim().toLowerCase()}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Keyword tokens</div>
              <div className="flex flex-wrap gap-2">
                {(processed?.keyword_tokens ?? []).length ? (processed?.keyword_tokens ?? []).map((token) => <span key={token} className="rounded-full border border-border px-3 py-1 text-sm">{token}</span>) : <span className="text-sm text-muted-foreground">Run this stage to inspect the tokenized query terms.</span>}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Why this matters</p>
              <ul className="space-y-2">
                {(processed?.processing_notes ?? ["Run this stage to inspect query normalization notes."]).map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Next handoff</p>
              <p>Semantic Search embeds the normalized query text, compares it against the Vector Index, and ranks candidate chunks by similarity.</p>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
