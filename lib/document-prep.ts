export type SourceKindValue = "essay" | "markdown" | "notes";

export type CleaningOptions = {
  trimLines: boolean;
  normalizeSpaces: boolean;
  collapseBlankLines: boolean;
};

export type IngestedDocument = {
  title: string;
  sourceKind: SourceKindValue;
  rawText: string;
  normalizedText: string;
  charCount: number;
  wordCount: number;
  lineCount: number;
  paragraphCount: number;
  estimatedTokens: number;
};

export type CleanedDocument = {
  text: string;
  charCount: number;
  wordCount: number;
  lineCount: number;
  paragraphCount: number;
  estimatedTokens: number;
  removedCharacters: number;
};

export type DocumentMetadata = {
  sourceTitle: string;
  sourceKind: SourceKindValue;
  documentId: string;
  charCount: number;
  wordCount: number;
  lineCount: number;
  paragraphCount: number;
  estimatedTokens: number;
  estimatedReadTimeMinutes: number;
  keywords: string[];
  recommendedChunker: "character" | "recursive" | "token" | "markdown";
  recommendedChunkSize: number;
  retrievalNotes: string[];
};

const STOPWORDS = new Set([
  "the", "and", "for", "that", "with", "this", "from", "into", "they", "them", "their", "then", "than", "have",
  "will", "when", "what", "where", "which", "using", "only", "such", "more", "most", "your", "about", "because",
  "does", "each", "just", "also", "being", "been", "over", "under", "very", "both", "through", "while", "within",
  "much", "many", "some", "same", "real", "good", "poor", "high", "like", "into", "onto", "used", "often", "than",
  "system", "model", "models", "answer", "answers", "chunk", "chunks", "text", "data", "user", "question", "context",
]);

const countWords = (value: string) => value.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g)?.length ?? 0;
const countLines = (value: string) => (value ? value.split("\n").length : 0);
const countParagraphs = (value: string) => (value ? value.split(/\n\s*\n/).filter((part) => part.trim()).length : 0);
const estimateTokens = (value: string) => Math.max(0, Math.round(countWords(value) * 1.35));

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "document";

export function ingestDocument(input: { title: string; sourceKind: SourceKindValue; text: string }): IngestedDocument {
  const normalizedText = input.text.replace(/\r\n/g, "\n").replace(/\t/g, "  ").trim();
  return {
    title: input.title.trim() || "Untitled document",
    sourceKind: input.sourceKind,
    rawText: input.text,
    normalizedText,
    charCount: normalizedText.length,
    wordCount: countWords(normalizedText),
    lineCount: countLines(normalizedText),
    paragraphCount: countParagraphs(normalizedText),
    estimatedTokens: estimateTokens(normalizedText),
  };
}

export function cleanDocument(text: string, options: CleaningOptions): CleanedDocument {
  let cleaned = text.replace(/\r\n/g, "\n");
  if (options.trimLines) {
    cleaned = cleaned.split("\n").map((line) => line.trim()).join("\n");
  }
  if (options.normalizeSpaces) {
    cleaned = cleaned.replace(/[ \t]{2,}/g, " ");
  }
  if (options.collapseBlankLines) {
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  }
  cleaned = cleaned.trim();
  return {
    text: cleaned,
    charCount: cleaned.length,
    wordCount: countWords(cleaned),
    lineCount: countLines(cleaned),
    paragraphCount: countParagraphs(cleaned),
    estimatedTokens: estimateTokens(cleaned),
    removedCharacters: Math.max(0, text.length - cleaned.length),
  };
}

function extractKeywords(text: string, limit = 8) {
  const counts = new Map<string, number>();
  for (const token of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (token.length < 4 || STOPWORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([token]) => token);
}

function recommendChunker(sourceKind: SourceKindValue, paragraphCount: number, estimatedTokens: number) {
  if (sourceKind === "markdown") return { chunker: "markdown" as const, chunkSize: 400 };
  if (estimatedTokens > 1200) return { chunker: "token" as const, chunkSize: 180 };
  if (paragraphCount >= 4) return { chunker: "recursive" as const, chunkSize: 500 };
  return { chunker: "character" as const, chunkSize: 500 };
}

export function buildMetadata(input: { title: string; sourceKind: SourceKindValue; ingested: IngestedDocument; cleaned: CleanedDocument }): DocumentMetadata {
  const recommendation = recommendChunker(input.sourceKind, input.cleaned.paragraphCount, input.cleaned.estimatedTokens);
  return {
    sourceTitle: input.title.trim() || "Untitled document",
    sourceKind: input.sourceKind,
    documentId: slugify(input.title || "untitled-document"),
    charCount: input.cleaned.charCount,
    wordCount: input.cleaned.wordCount,
    lineCount: input.cleaned.lineCount,
    paragraphCount: input.cleaned.paragraphCount,
    estimatedTokens: input.cleaned.estimatedTokens,
    estimatedReadTimeMinutes: Math.max(1, Math.ceil(input.cleaned.wordCount / 220)),
    keywords: extractKeywords(input.cleaned.text),
    recommendedChunker: recommendation.chunker,
    recommendedChunkSize: recommendation.chunkSize,
    retrievalNotes: [
      "Longer documents benefit from semantically coherent chunk boundaries.",
      "Metadata helps later filtering and reranking stages stay precise.",
      "Grounded answers depend on preparing retrievable, well-scoped chunks.",
    ],
  };
}
