"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { IngestedDocument } from "@/lib/document-prep";
import { stageTabs } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];

type Props = {
  currentStage: StageMeta;
  sourceText: string;
  ingestedDocument: IngestedDocument;
};

export function IngestionTab({ currentStage, sourceText, ingestedDocument }: Props) {
  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>Ingestion creates the stable working document that later preparation stages build on.</p>
          <p>This step is intentionally simple: it establishes a canonical representation without trying to interpret meaning or retrieval relevance yet.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">What changed from the previous stage</div>
          <p className="text-muted-foreground">The editable source is now wrapped into a stable working document with normalized line endings, consistent spacing treatment, and baseline document counts.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Source type</div><div className="mt-2 text-lg font-semibold capitalize">{ingestedDocument.sourceKind}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Lines</div><div className="mt-2 text-lg font-semibold">{ingestedDocument.lineCount}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Paragraphs</div><div className="mt-2 text-lg font-semibold">{ingestedDocument.paragraphCount}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Words</div><div className="mt-2 text-lg font-semibold">{ingestedDocument.wordCount}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Est. tokens</div><div className="mt-2 text-lg font-semibold">{ingestedDocument.estimatedTokens}</div></div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <label className="text-sm font-medium">Raw source input</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{sourceText}</pre>
              </ScrollArea>
            </div>
          </section>
          <section className="space-y-2">
            <label className="text-sm font-medium">Ingested working document</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                    <p><span className="font-medium">Title:</span> {ingestedDocument.title}</p>
                    <p><span className="font-medium">Kind:</span> {ingestedDocument.sourceKind}</p>
                    <p><span className="font-medium">Ingestion output:</span> a stable document object that later cleaning, metadata, and chunking stages will reuse.</p>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed">{ingestedDocument.normalizedText}</pre>
                </div>
              </ScrollArea>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}