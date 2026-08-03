"use client";

import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PipelineResponse } from "@/lib/api";
import { chunkerOptions, defaultSourceText, type ChunkerValue, stageTabs } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

type Props = {
  currentStage: StageMeta;
  sourceText: string;
  setSourceText: (value: string) => void;
  chunker: ChunkerValue;
  setChunker: (value: ChunkerValue) => void;
  chunkSize: number;
  setChunkSize: (value: number) => void;
  chunkOverlap: number;
  setChunkOverlap: (value: number) => void;
  loading: boolean;
  error: string | null;
  result: PipelineResponse | null;
  onRun: (event?: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function TextSplittingTab({ currentStage, sourceText, setSourceText, chunker, setChunker, chunkSize, setChunkSize, chunkOverlap, setChunkOverlap, loading, error, result, onRun }: Props) {
  const averageChunkSize = result?.chunks.length ? Math.round(result.chunks.reduce((sum, chunk) => sum + chunk.char_count, 0) / result.chunks.length) : 0;
  const colorMap: Record<ChunkerValue, string> = { recursive: "split-dot-blue", character: "split-dot-green", token: "split-dot-purple", markdown: "split-dot-amber" };
  const [hoveredChunkIndex, setHoveredChunkIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const highlightedSourceHtml = useMemo(() => {
    if (hoveredChunkIndex === null || !result?.chunks?.[hoveredChunkIndex]) return null;
    const chunk = result.chunks[hoveredChunkIndex];
    const before = escapeHtml(sourceText.slice(0, chunk.start_char));
    const current = escapeHtml(sourceText.slice(chunk.start_char, chunk.end_char));
    const after = escapeHtml(sourceText.slice(chunk.end_char));
    return `${before}<mark class="split-source-highlight">${current}</mark>${after}`.replace(/\n/g, "<br />");
  }, [hoveredChunkIndex, result, sourceText]);

  const handleChunkHover = (index: number | null) => {
    setHoveredChunkIndex(index);
    if (index === null || !textareaRef.current || !result?.chunks?.[index]) return;

    const chunk = result.chunks[index];
    const textarea = textareaRef.current;
    const previewText = sourceText.slice(0, chunk.start_char);
    const linesBefore = previewText.split("\n").length - 1;
    const approxLineHeight = 28;
    textarea.scrollTo({ top: Math.max(0, linesBefore * approxLineHeight - textarea.clientHeight / 3), behavior: "smooth" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <ul className="split-explanations-list">
          {chunkerOptions.map((option) => (
            <li key={option.value} className={option.value === chunker ? "split-explanation is-active" : "split-explanation"}>
              <span className={`split-dot ${colorMap[option.value]}`} aria-hidden="true" />
              <div><strong>{option.label} strategy:</strong> {option.description}</div>
            </li>
          ))}
        </ul>
        <blockquote className="split-warning">When text segments do not fit neatly into the configured chunk size, the splitter may return chunks that are slightly over the limit in order to preserve better boundaries.</blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={onRun}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Split Strategy:</span>
              <Select value={chunker} onValueChange={(value) => setChunker(value as ChunkerValue)}>
                <SelectTrigger className="w-[254px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chunkerOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Chunk Size:</span>
              <Input type="number" min={32} max={4000} value={chunkSize} onChange={(event) => setChunkSize(Number(event.target.value))} className="w-24" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Overlap Size:</span>
              <Input type="number" min={0} max={2000} value={chunkOverlap} onChange={(event) => setChunkOverlap(Number(event.target.value))} className="w-24" />
            </div>
            <Button type="button" variant="outline" onClick={() => setSourceText(defaultSourceText)}>Reset sample</Button>
            <Button type="submit" disabled={loading}>{loading ? "Updating chunks..." : "Update chunks"}</Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <div className="stage-hint-row"><span className="text-sm font-medium">Separators:</span><span className="stage-hint-pill">Paragraph breaks</span><span className="stage-hint-pill">Sentence boundaries</span><span className="stage-hint-pill">Spaces</span></div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <div className="flex items-center justify-between"><label className="text-sm font-medium">Source Document</label><div className="text-xs text-muted-foreground">Editable paragraph</div></div>
            {highlightedSourceHtml ? (
              <div ref={previewRef} className="split-source-preview-pane">
                <div className="split-source-preview-text" dangerouslySetInnerHTML={{ __html: highlightedSourceHtml }} />
              </div>
            ) : (
              <Textarea ref={textareaRef} value={sourceText} onChange={(event) => setSourceText(event.target.value)} className="min-h-[540px] resize-y border-2 border-dashed border-muted-foreground/25 font-mono text-base leading-relaxed" />
            )}
          </section>
          <section className="space-y-3">
            <div className="flex items-center justify-between"><label className="text-sm font-medium">Generated Chunks</label><div className="text-xs text-muted-foreground">Hover to inspect</div></div>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/5">
              <div className="mb-0 grid grid-cols-2 gap-3 border-b border-border/50 p-4 pb-3 lg:grid-cols-4">
                <div className="rounded-md bg-muted px-3 py-2"><span className="text-xs font-medium text-muted-foreground">Chunks:</span><div className="text-sm font-semibold">{result?.chunks.length ?? 0}</div></div>
                <div className="rounded-md bg-muted px-3 py-2"><span className="text-xs font-medium text-muted-foreground">Avg. Size:</span><div className="text-sm font-semibold">{averageChunkSize} chars</div></div>
                <div className="rounded-md bg-muted px-3 py-2"><span className="text-xs font-medium text-muted-foreground">Chunk Size:</span><div className="text-sm font-semibold">{result?.chunk_size ?? chunkSize}</div></div>
                <div className="rounded-md bg-muted px-3 py-2"><span className="text-xs font-medium text-muted-foreground">Avg. Overlap:</span><div className="text-sm font-semibold">{result?.chunk_overlap ?? chunkOverlap} chars</div></div>
              </div>
              <ScrollArea className="h-[620px] p-4">
                <div className="space-y-4">
                  {result?.chunks?.length ? result.chunks.map((chunk, index) => <article key={chunk.index} onMouseEnter={() => handleChunkHover(index)} onMouseLeave={() => handleChunkHover(null)} className={index === hoveredChunkIndex ? "split-chunk split-chunk-hover" : index % 2 === 0 ? "split-chunk split-chunk-alt" : "split-chunk"}><div className="chunk-meta"><span>Chunk {chunk.index}</span><span>{chunk.word_count} words</span><span>{chunk.char_count} chars</span></div><p>{chunk.text}</p></article>) : <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">Run the pipeline to see the chunk split output.</div>}
                </div>
              </ScrollArea>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
