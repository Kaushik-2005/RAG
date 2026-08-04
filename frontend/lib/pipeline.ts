import type { Chunk, PipelineResponse, RetrievalMatch } from "@/lib/api";
import type { ChunkerValue, EmbeddingValue, VectorStoreValue } from "@/app/experiment/components/experiment-content";

type PipelineInput = {
  query: string;
  sourceText: string;
  sourceTitle: string;
  chunker: ChunkerValue;
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: EmbeddingValue;
  vectorStore: VectorStoreValue;
  topK: number;
};

type TfIdfResources = {
  kind: "tfidf";
  vocabulary: string[];
  vocabularyIndex: Map<string, number>;
  idf: number[];
};

type HashingResources = {
  kind: "hashing";
  dimensions: number;
};

type CharGramResources = {
  kind: "chargram";
  dimensions: number;
};

type EmbeddingResources = TfIdfResources | HashingResources | CharGramResources;

const TOKEN_PATTERN = /[a-z0-9]+(?:'[a-z0-9]+)?/gi;
const MAX_TFIDF_VOCAB = 384;
const HASHING_DIMENSIONS = 384;
const CHARGRAM_DIMENSIONS = 384;

const normalizeSource = (value: string) => value.replace(/\r\n/g, "\n").trim();

const tokenizeWords = (value: string) => value.toLowerCase().match(TOKEN_PATTERN) ?? [];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const l2Normalize = (vector: number[]) => {
  const magnitude = Math.sqrt(vector.reduce((sum, current) => sum + current * current, 0));
  if (!magnitude) return vector;
  return vector.map((value) => value / magnitude);
};

const dotProduct = (left: number[], right: number[]) => {
  const limit = Math.min(left.length, right.length);
  let sum = 0;
  for (let index = 0; index < limit; index += 1) {
    sum += left[index] * right[index];
  }
  return sum;
};

const cosineSimilarity = (left: number[], right: number[]) => {
  const leftMagnitude = Math.sqrt(left.reduce((sum, current) => sum + current * current, 0));
  const rightMagnitude = Math.sqrt(right.reduce((sum, current) => sum + current * current, 0));
  if (!leftMagnitude || !rightMagnitude) return 0;
  return dotProduct(left, right) / (leftMagnitude * rightMagnitude);
};

const finalizeChunk = (sourceText: string, start: number, end: number, index: number): Chunk | null => {
  let adjustedStart = start;
  let adjustedEnd = end;

  while (adjustedStart < adjustedEnd && /\s/.test(sourceText[adjustedStart])) adjustedStart += 1;
  while (adjustedEnd > adjustedStart && /\s/.test(sourceText[adjustedEnd - 1])) adjustedEnd -= 1;

  if (adjustedEnd <= adjustedStart) return null;

  const text = sourceText.slice(adjustedStart, adjustedEnd);
  return {
    index,
    text,
    char_count: text.length,
    word_count: tokenizeWords(text).length,
    start_char: adjustedStart,
    end_char: adjustedEnd,
  };
};

const findBoundary = (sourceText: string, start: number, target: number, separators: string[]) => {
  const minWindow = Math.max(start + 1, start + Math.floor((target - start) * 0.55));
  let bestBoundary = -1;

  for (const separator of separators) {
    const boundaryIndex = sourceText.lastIndexOf(separator, target);
    if (boundaryIndex >= minWindow) {
      bestBoundary = Math.max(bestBoundary, boundaryIndex + separator.length);
    }
  }

  if (bestBoundary > start) return bestBoundary;

  const forwardLimit = Math.min(sourceText.length, target + 80);
  for (const separator of separators) {
    const forwardIndex = sourceText.indexOf(separator, target);
    if (forwardIndex !== -1 && forwardIndex + separator.length <= forwardLimit) {
      return forwardIndex + separator.length;
    }
  }

  return Math.min(target, sourceText.length);
};

const buildWindowChunks = (sourceText: string, chunkSize: number, chunkOverlap: number, separators: string[]) => {
  const chunks: Chunk[] = [];
  const safeChunkSize = clamp(chunkSize, 32, Math.max(32, sourceText.length || 32));
  const safeOverlap = clamp(chunkOverlap, 0, Math.max(0, safeChunkSize - 1));
  let start = 0;
  let chunkIndex = 0;

  while (start < sourceText.length) {
    const target = Math.min(sourceText.length, start + safeChunkSize);
    let end = target;

    if (target < sourceText.length && separators.length) {
      end = findBoundary(sourceText, start, target, separators);
    }

    if (end <= start) {
      end = Math.min(sourceText.length, start + safeChunkSize);
    }

    const chunk = finalizeChunk(sourceText, start, end, chunkIndex);
    if (chunk) {
      chunks.push(chunk);
      chunkIndex += 1;
      if (chunk.end_char >= sourceText.length) break;
      start = Math.max(chunk.end_char - safeOverlap, start + 1);
      continue;
    }

    start = Math.min(sourceText.length, start + safeChunkSize);
  }

  return chunks;
};

const splitMarkdownSections = (sourceText: string) => {
  const headingPattern = /^#{1,6}\s.*$/gm;
  const matches = [...sourceText.matchAll(headingPattern)];
  if (!matches.length) return [{ start: 0, end: sourceText.length }];

  const sections = [] as Array<{ start: number; end: number }>;
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? sourceText.length) : sourceText.length;
    sections.push({ start, end });
  }

  if ((matches[0].index ?? 0) > 0) {
    sections.unshift({ start: 0, end: matches[0].index ?? 0 });
  }

  return sections;
};

