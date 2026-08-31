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

export function RerankingTab({ currentStage, loading, error, result, onRun }: Props) {
  const reranking = result?.reranking;

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{currentStage.title}</CardTitle>
            <CardDescription>{currentStage.description}</CardDescription>
          </div>
          <form onSubmit={onRun}>
            <Button type="submit" disabled={loading}>{loading ? "Reranking..." : "Run reranking"}</Button>
          </form>
        </div>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>Reranking takes the broad top-k retrieval window and reorders it with stronger query-aware logic.</p>
          <p>In production this is often where a cross-encoder or heavier model improves the final evidence ordering.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Input window</div><div className="mt-2 text-lg font-semibold">{reranking?.input_count ?? 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Reranked</div><div className="mt-2 text-lg font-semibold">{reranking?.reranked_count ?? 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Strategy</div><div className="mt-2 text-lg font-semibold">Heuristic</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Next step</div><div className="mt-2 text-lg font-semibold">Filtering</div></div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">What changed from the previous stage</div>
          <p>Candidate Retrieval ranked the full corpus by raw semantic similarity. Reranking now reorders only the selected top-k window using query-aware bonuses before filters remove weak evidence.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-2">
            <label className="text-sm font-medium">Reranked candidate window</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                <div className="space-y-3">
                  {reranking?.reranked_candidates?.length ? reranking.reranked_candidates.map((candidate) => (
                    <article key={`${candidate.original_rank}-${candidate.chunk_index}`} className="rounded-2xl border border-foreground/20 bg-muted/30 p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>Original #{candidate.original_rank}</span>
                        <span>Reranked #{candidate.reranked_rank}</span>
                        <span>Semantic {candidate.semantic_score.toFixed(4)}</span>
                        <span>Bonus +{candidate.rerank_bonus.toFixed(4)}</span>
                        <span>Final {candidate.final_score.toFixed(4)}</span>
                      </div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {candidate.reason_labels.length ? candidate.reason_labels.map((reason) => (
                          <span key={reason} className="rounded-full border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">{reason}</span>
                        )) : <span className="text-xs text-muted-foreground">No extra bonus signals.</span>}
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{candidate.text}</p>
                    </article>
                  )) : <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">Run this stage to inspect reranked candidates.</div>}
                </div>
              </ScrollArea>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Why this stage exists</p>
              <ul className="space-y-2">
                <li>• Fast retrieval is optimized for recall, not always final ordering quality.</li>
                <li>• Reranking upgrades the top-k window without rescoring the full corpus.</li>
                <li>• This is where definitional and source-aware preferences become visible.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Reranking notes</p>
              <ul className="space-y-2">
                {(reranking?.reranking_notes ?? ["Run this stage to inspect reranking behavior."]).map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Reranking object</div>
              <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{JSON.stringify(reranking ?? {
                strategy: "heuristic-query-aware-reranker",
                input_count: 0,
                reranked_count: 0,
                cutoff_rank: 0,
                reranked_candidates: [],
                reranking_notes: [],
              }, null, 2)}</pre>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}