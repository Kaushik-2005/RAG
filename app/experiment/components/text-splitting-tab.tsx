"use client";

import { CircleHelp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PipelineResponse } from "@/lib/api";
import { chunkerOptions, defaultSourceText, type ChunkerValue, stageTabs } from "./experiment-content";

type StageMeta = (typeof stageTabs)[number];

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");

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

const LabelWithInfo = ({ label, hint }: { label: string; hint: string }) => (
  <div className="split-inline-label">
    <span>{label}</span>
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="split-inline-help-button" aria-label={`${label} explanation`}>
            <CircleHelp className="split-inline-icon" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] leading-relaxed">
          <p>{hint}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

export function TextSplittingTab({ currentStage, sourceText, setSourceText, chunker, setChunker, chunkSize, setChunkSize, chunkOverlap, setChunkOverlap, loading, error, result, onRun }: Props) {
  const averageChunkSize = result?.chunks.length ? Math.round(result.chunks.reduce((sum, chunk) => sum + chunk.char_count, 0) / result.chunks.length) : 0;
  const colorMap: Record<ChunkerValue, string> = { character: "split-dot-blue", recursive: "split-dot-green", token: "split-dot-purple", markdown: "split-dot-amber" };
  const [hoveredChunkIndex, setHoveredChunkIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewPaneRef = useRef<HTMLDivElement | null>(null);

  const highlightedSourceHtml = useMemo(() => {
    if (hoveredChunkIndex === null || !result?.chunks?.[hoveredChunkIndex]) return null;
    const chunk = result.chunks[hoveredChunkIndex];
    const before = escapeHtml(sourceText.slice(0, chunk.start_char));
    const current = escapeHtml(sourceText.slice(chunk.start_char, chunk.end_char));
    const after = escapeHtml(sourceText.slice(chunk.end_char));
    return `${before}<mark class="split-source-highlight">${current}</mark>${after}`.replace(/\n/g, "<br />");
  }, [hoveredChunkIndex, result, sourceText]);
  useEffect(() => {
    if (hoveredChunkIndex === null) return;
    const pane = previewPaneRef.current;
    if (!pane) return;

    const highlight = pane.querySelector(".split-source-highlight") as HTMLElement | null;
    if (!highlight) return;

    const paneRect = pane.getBoundingClientRect();
    const highlightRect = highlight.getBoundingClientRect();
    const offsetTop = highlightRect.top - paneRect.top + pane.scrollTop;
    const targetTop = Math.max(0, offsetTop - pane.clientHeight / 3);

    pane.scrollTo({ top: targetTop, behavior: "smooth" });
  }, [hoveredChunkIndex, highlightedSourceHtml]);

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
    <Card className="border-0 bg-transparent shadow-none rounded-none">
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
        <blockquote className="split-warning">When merging and splitting segments, some segments themselves exceed the chunk size in length, or the splitting logic causes the combined length to exceed the set value, resulting in over-limit chunks.</blockquote>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-3" onSubmit={onRun}>
          <div className="split-controls-stack">
            <div className="split-controls-row split-controls-row-top">
              <div className="split-inline-control split-inline-control-strategy">
                <LabelWithInfo label="Split Strategy:" hint="Choose how the source text is broken into chunks." />
                <Select value={chunker} onValueChange={(value) => setChunker(value as ChunkerValue)}>
                  <SelectTrigger className="split-control-surface split-control-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chunkerOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="split-control-actions split-control-actions-inline">
                <Button type="button" variant="outline" className="split-control-button" onClick={() => setSourceText(defaultSourceText)}>Reset sample</Button>
                <Button type="submit" className="split-control-button" disabled={loading}>{loading ? "Updating chunks..." : "Update chunks"}</Button>
              </div>
            </div>

            <div className="split-controls-row split-controls-row-bottom">
              <div className="split-inline-control">
                <LabelWithInfo label="Chunk Size:" hint="Maximum target size for each chunk in characters." />
                <Input type="number" min={32} max={4000} value={chunkSize} onChange={(event) => setChunkSize(Number(event.target.value))} className="split-control-surface split-control-number" />
              </div>

              <div className="split-inline-control">
                <LabelWithInfo label="Overlap Size:" hint="Characters repeated between neighboring chunks to preserve continuity." />
                <Input type="number" min={0} max={2000} value={chunkOverlap} onChange={(event) => setChunkOverlap(Number(event.target.value))} className="split-control-surface split-control-number" />
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <div className="split-workbench-head split-workbench-head-simple">
          <div className="split-workbench-head-left">
            <span className="split-pane-kicker">Source Document</span>
          </div>
          <div className="split-workbench-head-right">
            <span className="split-pane-kicker">Generated Chunks</span>
          </div>
        </div>

        <div className="split-workbench-grid">
          <section className="split-workbench-panel split-workbench-panel-source">
            <label className="sr-only" htmlFor="source-paragraph">Source paragraph</label>
            {highlightedSourceHtml ? (
              <div ref={previewPaneRef} className="split-source-preview-pane no-visible-scrollbar">
                <div className="split-source-preview-text" dangerouslySetInnerHTML={{ __html: highlightedSourceHtml }} />
              </div>
            ) : (
              <Textarea id="source-paragraph" ref={textareaRef} value={sourceText} onChange={(event) => setSourceText(event.target.value)} className="split-source-textarea min-h-[640px] resize-y border-2 border-dashed border-muted-foreground/25 text-base leading-relaxed no-visible-scrollbar" />
            )}
          </section>

          <section className="split-workbench-panel split-workbench-panel-output">
            <div className="split-chunks-frame flex h-[640px] flex-col p-4">
              <div className="split-stats-grid mb-4">
                <div className="split-stat-card"><span className="split-stat-label">Chunks</span><div className="split-stat-value">{result?.chunks.length ?? 0}</div></div>
                <div className="split-stat-card"><span className="split-stat-label">Avg. Size</span><div className="split-stat-value">{averageChunkSize}</div><div className="split-stat-unit">chars</div></div>
                <div className="split-stat-card"><span className="split-stat-label">Chunk Size</span><div className="split-stat-value">{result?.chunk_size ?? chunkSize}</div></div>
                <div className="split-stat-card"><span className="split-stat-label">Overlap</span><div className="split-stat-value">{result?.chunk_overlap ?? chunkOverlap}</div><div className="split-stat-unit">chars</div></div>
              </div>
              <ScrollArea hideScrollbar className="min-h-0 flex-1 pr-1">
                <div className="space-y-4">
                  {result?.chunks?.length ? result.chunks.map((chunk, index) => (
                    <article
                      key={chunk.index}
                      onMouseEnter={() => handleChunkHover(index)}
                      onMouseLeave={() => handleChunkHover(null)}
                      className={index === hoveredChunkIndex ? "split-chunk split-chunk-hover" : index % 2 === 0 ? "split-chunk split-chunk-alt" : "split-chunk"}
                    >
                      <div className="chunk-meta"><span>Chunk {chunk.index}</span><span>{chunk.word_count} words</span><span>{chunk.char_count} chars</span></div>
                      <p>{chunk.text}</p>
                    </article>
                  )) : <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">Run the pipeline to see the chunk split output.</div>}
                </div>
              </ScrollArea>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}