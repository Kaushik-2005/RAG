"use client";

import { useMemo } from "react";

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

type ChangeKind = "trim" | "spaces" | "blank-gaps";

type ChangeExample = {
  before: string;
  after: string;
  label: string;
  kind: ChangeKind;
};

const showWhitespace = (value: string) =>
  value
    .replace(/ /g, "·")
    .replace(/\t/g, "⇥")
    .replace(/\n/g, "↵\n");

const clampSnippet = (value: string, limit = 120) => {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}…`;
};

function splitForDiff(example: ChangeExample) {
  if (example.kind === "trim") {
    const startMatch = example.before.match(/^\s+/)?.[0] ?? "";
    const endMatch = example.before.match(/\s+$/)?.[0] ?? "";
    const middle = example.before.slice(startMatch.length, example.before.length - endMatch.length);
    return {
      before: { prefix: startMatch, highlight: middle, suffix: endMatch },
      after: { prefix: "", highlight: middle, suffix: "" },
    };
  }

  if (example.kind === "spaces") {
    const match = example.before.match(/^(.*?)([ \t]{2,})(.*)$/s);
    if (match) {
      return {
        before: { prefix: match[1], highlight: match[2], suffix: match[3] },
        after: { prefix: match[1], highlight: " ", suffix: match[3] },
      };
    }
  }

  if (example.kind === "blank-gaps") {
    const match = example.before.match(/^(.*?)(\n{3,})(.*)$/s);
    if (match) {
      return {
        before: { prefix: match[1], highlight: match[2], suffix: match[3] },
        after: { prefix: match[1], highlight: "\n\n", suffix: match[3] },
      };
    }
  }

  return {
    before: { prefix: "", highlight: example.before, suffix: "" },
    after: { prefix: "", highlight: example.after, suffix: "" },
  };
}

function buildCleaningAnalysis(text: string) {
  const trimExamples: ChangeExample[] = [];
  const repeatedSpaceExamples: ChangeExample[] = [];
  const blankGapExamples: ChangeExample[] = [];

  let trimCount = 0;
  let repeatedSpaceCount = 0;
  let blankGapCount = 0;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (line !== trimmed) {
      trimCount += 1;
      if (trimExamples.length < 4) {
        trimExamples.push({
          label: "Trimmed line edges",
          before: line,
          after: trimmed,
          kind: "trim",
        });
      }
    }
  }

  const repeatedMatches = text.match(/[ \t]{2,}/g) ?? [];
  repeatedSpaceCount = repeatedMatches.length;
  if (repeatedSpaceCount > 0) {
    const regex = /(.{0,28})([ \t]{2,})(.{0,28})/g;
    for (const match of text.matchAll(regex)) {
      if (repeatedSpaceExamples.length >= 4) break;
      const before = `${match[1]}${match[2]}${match[3]}`;
      const after = `${match[1]} ${match[3]}`;
      repeatedSpaceExamples.push({
        label: "Collapsed repeated spaces",
        before,
        after,
        kind: "spaces",
      });
    }
  }

  const blankMatches = text.match(/\n{3,}/g) ?? [];
  blankGapCount = blankMatches.length;
  if (blankGapCount > 0) {
    const parts = text.split(/(\n{3,})/);
    for (let i = 0; i < parts.length; i += 2) {
      const gap = parts[i + 1];
      if (!gap || blankGapExamples.length >= 4) continue;
      const before = `${parts[i].slice(-24)}${gap}${(parts[i + 2] ?? "").slice(0, 24)}`;
      const after = `${parts[i].slice(-24)}\n\n${(parts[i + 2] ?? "").slice(0, 24)}`;
      blankGapExamples.push({
        label: "Collapsed blank gaps",
        before,
        after,
        kind: "blank-gaps",
      });
    }
  }

  const allExamples = [...trimExamples, ...repeatedSpaceExamples, ...blankGapExamples].slice(0, 8);

  return {
    trimCount,
    repeatedSpaceCount,
    blankGapCount,
    allExamples,
  };
}

function DiffSnippet({ example, mode }: { example: ChangeExample; mode: "before" | "after" }) {
  const parts = splitForDiff(example)[mode];
  const visiblePrefix = clampSnippet(showWhitespace(parts.prefix), 80);
  const visibleHighlight = clampSnippet(showWhitespace(parts.highlight), 80);
  const visibleSuffix = clampSnippet(showWhitespace(parts.suffix), 80);

  const beforeClass = "rounded bg-red-500/15 px-1 text-red-700 dark:text-red-300";
  const afterClass = "rounded bg-emerald-500/15 px-1 text-emerald-700 dark:text-emerald-300";

  return (
    <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-xs leading-relaxed">
      <span>{visiblePrefix}</span>
      <span className={mode === "before" ? beforeClass : afterClass}>{visibleHighlight || "∅"}</span>
      <span>{visibleSuffix}</span>
    </pre>
  );
}

export function ParsingCleaningTab({ currentStage, ingestedDocument, cleanedDocument, cleaningOptions, setCleaningOptions }: Props) {
  const toggle = (key: keyof CleaningOptions) => setCleaningOptions({ ...cleaningOptions, [key]: !cleaningOptions[key] });
  const analysis = useMemo(() => buildCleaningAnalysis(ingestedDocument.normalizedText), [ingestedDocument.normalizedText]);
  const visibleExamples = useMemo(() => analysis.allExamples.filter((example) => {
    if (example.kind === "trim") return cleaningOptions.trimLines;
    if (example.kind === "spaces") return cleaningOptions.normalizeSpaces;
    if (example.kind === "blank-gaps") return cleaningOptions.collapseBlankLines;
    return true;
  }), [analysis.allExamples, cleaningOptions]);

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{currentStage.title}</CardTitle>
        <CardDescription>{currentStage.description}</CardDescription>
        <blockquote className="space-y-2 border-l-4 border-muted-foreground/25 px-4 py-2 text-xs text-muted-foreground">
          <p>Parsing and cleaning reduce formatting noise before the document is turned into retrieval units.</p>
          <p>The goal is not to change meaning. The goal is to remove structural noise that can distort chunk boundaries, metadata extraction, and retrieval quality.</p>
        </blockquote>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">What changed from the previous stage</div>
          <p className="text-muted-foreground">The ingested working document is now normalized by trimming line noise, collapsing repeated spacing, and reducing oversized blank gaps. Removed noise is highlighted in red and cleaned output is highlighted in green below.</p>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-3 text-sm font-medium">Cleaning controls</div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
              <input type="checkbox" checked={cleaningOptions.trimLines} onChange={() => toggle("trimLines")} className="mt-0.5" />
              <span><span className="font-medium">Trim line whitespace</span><br /><span className="text-muted-foreground">Remove leading and trailing spaces on each line.</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
              <input type="checkbox" checked={cleaningOptions.normalizeSpaces} onChange={() => toggle("normalizeSpaces")} className="mt-0.5" />
              <span><span className="font-medium">Normalize repeated spaces</span><br /><span className="text-muted-foreground">Collapse repeated spaces and tabs into cleaner text.</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
              <input type="checkbox" checked={cleaningOptions.collapseBlankLines} onChange={() => toggle("collapseBlankLines")} className="mt-0.5" />
              <span><span className="font-medium">Reduce blank gaps</span><br /><span className="text-muted-foreground">Preserve paragraphs while removing excessive empty spacing.</span></span>
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Chars removed</div><div className="mt-2 text-lg font-semibold">{cleanedDocument.removedCharacters}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Lines trimmed</div><div className="mt-2 text-lg font-semibold">{cleaningOptions.trimLines ? analysis.trimCount : 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Repeated spaces</div><div className="mt-2 text-lg font-semibold">{cleaningOptions.normalizeSpaces ? analysis.repeatedSpaceCount : 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Blank gaps</div><div className="mt-2 text-lg font-semibold">{cleaningOptions.collapseBlankLines ? analysis.blankGapCount : 0}</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Clean chars</div><div className="mt-2 text-lg font-semibold">{cleanedDocument.charCount}</div></div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-3 text-sm font-medium">Detected cleaning differences</div>
          {visibleExamples.length ? (
            <div className="space-y-3">
              {visibleExamples.map((example, index) => (
                <div key={`${example.label}-${index}`} className="rounded-lg border border-border p-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{example.label}</div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-medium text-muted-foreground">Before</div>
                      <DiffSnippet example={example} mode="before" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium text-muted-foreground">After</div>
                      <DiffSnippet example={example} mode="after" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No formatting differences are visible for the currently enabled cleaning rules.</p>
          )}
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
