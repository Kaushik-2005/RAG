"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PipelineResponse } from "@/lib/api";
import { stageTabs } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];

type Props = {
  currentStage: StageMeta;
  minScore: number;
  setMinScore: (value: number) => void;
  requireKeywordOverlap: boolean;
  setRequireKeywordOverlap: (value: boolean) => void;
  minWordCount: number;
  setMinWordCount: (value: number) => void;
  loading: boolean;
  error: string | null;
  result: PipelineResponse | null;
  onRun: (event?: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function FilteringTab({ currentStage, minScore, setMinScore, requireKeywordOverlap, setRequireKeywordOverlap, minWordCount, setMinWordCount, loading, error, result, onRun }: Props) {
  const filtering = result?.filtering;

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>Filtering removes candidates that are technically retrievable but not desirable enough to pass forward.</p>
          <p>Real systems often filter by metadata, permissions, freshness, language, or lexical requirements after retrieval and often after reranking.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={onRun}>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum score</label>
              <Input type="number" step="0.01" value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} className="w-28" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum words</label>
              <Input type="number" min={0} value={minWordCount} onChange={(event) => setMinWordCount(Number(event.target.value))} className="w-28" />
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={requireKeywordOverlap} onChange={(event) => setRequireKeywordOverlap(event.target.checked)} />
              Require query keyword overlap
            </label>
            <Button type="submit" disabled={loading}>{loading ? "Applying filters..." : "Apply filters"}</Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Input candidates</div><div className="mt-2 text-lg font-semibold">{filtering?.input_count ?? 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Kept</div><div className="mt-2 text-lg font-semibold">{filtering?.kept_count ?? 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Removed</div><div className="mt-2 text-lg font-semibold">{filtering?.removed_count ?? 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Keyword overlap</div><div className="mt-2 text-lg font-semibold">{requireKeywordOverlap ? "On" : "Off"}</div></div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">What changed from the previous stage</div>
          <p>Reranking reordered the top-k candidate window. Filtering now prunes that reranked window using explicit rules before the final semantic-search view is shown.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <label className="text-sm font-medium">Candidates kept for next stage</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[540px] p-4">
                <div className="space-y-3">
                  {filtering?.filtered_candidates?.length ? filtering.filtered_candidates.map((match) => (
                    <article key={`keep-${match.rank}-${match.chunk_index}`} className="rounded-2xl border border-foreground/20 bg-muted/30 p-4">
                      <div className="mb-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>Rank {match.rank}</span>
                        <span>Chunk {match.chunk_index + 1}</span>
                        <span>Score {match.score.toFixed(4)}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{match.text}</p>
                    </article>
                  )) : <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">Run this stage to inspect the filtered candidate set.</div>}
                </div>
              </ScrollArea>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Removed candidates</div>
              <div className="space-y-3 text-sm text-muted-foreground">
                {(filtering?.removed_candidates?.length ? filtering.removed_candidates : []).slice(0, 6).map((match) => (
                  <div key={`removed-${match.rank}-${match.chunk_index}`} className="rounded-xl border border-border bg-muted/10 p-3">
                    <div className="mb-1 flex flex-wrap gap-3"><span>Rank {match.rank}</span><span>Chunk {match.chunk_index + 1}</span><span>Score {match.score.toFixed(4)}</span></div>
                    <p>{match.text.slice(0, 180)}{match.text.length > 180 ? "..." : ""}</p>
                  </div>
                ))}
                {!filtering?.removed_candidates?.length ? <p>No candidates were removed by the current rules.</p> : null}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Filtering notes</p>
              <ul className="space-y-2">
                {(filtering?.filtering_notes ?? ["Run this stage to inspect filtering behavior."]).map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Filtering object</div>
              <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{JSON.stringify(filtering ?? {
                settings: {
                  min_score: minScore,
                  require_keyword_overlap: requireKeywordOverlap,
                  min_word_count: minWordCount,
                },
                input_count: 0,
                kept_count: 0,
                removed_count: 0,
                filtered_candidates: [],
                removed_candidates: [],
                filtering_notes: [],
              }, null, 2)}</pre>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
