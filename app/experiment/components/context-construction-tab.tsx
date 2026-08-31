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

export function ContextConstructionTab({ currentStage, loading, error, result, onRun }: Props) {
  const context = result?.context_construction;

  return (
    <Card className="border-0 bg-transparent shadow-none rounded-none">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{currentStage.title}</CardTitle>
            <CardDescription>{currentStage.description}</CardDescription>
          </div>
          <form onSubmit={onRun}>
            <Button type="submit" disabled={loading}>{loading ? "Building context..." : "Build context"}</Button>
          </form>
        </div>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>Context construction turns filtered evidence into the exact block package that will be sent to the generator.</p>
          <p>This is where retrieval output becomes a prompt-ready evidence bundle with stable ordering and source identity.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Blocks</div><div className="mt-2 text-lg font-semibold">{context?.block_count ?? 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Context chars</div><div className="mt-2 text-lg font-semibold">{context?.total_characters ?? 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Context tokens</div><div className="mt-2 text-lg font-semibold">{context?.total_tokens ?? 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Question</div><div className="mt-2 text-lg font-semibold">{result?.query ? "Attached" : "—"}</div></div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Construction notes</p>
          <ul className="space-y-2">
            {(context?.construction_notes ?? ["Run this stage to inspect context assembly."]).map((note) => <li key={note}>• {note}</li>)}
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <label className="text-sm font-medium">Context blocks</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                <div className="space-y-3">
                  {context?.blocks?.length ? context.blocks.map((block) => (
                    <article key={block.citation_id} className="rounded-2xl border border-foreground/20 bg-muted/30 p-4">
                      <div className="mb-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>{block.citation_id}</span>
                        <span>{block.document_title}</span>
                        <span>Chunk {block.document_chunk_index + 1}</span>
                        <span>Score {block.score.toFixed(4)}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{block.text}</p>
                    </article>
                  )) : <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">Run this stage to inspect the assembled context blocks.</div>}
                </div>
              </ScrollArea>
            </div>
          </section>

          <section className="space-y-2">
            <label className="text-sm font-medium">Prompt-ready context package</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                {context?.assembled_context ? <pre className="whitespace-pre-wrap text-sm leading-relaxed">{context.assembled_context}</pre> : <div className="flex h-full items-center justify-center text-muted-foreground">No context package yet.</div>}
              </ScrollArea>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
