"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CleanedDocument, CleaningOptions, IngestedDocument } from "@/lib/document-prep";
import { stageTabs } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];

type Props = {
  currentStage: StageMeta;
  ingestedDocument: IngestedDocument;
  cleanedDocument: CleanedDocument;
  cleaningOptions: CleaningOptions;
  setCleaningOptions: (value: CleaningOptions) => void;
};

export function ParsingCleaningTab({ currentStage, ingestedDocument, cleanedDocument, cleaningOptions, setCleaningOptions }: Props) {
  const toggle = (key: keyof CleaningOptions) => setCleaningOptions({ ...cleaningOptions, [key]: !cleaningOptions[key] });

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>Parsing and cleaning prepare raw text for chunking and retrieval.</p>
          <p>The purpose is to normalize formatting artifacts such as line-edge whitespace, repeated spacing, and oversized blank gaps without changing the meaning of the document.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">What this stage does</div>
          <p>Production pipelines rarely embed raw text exactly as received. They first normalize layout noise so the next stages operate on cleaner, more consistent content.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
            <input type="checkbox" checked={cleaningOptions.trimLines} onChange={() => toggle("trimLines")} className="mt-0.5" />
            <span><span className="font-medium">Trim line whitespace</span><br /><span className="text-muted-foreground">Removes leading and trailing spaces on each line.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
            <input type="checkbox" checked={cleaningOptions.normalizeSpaces} onChange={() => toggle("normalizeSpaces")} className="mt-0.5" />
            <span><span className="font-medium">Normalize repeated spaces</span><br /><span className="text-muted-foreground">Collapses uneven spacing and tabs into a cleaner text flow.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
            <input type="checkbox" checked={cleaningOptions.collapseBlankLines} onChange={() => toggle("collapseBlankLines")} className="mt-0.5" />
            <span><span className="font-medium">Reduce blank gaps</span><br /><span className="text-muted-foreground">Preserves paragraphs while removing excessive empty vertical gaps.</span></span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Original chars</div><div className="mt-2 text-lg font-semibold">{ingestedDocument.charCount}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Clean chars</div><div className="mt-2 text-lg font-semibold">{cleanedDocument.charCount}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Characters removed</div><div className="mt-2 text-lg font-semibold">{cleanedDocument.removedCharacters}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Cleaning goal</div><div className="mt-2 text-lg font-semibold">Normalize format</div></div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <label className="text-sm font-medium">Before cleaning</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{ingestedDocument.normalizedText}</pre>
              </ScrollArea>
            </div>
          </section>
          <section className="space-y-2">
            <label className="text-sm font-medium">After cleaning</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{cleanedDocument.text}</pre>
              </ScrollArea>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
