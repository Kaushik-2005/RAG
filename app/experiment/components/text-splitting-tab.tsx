"use client";

import { CircleHelp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PipelineResponse } from "@/lib/api";
import { chunkerOptions, chunkerPresets, type ChunkerValue, stageTabs } from "./experiment-content";

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
  recommendedChunker: ChunkerValue;
  recommendedChunkSize: number;
  loading: boolean;
  error: string | null;
  result: PipelineResponse | null;
  onRun: (event?: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onResetSourceDocument: () => void;
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

export function TextSplittingTab({ currentStage, sourceText, setSourceText, chunker, setChunker, chunkSize, setChunkSize, chunkOverlap, setChunkOverlap, recommendedChunker, recommendedChunkSize, loading, error, result, onRun, onResetSourceDocument }: Props) {
  const activeChunks = useMemo(() => result?.active_document_chunks ?? [], [result?.active_document_chunks]);
  const averageChunkSize = activeChunks.length ? Math.round(activeChunks.reduce((sum, chunk) => sum + (chunker === "token" ? (chunk.token_count ?? 0) : chunk.char_count), 0) / activeChunks.length) : 0;
  const sizeUnitLabel = chunker === "token" ? "tokens" : "chars";
  const chunkSizeLabel = chunker === "token" ? "Chunk Size (tokens):" : "Chunk Size:";
  const overlapSizeLabel = chunker === "token" ? "Overlap Size (tokens):" : "Overlap Size:";
  const chunkSizeHint = chunker === "token" ? "Maximum target size for each chunk in tokens when using the token-aware splitter." : "Maximum target size for each chunk in characters.";
  const overlapSizeHint = chunker === "token" ? "Tokens repeated between neighboring chunks to preserve continuity when using the token-aware splitter." : "Characters repeated between neighboring chunks to preserve continuity.";
  const tokenModeGuidance = chunker === "token" && activeChunks.length === 1 && (activeChunks[0]?.token_count ?? 0) <= chunkSize ? `This document section is about ${activeChunks[0]?.token_count ?? 0} tokens, so it still fits inside the current ${chunkSize}-token budget. Reduce chunk size to force multiple token-based chunks.` : null;
  const recommendedPreset = chunkerPresets[chunker];
  const followsMetadataRecommendation = chunker === recommendedChunker && chunkSize === recommendedChunkSize;

  const colorMap: Record<ChunkerValue, string> = {
    character: "split-dot-blue",
    recursive: "split-dot-green",
    token: "split-dot-purple",
    markdown: "split-dot-amber",
  };

  const [hoveredChunkIndex, setHoveredChunkIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewPaneRef = useRef<HTMLDivElement | null>(null);

  const highlightedSourceHtml = useMemo(() => {
    if (hoveredChunkIndex === null || !activeChunks[hoveredChunkIndex]) return null;
    const chunk = activeChunks[hoveredChunkIndex];
    const before = escapeHtml(sourceText.slice(0, chunk.start_char));
    const current = escapeHtml(sourceText.slice(chunk.start_char, chunk.end_char));
    const after = escapeHtml(sourceText.slice(chunk.end_char));
    return `${before}<mark class="split-source-highlight">${current}</mark>${after}`.replace(/\n/g, "<br />");
  }, [activeChunks, hoveredChunkIndex, sourceText]);

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
  }, [highlightedSourceHtml, hoveredChunkIndex]);

  const getDisplayedChunkText = (index: number) => {
    const chunk = activeChunks[index];
    if (!chunk) return "";
    if (index === 0) return chunk.text;

    const previousChunk = activeChunks[index - 1];
    if (!previousChunk) return chunk.text;

    const overlapChars = Math.max(0, previousChunk.end_char - chunk.start_char);
    const uniqueStart = chunk.start_char + overlapChars;
    const uniqueText = sourceText.slice(uniqueStart, chunk.end_char);
    return uniqueText || chunk.text;
  };

  const getOverlapChars = (index: number) => {
    if (index === 0) return 0;
    const chunk = activeChunks[index];
    const previousChunk = activeChunks[index - 1];
    if (!chunk || !previousChunk) return 0;
    return Math.max(0, previousChunk.end_char - chunk.start_char);
  };

  const handleChunkHover = (index: number | null) => {
    setHoveredChunkIndex(index);
    if (index === null || !textareaRef.current || !activeChunks[index]) return;

    const chunk = activeChunks[index];
    const textarea = textareaRef.current;
    const linesBefore = sourceText.slice(0, chunk.start_char).split("\n").length - 1;
    textarea.scrollTo({ top: Math.max(0, linesBefore * 28 - textarea.clientHeight / 3), behavior: "smooth" });
  };

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
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
        <blockquote className="split-warning">
          The splitters run through LangChain JS. Character, recursive, markdown, and token modes are real splitter implementations, and token mode measures size and overlap in tokens rather than characters.
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">What changed from the previous stage</div>
          <p className="mb-3">The cleaned active document is now being converted into retrieval units. Metadata from the previous stage recommends <span className="font-medium text-foreground capitalize">{recommendedChunker}</span> chunking at about <span className="font-medium text-foreground">{recommendedChunkSize}</span> {recommendedChunker === "token" ? "tokens" : "characters"}.</p>
          <p>{followsMetadataRecommendation ? "The current controls follow that recommendation." : "The current controls override that recommendation so you can compare chunking tradeoffs directly."}</p>
        </div>

        <form className="space-y-3" onSubmit={onRun}>
          <div className="split-controls-stack">
            <div className="split-controls-row split-controls-row-top">
              <div className="split-inline-control split-inline-control-strategy">
                <LabelWithInfo label="Split Strategy:" hint="Choose how the cleaned document is broken into retrieval chunks." />
                <div className="space-y-2">
                  <Select value={chunker} onValueChange={(value) => setChunker(value as ChunkerValue)}>
                    <SelectTrigger className="split-control-surface split-control-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {chunkerOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Splitter preset: {recommendedPreset.chunkSize} {chunker === "token" ? "tokens" : "chars"} / {recommendedPreset.chunkOverlap} {chunker === "token" ? "token" : "char"} overlap</p>
                </div>
              </div>
              <div className="split-control-actions split-control-actions-inline">
                <Button type="button" variant="outline" className="split-control-button" onClick={onResetSourceDocument}>Reset sample</Button>
                <Button type="submit" className="split-control-button" disabled={loading}>{loading ? "Updating chunks..." : "Update chunks"}</Button>
              </div>
            </div>

            <div className="split-controls-row split-controls-row-bottom">
              <div className="split-inline-control">
                <LabelWithInfo label={chunkSizeLabel} hint={chunkSizeHint} />
                <Input type="number" min={32} max={4000} value={chunkSize} onChange={(event) => setChunkSize(Number(event.target.value))} className="split-control-surface split-control-number" />
              </div>
              <div className="split-inline-control">
                <LabelWithInfo label={overlapSizeLabel} hint={overlapSizeHint} />
                <Input type="number" min={0} max={2000} value={chunkOverlap} onChange={(event) => setChunkOverlap(Number(event.target.value))} className="split-control-surface split-control-number" />
              </div>
            </div>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {tokenModeGuidance ? <p className="text-sm text-muted-foreground">{tokenModeGuidance}</p> : null}
        </form>

        <div className="split-workbench-head split-workbench-head-simple">
          <div className="split-workbench-head-left"><span className="split-pane-kicker">Cleaned document</span><span className="split-pane-note">Input from Parsing &amp; Cleaning</span></div>
          <div className="split-workbench-head-right"><span className="split-pane-kicker">Generated Chunks</span></div>
        </div>

        <div className="split-workbench-grid">
          <section className="split-workbench-panel split-workbench-panel-source">
            <div className="split-source-frame flex h-[640px] flex-col p-4">
              {highlightedSourceHtml ? (
                <div ref={previewPaneRef} className="split-source-preview-pane no-visible-scrollbar">
                  <div className="split-source-preview-text" dangerouslySetInnerHTML={{ __html: highlightedSourceHtml }} />
                </div>
              ) : (
                <Textarea ref={textareaRef} value={sourceText} onChange={(event) => setSourceText(event.target.value)} className="split-source-textarea resize-none border-2 border-dashed border-muted-foreground/25 text-base leading-relaxed no-visible-scrollbar" />
              )}
            </div>
          </section>

          <section className="split-workbench-panel split-workbench-panel-output">
            <div className="split-chunks-frame flex h-[640px] flex-col p-4">
              <div className="no-visible-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-4">
                  {activeChunks.length ? (
                    <>
                      <div className="split-stats-grid">
                        <div className="split-stat-card"><span className="split-stat-label">Chunks</span><div className="split-stat-value">{activeChunks.length}</div></div>
                        <div className="split-stat-card"><span className="split-stat-label">Average size</span><div className="split-stat-value">{averageChunkSize}</div><div className="split-stat-unit">{sizeUnitLabel}</div></div>
                        <div className="split-stat-card"><span className="split-stat-label">Chunk size</span><div className="split-stat-value">{result?.chunk_size ?? chunkSize}</div></div>
                        <div className="split-stat-card"><span className="split-stat-label">Overlap</span><div className="split-stat-value">{result?.chunk_overlap ?? chunkOverlap}</div><div className="split-stat-unit">{sizeUnitLabel}</div></div>
                      </div>
                      {activeChunks.map((chunk, index) => (
                        <article key={`${chunk.document_id}-${chunk.document_chunk_index}`} onMouseEnter={() => handleChunkHover(index)} onMouseLeave={() => handleChunkHover(null)} className={index === hoveredChunkIndex ? "split-chunk split-chunk-hover" : index % 2 === 0 ? "split-chunk split-chunk-alt" : "split-chunk"}>
                          <div className="chunk-meta"><span>Chunk {chunk.document_chunk_index + 1}</span>{chunker === "token" ? <span>{chunk.token_count ?? 0} tokens</span> : <span>{chunk.word_count} words</span>}<span>{chunk.char_count} chars</span></div>
                          <p>{chunk.text}</p>
                        </article>
                      ))}
                    </>
                  ) : <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">Run the pipeline to see the chunk split output.</div>}
                </div>
              </div>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
