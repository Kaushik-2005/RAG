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

const percent = (value: number) => `${Math.round(value * 100)}%`;

export function EvaluationTab({ currentStage, loading, error, result, onRun }: Props) {
  const evaluation = result?.evaluation;

  return (
    <Card className="border-0 bg-transparent shadow-none rounded-none">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{currentStage.title}</CardTitle>
            <CardDescription>{currentStage.description}</CardDescription>
          </div>
          <form onSubmit={onRun}>
            <Button type="submit" disabled={loading}>{loading ? "Evaluating..." : "Generate & evaluate"}</Button>
          </form>
        </div>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>This lab uses lightweight quality signals to judge whether the answer appears grounded in the assembled context.</p>
          <p>Production systems usually add richer offline eval sets, human review, and observability over live traffic.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Verdict</div><div className="mt-2 text-lg font-semibold">{evaluation?.verdict ?? "—"}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Grounding</div><div className="mt-2 text-lg font-semibold">{evaluation ? percent(evaluation.groundedness_score) : "—"}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Query coverage</div><div className="mt-2 text-lg font-semibold">{evaluation ? percent(evaluation.query_coverage_score) : "—"}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Citation coverage</div><div className="mt-2 text-lg font-semibold">{evaluation ? percent(evaluation.citation_coverage_score) : "—"}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Answer words</div><div className="mt-2 text-lg font-semibold">{evaluation?.answer_word_count ?? 0}</div></div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <label className="text-sm font-medium">Evaluation notes</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                {(evaluation?.notes ?? ["Generate a response first to inspect evaluation signals."]).map((note) => <p key={note}>• {note}</p>)}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">What these scores mean</p>
              <ul className="space-y-2">
                <li>• Grounding estimates how much of the answer vocabulary appears in the assembled context.</li>
                <li>• Query coverage estimates whether the answer responds to the question terms.</li>
                <li>• Citation coverage shows whether attribution blocks exist for the evidence package.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <label className="text-sm font-medium">Generated answer under review</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[520px] p-4">
                {result?.answer ? <pre className="whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</pre> : <div className="flex h-full items-center justify-center text-muted-foreground">No answer generated yet.</div>}
              </ScrollArea>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