const buildChunks = (sourceText: string, chunker: ChunkerValue, chunkSize: number, chunkOverlap: number) => {
  const normalizedSource = normalizeSource(sourceText);
  if (!normalizedSource) return [] as Chunk[];

  if (chunker === "character") {
    return buildWindowChunks(normalizedSource, chunkSize, chunkOverlap, []);
  }

  if (chunker === "token") {
    return buildWindowChunks(normalizedSource, chunkSize, chunkOverlap, [" ", "\n"]);
  }

  if (chunker === "markdown") {
    const markdownChunks: Chunk[] = [];
    let indexOffset = 0;
    for (const section of splitMarkdownSections(normalizedSource)) {
      const sectionText = normalizedSource.slice(section.start, section.end);
      const sectionChunks = buildWindowChunks(sectionText, chunkSize, chunkOverlap, ["\n## ", "\n### ", "\n\n", "\n", ". ", " "])
        .map((chunk) => ({
          ...chunk,
          index: indexOffset + chunk.index,
          start_char: chunk.start_char + section.start,
          end_char: chunk.end_char + section.start,
        }));
      markdownChunks.push(...sectionChunks);
      indexOffset = markdownChunks.length;
    }
    return markdownChunks;
  }

  return buildWindowChunks(normalizedSource, chunkSize, chunkOverlap, ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " "]);
};

const buildTfIdfResources = (chunks: Chunk[]): TfIdfResources => {
  const documentTokens = chunks.map((chunk) => Array.from(new Set(tokenizeWords(chunk.text))));
  const termFrequency = new Map<string, number>();
  const documentFrequency = new Map<string, number>();

  documentTokens.forEach((tokens) => {
    tokens.forEach((token) => {
      termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    });
  });

  const vocabulary = [...termFrequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, MAX_TFIDF_VOCAB)
    .map(([token]) => token);

  const vocabularyIndex = new Map(vocabulary.map((token, index) => [token, index]));
  const totalDocuments = Math.max(chunks.length, 1);
  const idf = vocabulary.map((token) => Math.log((1 + totalDocuments) / (1 + (documentFrequency.get(token) ?? 0))) + 1);

  return { kind: "tfidf", vocabulary, vocabularyIndex, idf };
};

const hashToken = (value: string, seed = 0) => {
  let hash = 2166136261 ^ seed;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
};

