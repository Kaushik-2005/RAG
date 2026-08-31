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

export function CitationsTab({ currentStage, loading, error, result, onRun }: Props) {
  const citations = result?.citations ?? [];

  return (
    <Card className="border-0 bg-transparent shadow-none rounded-none">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{currentStage.title}</CardTitle>
            <CardDescription>{currentStage.description}</CardDescription>
          </div>
          <form onSubmit={onRun}>
            <Button type="submit" disabled={loading}>{loading ? "Preparing citations..." : "Prepare citations"}</Button>
          </form>
        </div>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>Citations preserve traceability from the final answer back to the specific evidence blocks that supported it.</p>
          <p>In production systems, this stage often drives inline references, source panels, and auditability.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Citation blocks</div><div className="mt-2 text-lg font-semibold">{citations.length}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Documents cited</div><div className="mt-2 text-lg font-semibold">{new Set(citations.map((citation) => citation.document_title)).size}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Top citation</div><div className="mt-2 text-lg font-semibold">{citations[0]?.citation_id ?? "—"}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Attribution</div><div className="mt-2 text-lg font-semibold">{citations.length ? "Ready" : "—"}</div></div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <label className="text-sm font-medium">Citation register</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                <div className="space-y-3">
                  {citations.length ? citations.map((citation) => (
                    <article key={citation.citation_id} className="rounded-2xl border border-foreground/20 bg-muted/30 p-4">
                      <div className="mb-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>{citation.citation_id}</span>
                        <span>{citation.document_title}</span>
                        <span>Chunk {citation.document_chunk_index + 1}</span>
                        <span>Score {citation.score.toFixed(4)}</span>
                        <span>{citation.char_count} chars</span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{citation.snippet}{citation.snippet.length >= 220 ? "..." : ""}</p>
                    </article>
                  )) : <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">Run this stage to inspect citations.</div>}
                </div>
              </ScrollArea>
            </div>
          </section>

          <section className="space-y-2">
            <label className="text-sm font-medium">Citation-ready answer scaffold</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                {citations.length ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">A later production answer can attach these identifiers inline, for example: “RAG improves freshness and auditability [1][2].”</p>
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed">{citations.map((citation) => `${citation.citation_id} ${citation.document_title} · Chunk ${citation.document_chunk_index + 1}\n${citation.snippet}${citation.snippet.length >= 220 ? "..." : ""}`).join("\n\n")}</pre>
                  </div>
                ) : <div className="flex h-full items-center justify-center text-muted-foreground">No citations available yet.</div>}
              </ScrollArea>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}