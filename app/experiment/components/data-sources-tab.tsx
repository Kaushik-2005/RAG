"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CorpusDocument } from "@/lib/demo-corpus";
import type { SourceKindValue } from "@/lib/document-prep";
import { stageTabs } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];

type Props = {
  currentStage: StageMeta;
  documents: CorpusDocument[];
  activeDocumentId: string;
  setActiveDocumentId: (value: string) => void;
  sourceTitle: string;
  setSourceTitle: (value: string) => void;
  sourceKind: SourceKindValue;
  sourceText: string;
  setSourceText: (value: string) => void;
  onResetDocument: () => void;
  charCount: number;
  wordCount: number;
  paragraphCount: number;
  estimatedTokens: number;
};

const sourceTypeNotes: Record<SourceKindValue, { label: string; effect: string; chunker: string; caution: string }> = {
  essay: {
    label: "Essay / article",
    effect: "Long-form prose carries meaning across paragraphs, so later stages should preserve narrative continuity rather than over-splitting sentences.",
    chunker: "Recursive chunking is usually the best default because it respects paragraph structure before falling back to smaller separators.",
    caution: "Over-cleaning can flatten useful paragraph boundaries and make retrieval passages less coherent.",
  },
  markdown: {
    label: "Markdown document",
    effect: "Markdown sources contain explicit structure such as headings, lists, and sections that chunking can preserve.",
    chunker: "Markdown-aware chunking is often preferred because visible document structure maps well to retrieval units.",
    caution: "If headings are stripped too early, the retriever loses structural signals that help keep chunks scoped correctly.",
  },
  notes: {
    label: "Notes / KB entry",
    effect: "Notes are usually shorter and more irregular, so cleanup and chunk sizing have a stronger effect on retrieval quality.",
    chunker: "Character or recursive chunking usually works depending on how much sentence or paragraph structure is present.",
    caution: "Very small note fragments can become weak retrieval units if they do not carry enough standalone meaning.",
  },
};

export function DataSourcesTab({ currentStage, documents, activeDocumentId, setActiveDocumentId, sourceTitle, setSourceTitle, sourceKind, sourceText, setSourceText, onResetDocument, charCount, wordCount, paragraphCount, estimatedTokens }: Props) {
  const selectedType = sourceTypeNotes[sourceKind];
  const activeIndex = Math.max(0, documents.findIndex((document) => document.id === activeDocumentId));

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>You edit one active document here, but the later retrieval phases index and search the entire 4-document corpus.</p>
          <p>This stage decides what raw content enters document preparation and which document you are currently inspecting.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">Corpus mode</div>
          <p className="text-muted-foreground">The lab currently uses a fixed {documents.length}-document corpus. The selected document is editable here. Later indexing and retrieval stages operate over all {documents.length} documents together.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Active corpus document</label>
                <Select value={activeDocumentId} onValueChange={setActiveDocumentId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map((document, index) => (
                      <SelectItem key={document.id} value={document.id}>{`Document ${index + 1} · ${document.title}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Document title</label>
                <Input value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} placeholder="Document title" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium">Editable source document</label>
                <Button type="button" variant="outline" onClick={onResetDocument}>Reset current document</Button>
              </div>
              <Textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} className="min-h-[560px] resize-y text-base leading-relaxed" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="mb-3 text-sm font-medium">Selected document snapshot</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Document</div><div className="mt-2 text-lg font-semibold">{activeIndex + 1}</div></div>
                <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Type</div><div className="mt-2 text-lg font-semibold">{selectedType.label}</div></div>
                <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Characters</div><div className="mt-2 text-2xl font-semibold">{charCount}</div></div>
                <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Words</div><div className="mt-2 text-2xl font-semibold">{wordCount}</div></div>
                <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Paragraphs</div><div className="mt-2 text-2xl font-semibold">{paragraphCount}</div></div>
                <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Est. tokens</div><div className="mt-2 text-2xl font-semibold">{estimatedTokens}</div></div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="mb-3 text-sm font-medium text-foreground">Visible effect of this document type</div>
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
                <li>• Source data exists before chunking, embeddings, or retrieval logic.</li>
                <li>• Document shape changes later preparation choices.</li>
                <li>• Editing one selected document while searching a full corpus mirrors real corpus maintenance workflows.</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