const vectorizeTfIdf = (text: string, resources: TfIdfResources) => {
  const vector = new Array(resources.vocabulary.length).fill(0);
  const tokens = tokenizeWords(text);
  if (!tokens.length || !resources.vocabulary.length) return vector;

  const tokenCounts = new Map<string, number>();
  tokens.forEach((token) => tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1));

  tokenCounts.forEach((count, token) => {
    const tokenIndex = resources.vocabularyIndex.get(token);
    if (tokenIndex === undefined) return;
    const tf = count / tokens.length;
    vector[tokenIndex] = tf * resources.idf[tokenIndex];
  });

  return l2Normalize(vector);
};

const vectorizeHashing = (text: string, dimensions: number) => {
  const vector = new Array(dimensions).fill(0);
  const tokens = tokenizeWords(text);
  tokens.forEach((token) => {
    const bucket = hashToken(token) % dimensions;
    const sign = hashToken(token, 19) % 2 === 0 ? 1 : -1;
    vector[bucket] += sign;
  });
  return l2Normalize(vector);
};

const vectorizeCharGrams = (text: string, dimensions: number) => {
  const vector = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  for (let index = 0; index < normalized.length - 2; index += 1) {
    const gram = normalized.slice(index, index + 3);
    const bucket = hashToken(gram) % dimensions;
    vector[bucket] += 1;
  }
  return l2Normalize(vector);
};

const buildEmbeddingResources = (chunks: Chunk[], embeddingModel: EmbeddingValue): EmbeddingResources => {
  if (embeddingModel === "tfidf") {
    return buildTfIdfResources(chunks);
  }

  if (embeddingModel === "hashing-384") {
    return { kind: "hashing", dimensions: HASHING_DIMENSIONS };
  }

  return { kind: "chargram", dimensions: CHARGRAM_DIMENSIONS };
};

const embedText = (text: string, resources: EmbeddingResources) => {
  switch (resources.kind) {
    case "tfidf":
      return vectorizeTfIdf(text, resources);
    case "hashing":
      return vectorizeHashing(text, resources.dimensions);
    case "chargram":
      return vectorizeCharGrams(text, resources.dimensions);
  }
};

const rankChunks = (chunks: Chunk[], chunkEmbeddings: number[][], queryEmbedding: number[], vectorStore: VectorStoreValue, topK: number): RetrievalMatch[] => {
  const matches = chunks.map((chunk, index) => {
    const score = vectorStore === "dot"
      ? dotProduct(queryEmbedding, chunkEmbeddings[index] ?? [])
      : cosineSimilarity(queryEmbedding, chunkEmbeddings[index] ?? []);

    return {
      rank: 0,
      chunk_index: index,
      score,
      text: chunk.text,
    } satisfies RetrievalMatch;
  });

  return matches
    .sort((left, right) => right.score - left.score)
    .slice(0, clamp(topK, 1, Math.max(1, chunks.length)))
    .map((match, index) => ({ ...match, rank: index + 1 }));
};

export function runLocalPipeline(input: PipelineInput): PipelineResponse {
  const sourceText = normalizeSource(input.sourceText);
  const chunks = buildChunks(sourceText, input.chunker, input.chunkSize, input.chunkOverlap);
  const embeddingResources = buildEmbeddingResources(chunks, input.embeddingModel);
  const chunkEmbeddings = chunks.map((chunk) => embedText(chunk.text, embeddingResources));
  const queryEmbedding = embedText(input.query, embeddingResources);
  const retrievedChunks = rankChunks(chunks, chunkEmbeddings, queryEmbedding, input.vectorStore, input.topK);
  const context = retrievedChunks.map((match) => match.text).join("\n\n");
  const embeddingDimension = chunkEmbeddings[0]?.length ?? queryEmbedding.length ?? 0;

  return {
    query: input.query,
    source_title: input.sourceTitle,
    source_kind: "editable",
    chunker: input.chunker,
    chunk_size: input.chunkSize,
    chunk_overlap: input.chunkOverlap,
    embedding_backend: "browser",
    embedding_model: input.embeddingModel,
    embedding_dimension: embeddingDimension,
    vector_store: input.vectorStore,
    vector_store_backend: "browser",
    top_k: input.topK,
    answer: "",
    context,
    chunks,
    chunk_embeddings: chunkEmbeddings,
    query_embedding: queryEmbedding,
    retrieved_chunks: retrievedChunks,
  };
}