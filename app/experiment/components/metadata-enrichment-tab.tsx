"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentMetadata } from "@/lib/document-prep";
import { stageTabs } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];

type Props = {
  currentStage: StageMeta;
  metadata: DocumentMetadata;
};

export function MetadataEnrichmentTab({ currentStage, metadata }: Props) {
  const metadataJson = JSON.stringify(metadata, null, 2);

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>Metadata gives later retrieval phases more control than raw chunk text alone.</p>
          <p>In production RAG, metadata is commonly used for filtering, routing, permissions, freshness checks, reranking policies, observability, and citation display.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">What changed from the previous stage</div>
          <p className="text-muted-foreground">The cleaned document is now wrapped with explicit document signals: an ID, source type, keyword summary, read-time estimate, retrieval notes, and a recommended chunking strategy.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Document ID</div><div className="mt-2 text-sm font-semibold break-all">{metadata.documentId}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Recommended chunker</div><div className="mt-2 text-lg font-semibold capitalize">{metadata.recommendedChunker}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Recommended size</div><div className="mt-2 text-lg font-semibold">{metadata.recommendedChunkSize}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Read time</div><div className="mt-2 text-lg font-semibold">{metadata.estimatedReadTimeMinutes} min</div></div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-2">
            <label className="text-sm font-medium">Enriched metadata object</label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25">
              <ScrollArea className="h-[620px] p-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{metadataJson}</pre>
              </ScrollArea>
            </div>
          </section>
          <section className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Extracted keywords</div>
              <p className="mb-3 text-sm text-muted-foreground">These keywords summarize recurring document concepts and can later help retrieval, debugging, or quick inspection.</p>
              <div className="flex flex-wrap gap-2">
                {metadata.keywords.map((keyword) => <span key={keyword} className="rounded-full border border-border px-3 py-1 text-sm">{keyword}</span>)}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium">Retrieval notes</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {metadata.retrievalNotes.map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">How later phases use this metadata</p>
              <ul className="space-y-2">
                <li>• Retrieval Setup can use source type and document shape to choose chunking and embedding defaults.</li>
                <li>• Query-Time Retrieval can filter or prioritize candidates by metadata instead of treating every chunk equally.</li>
                <li>• Response Assembly can surface document IDs, labels, and source signals when explanations or citations are shown.</li>
              </ul>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}