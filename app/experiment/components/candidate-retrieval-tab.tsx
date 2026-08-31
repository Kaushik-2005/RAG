"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PipelineResponse } from "@/lib/api";
import { stageTabs, type VectorStoreValue, vectorStoreOptions } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];

type Props = {
  currentStage: StageMeta;
  topK: number;
  setTopK: (value: number) => void;
  vectorStore: VectorStoreValue;
  setVectorStore: (value: VectorStoreValue) => void;
  loading: boolean;
  error: string | null;
  result: PipelineResponse | null;
  onRun: (event?: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function CandidateRetrievalTab({ currentStage, topK, setTopK, vectorStore, setVectorStore, loading, error, result, onRun }: Props) {
  const retrieval = result?.candidate_retrieval;
  const cutoff = retrieval?.threshold_rank ?? topK;

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>This stage scores the processed query against every indexed chunk. It exposes the full candidate pool instead of only the final displayed matches.</p>
          <p>Production systems often do more work here, such as hybrid retrieval, multiple candidate generators, or dense-plus-lexical recall before reranking.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={onRun}>
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
            <div className="flex items-center gap-2"><span className="text-sm font-medium">Top-k cutoff:</span><Input type="number" min={1} max={12} value={topK} onChange={(event) => setTopK(Number(event.target.value))} className="w-24" /></div>
            <Button type="submit" disabled={loading}>{loading ? "Scoring candidates..." : "Retrieve candidates"}</Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Candidates scored</div><div className="mt-2 text-lg font-semibold">{retrieval?.candidate_count ?? 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Top-k selected</div><div className="mt-2 text-lg font-semibold">{retrieval?.selected_top_k ?? topK}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Cutoff rank</div><div className="mt-2 text-lg font-semibold">{cutoff}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Metric</div><div className="mt-2 text-lg font-semibold uppercase">{retrieval?.distance_metric ?? vectorStore}</div></div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">What changed from the previous stage</div>
          <p>Query Processing prepared the query text. Candidate Retrieval now uses that processed query embedding to score the entire indexed chunk pool and draw the current top-k window that enters reranking.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-2">
            <label className="text-sm font-medium">Ranked candidate pool</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                <div className="space-y-3">
                  {retrieval?.candidates?.length ? retrieval.candidates.map((match) => {
                    const selected = match.rank <= cutoff;
                    return (
                      <article key={`${match.rank}-${match.chunk_index}`} className={`rounded-2xl border p-4 ${selected ? "border-foreground/20 bg-muted/30" : "border-border bg-muted/10"}`}>
                        <div className="mb-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span>Rank {match.rank}</span>
                          <span>Chunk {match.chunk_index + 1}</span>
                          <span>Score {match.score.toFixed(4)}</span>
                          <span>{selected ? "Selected for reranking" : "Below cutoff"}</span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground">{match.text}</p>
                      </article>
                    );
                  }) : <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">Run this stage to inspect the ranked candidate pool.</div>}
                </div>
              </ScrollArea>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Retrieval notes</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(retrieval?.retrieval_notes ?? ["Run this stage to generate candidate-retrieval notes."]).map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Why this is different from Semantic Search</p>
              <ul className="space-y-2">
                <li>• Candidate Retrieval shows the full scored pool.</li>
                <li>• The cutoff line makes the selected top-k set explicit.</li>
                <li>• Semantic Search can then focus on the chosen matches and their geometric relationship to the query vector.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Candidate retrieval object</div>
              <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{JSON.stringify(retrieval ?? {
                distance_metric: vectorStore,
                candidate_count: 0,
                selected_top_k: topK,
                threshold_rank: topK,
                candidates: [],
                retrieval_notes: [],
              }, null, 2)}</pre>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
