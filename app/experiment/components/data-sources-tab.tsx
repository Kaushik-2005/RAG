"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { sourceTextSamples, sourceTitleSamples, sourceKindOptions, stageTabs, type SourceKindValue } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];

type Props = {
  currentStage: StageMeta;
  sourceTitle: string;
  setSourceTitle: (value: string) => void;
  sourceKind: SourceKindValue;
  setSourceKind: (value: SourceKindValue) => void;
  sourceText: string;
  setSourceText: (value: string) => void;
  onInjectNoise: () => void;
  charCount: number;
  wordCount: number;
  paragraphCount: number;
  estimatedTokens: number;
};

const sourceTypeNotes: Record<SourceKindValue, { label: string; effect: string; chunker: string; caution: string }> = {
  essay: {
    label: "Essay / article",
    effect: "Long-form prose usually carries meaning across paragraphs, so later stages should preserve narrative flow rather than aggressively splitting every sentence.",
    chunker: "Recursive chunking is usually the best default because it respects paragraph structure before falling back to smaller separators.",
    caution: "Over-cleaning can flatten useful paragraph boundaries and make retrieval passages feel less coherent.",
  },
  markdown: {
    label: "Markdown document",
    effect: "Markdown sources already contain explicit structure such as headings, lists, and sections that later stages can preserve.",
    chunker: "Markdown-aware chunking is usually preferred because visible document structure often maps well to retrieval units.",
    caution: "If headings are removed too early, the system loses structural cues that help retrieval stay scoped to the right section.",
  },
  notes: {
    label: "Notes / KB entry",
    effect: "Notes are often short, compact, and unevenly formatted, so cleanup and chunk sizing have a stronger effect on retrieval quality.",
    chunker: "Character or recursive chunking often works well depending on whether the notes have clear sentence or paragraph boundaries.",
    caution: "Very short note fragments can become weak retrieval units if they do not contain enough standalone meaning.",
  },
};

export function DataSourcesTab({ currentStage, sourceTitle, setSourceTitle, sourceKind, setSourceKind, sourceText, setSourceText, onInjectNoise, charCount, wordCount, paragraphCount, estimatedTokens }: Props) {
  const selectedType = sourceTypeNotes[sourceKind];

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>This stage decides what raw document enters the pipeline and how the system should interpret its format.</p>
          <p>Every downstream step in Document Prep depends on these choices: ingestion stabilizes the source, cleaning normalizes it, metadata describes it, and chunking splits it.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">Phase 1 flow</div>
          <p className="text-muted-foreground">Source document → ingested working document → cleaned text → metadata signals → retrieval-ready chunks</p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Source title</label>
                <Input value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} placeholder="Document title" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Source type</label>
                <Select value={sourceKind} onValueChange={(value) => setSourceKind(value as SourceKindValue)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceKindOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium">Editable source document</label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => { setSourceTitle(sourceTitleSamples[sourceKind]); setSourceText(sourceTextSamples[sourceKind]); }}>Reset sample</Button>
                  <Button type="button" variant="outline" onClick={onInjectNoise}>Inject noise</Button>
                  <TooltipProvider delayDuration={120}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground" aria-label="Why inject noise?">
                          <CircleHelp className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] leading-relaxed">
                        <p>Inject noise adds extra spaces, indentation, and blank gaps so the Parsing & Cleaning stage has visible formatting problems to fix.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <Textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} className="min-h-[560px] resize-y text-base leading-relaxed" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="mb-3 text-sm font-medium">Source readiness snapshot</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Characters</div><div className="mt-2 text-2xl font-semibold">{charCount}</div></div>
                <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Words</div><div className="mt-2 text-2xl font-semibold">{wordCount}</div></div>
                <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Paragraphs</div><div className="mt-2 text-2xl font-semibold">{paragraphCount}</div></div>
                <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Est. tokens</div><div className="mt-2 text-2xl font-semibold">{estimatedTokens}</div></div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="mb-3 text-sm font-medium text-foreground">Visible effect of selected source type</div>
              <div className="space-y-3">
                <p><span className="font-medium text-foreground">Current type:</span> {selectedType.label}</p>
                <p><span className="font-medium text-foreground">Pipeline effect:</span> {selectedType.effect}</p>
                <p><span className="font-medium text-foreground">Likely chunker fit:</span> {selectedType.chunker}</p>
                <p><span className="font-medium text-foreground">Watch out:</span> {selectedType.caution}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="mb-3 font-medium text-foreground">What this stage teaches</p>
              <ul className="space-y-2">
                <li>• Source selection happens before any embedding or retrieval logic exists.</li>
                <li>• Document format changes later choices in cleaning, metadata, and chunking.</li>
                <li>• Better source structure usually produces more stable retrieval behavior downstream.</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}