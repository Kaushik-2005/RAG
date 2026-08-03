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

export function GenerationTab({ currentStage, loading, error, result, onRun }: Props) {
  const hasGenerationInput = Boolean(result?.retrieved_chunks?.length && result?.query);
  const hasGeneratedAnswer = Boolean(result?.answer);
  const thinkingSteps = [
    { label: `Collected ${result?.retrieved_chunks?.length ?? 0} retrieved context chunk${(result?.retrieved_chunks?.length ?? 0) === 1 ? "" : "s"}`, isComplete: hasGenerationInput },
    { label: "Composed system instructions and user question", isComplete: hasGenerationInput },
    { label: hasGeneratedAnswer ? "Generated a grounded response" : loading ? "Generating a grounded response" : "Ready to generate a grounded response", isComplete: hasGeneratedAnswer },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{currentStage.title}</CardTitle>
            <CardDescription>{currentStage.description}</CardDescription>
          </div>
          <form onSubmit={onRun}>
            <Button type="submit" disabled={loading}>{loading ? "Generating..." : "Generate Response"}</Button>
          </form>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <label className="text-sm font-medium">Prompt Preview:</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                {result ? (
                  <div className="space-y-4">
                    <div className="rounded-md bg-muted p-4">
                      <p className="mb-2 text-sm font-medium">System Message</p>
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed">You are a strict context-grounded RAG assistant. Answer using only information explicitly stated in the retrieved context.</pre>
                    </div>
                    <div className="rounded-md bg-muted p-4">
                      <p className="mb-2 text-sm font-medium">User Message</p>
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed">Question:\n{result.query}\n\nContext:\n{result.context}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">Start by asking a question in the Semantic Search tab.</div>
                )}
              </ScrollArea>
            </div>
          </section>

          <section className="space-y-2">
            <label className="text-sm font-medium">Model Response:</label>
            <div className="flex min-h-[620px] flex-col gap-4">
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-4">
                <div className="mb-3 text-sm font-medium">Generation pipeline</div>
                <div className="space-y-3">
                  {thinkingSteps.map((step) => (
                    <div key={step.label} className="flex items-start gap-2 text-sm">
                      <span className={step.isComplete ? "text-green-600" : "text-muted-foreground"}>{step.isComplete ? "✓" : "○"}</span>
                      <span className={step.isComplete ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="min-h-0 flex-1 rounded-lg border-2 border-dashed border-muted-foreground/25">
                <ScrollArea className="h-[420px] p-4">
                  {result?.answer ? <pre className="whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</pre> : <div className="flex h-full items-center justify-center text-muted-foreground">Click &quot;Generate Response&quot; to see the model answer.</div>}
                </ScrollArea>
              </div>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
