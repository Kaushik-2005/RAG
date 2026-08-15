import {
  CharacterTextSplitter,
  MarkdownTextSplitter,
  RecursiveCharacterTextSplitter,
  TokenTextSplitter,
} from "@langchain/textsplitters";
import { getEncoding } from "js-tiktoken";

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
const CL100K = getEncoding("cl100k_base");

const normalizeSource = (value: string) => value.replace(/\r\n/g, "\n").trim();

const tokenizeWords = (value: string) => value.toLowerCase().match(TOKEN_PATTERN) ?? [];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const countTokens = (value: string) => CL100K.encode(value).length;

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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fallbackLocateChunk = (sourceText: string, chunkText: string, searchStart: number) => {
  const compactChunk = chunkText.replace(/\s+/g, "\\s+");
  const pattern = new RegExp(escapeRegExp(compactChunk).replace(/\\\\s\+/g, "\\s+"), "g");
  pattern.lastIndex = searchStart;
  const match = pattern.exec(sourceText);
  return match ? match.index : -1;
};

const mapChunkTextsToChunks = (sourceText: string, chunkTexts: string[], chunkOverlap: number): Chunk[] => {
  const chunks: Chunk[] = [];
  const overlapWindow = Math.max(0, chunkOverlap) + 256;
  let cursor = 0;

  for (const [index, rawText] of chunkTexts.entries()) {
    const text = rawText.trim();
    if (!text) continue;

    const preferredStart = Math.max(0, cursor - overlapWindow);
    let start = sourceText.indexOf(text, preferredStart);

    if (start === -1) {
      start = sourceText.indexOf(text);
    }

    if (start === -1) {
      start = fallbackLocateChunk(sourceText, text, preferredStart);
    }

    if (start === -1) {
      start = fallbackLocateChunk(sourceText, text, 0);
    }

    if (start === -1) {
      continue;
    }

    const end = start + text.length;
    chunks.push({
      index: chunks.length,
      text,
      char_count: text.length,
      word_count: tokenizeWords(text).length,
      token_count: countTokens(text),
      start_char: start,
      end_char: end,
    });
    cursor = end;
  }

  return chunks;
};

const createSplitter = (chunker: ChunkerValue, chunkSize: number, chunkOverlap: number) => {
  const safeChunkSize = clamp(chunkSize, 32, Math.max(32, chunkSize));
  const safeOverlap = clamp(chunkOverlap, 0, Math.max(0, safeChunkSize - 1));
  const common = {
    chunkSize: safeChunkSize,
    chunkOverlap: safeOverlap,
    keepSeparator: true,
  };

  switch (chunker) {
    case "character":
      return new CharacterTextSplitter({ ...common, separator: "" });
    case "token":
      return new TokenTextSplitter({
        ...common,
        encodingName: "cl100k_base",
        allowedSpecial: [],
        disallowedSpecial: "all",
      });
    case "markdown":
      return new MarkdownTextSplitter(common);
    default:
      return new RecursiveCharacterTextSplitter(common);
  }
};

const buildChunks = async (sourceText: string, chunker: ChunkerValue, chunkSize: number, chunkOverlap: number) => {
  const normalizedSource = normalizeSource(sourceText);
  if (!normalizedSource) return [] as Chunk[];

  const splitter = createSplitter(chunker, chunkSize, chunkOverlap);
  const chunkTexts = await splitter.splitText(normalizedSource);
  return mapChunkTextsToChunks(normalizedSource, chunkTexts, chunkOverlap);
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

export async function runLocalPipeline(input: PipelineInput): Promise<PipelineResponse> {
  const sourceText = normalizeSource(input.sourceText);
  const chunks = await buildChunks(sourceText, input.chunker, input.chunkSize, input.chunkOverlap);
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