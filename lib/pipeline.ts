import {
  CharacterTextSplitter,
  MarkdownTextSplitter,
  RecursiveCharacterTextSplitter,
  TokenTextSplitter,
} from "@langchain/textsplitters";
import { getEncoding } from "js-tiktoken";

import type { CandidateRetrievalResult, Chunk, FilteringResult, PipelineResponse, QueryProcessingResult, RetrievalMatch, VectorIndexResult } from "@/lib/api";
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
  minScore: number;
  requireKeywordOverlap: boolean;
  minWordCount: number;
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

const normalizeQueryText = (value: string) => value.replace(/\s+/g, " ").trim();

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


const buildVectorIndex = (chunkEmbeddings: number[][], vectorStore: VectorStoreValue, embeddingModel: EmbeddingValue, chunkCount: number): VectorIndexResult => ({
  index_type: "flat-array",
  distance_metric: vectorStore,
  vector_dimension: chunkEmbeddings[0]?.length ?? 0,
  item_count: chunkCount,
  build_notes: [
    "Chunk embeddings are stored in a browser-side flat array for direct similarity scoring.",
    `Distance metric configured for retrieval: ${vectorStore}.`,
    `Embedding model used to produce the vectors: ${embeddingModel}.`,
    chunkCount ? "The index is ready for query-time retrieval." : "No chunks are indexed yet. Run an earlier stage or adjust chunking first.",
  ],
});


const buildQueryProcessing = (query: string): QueryProcessingResult => {
  const normalizedQuery = normalizeQueryText(query);
  const keywordTokens = Array.from(new Set(tokenizeWords(normalizedQuery))).slice(0, 12);

  return {
    original_query: query,
    normalized_query: normalizedQuery,
    lowered_query: normalizedQuery.toLowerCase(),
    token_count: countTokens(normalizedQuery),
    keyword_tokens: keywordTokens,
    processing_notes: [
      "Whitespace is normalized before embedding so accidental spacing does not change the query form.",
      "A lowered form is kept for lightweight lexical inspection and debugging.",
      "Keyword tokens show the content-bearing terms that survive basic normalization.",
      "Later production systems may add rewriting, expansion, classification, or safety checks here.",
    ],
  };
};

const scoreChunks = (chunks: Chunk[], chunkEmbeddings: number[][], queryEmbedding: number[], vectorStore: VectorStoreValue): RetrievalMatch[] => chunks
  .map((chunk, index) => {
    const score = vectorStore === "dot"
      ? dotProduct(queryEmbedding, chunkEmbeddings[index] ?? [])
      : cosineSimilarity(queryEmbedding, chunkEmbeddings[index] ?? []);

    return {
      rank: 0,
      chunk_index: index,
      score,
      text: chunk.text,
    } satisfies RetrievalMatch;
  })
  .sort((left, right) => right.score - left.score)
  .map((match, index) => ({ ...match, rank: index + 1 }));

const buildCandidateRetrieval = (matches: RetrievalMatch[], vectorStore: VectorStoreValue, topK: number): CandidateRetrievalResult => ({
  distance_metric: vectorStore,
  candidate_count: matches.length,
  selected_top_k: clamp(topK, 1, Math.max(1, matches.length || 1)),
  threshold_rank: clamp(topK, 1, Math.max(1, matches.length || 1)),
  candidates: matches,
  retrieval_notes: [
    "This stage scores every indexed chunk against the processed query embedding.",
    `Candidates are ordered by ${vectorStore} similarity before later stages focus on the selected top-k set.`,
    "The cutoff line marks which candidates move forward into the final semantic search result set.",
    matches.length ? `The current query produced ${matches.length} scored candidates.` : "No candidates were produced because there are no indexed chunks yet.",
  ],
});

const selectTopK = (matches: RetrievalMatch[], topK: number): RetrievalMatch[] => matches.slice(0, clamp(topK, 1, Math.max(1, matches.length)));

const buildFiltering = (
  candidates: RetrievalMatch[],
  chunks: Chunk[],
  keywordTokens: string[],
  minScore: number,
  requireKeywordOverlap: boolean,
  minWordCount: number,
): FilteringResult => {
  const keywordSet = new Set(keywordTokens);
  const kept: RetrievalMatch[] = [];
  const removed: RetrievalMatch[] = [];

  for (const candidate of candidates) {
    const chunk = chunks[candidate.chunk_index];
    const chunkTokens = new Set(tokenizeWords(chunk?.text ?? ""));
    const hasKeywordOverlap = !keywordSet.size || [...keywordSet].some((token) => chunkTokens.has(token));
    const passesScore = candidate.score >= minScore;
    const passesWordCount = (chunk?.word_count ?? 0) >= minWordCount;
    const passesKeyword = requireKeywordOverlap ? hasKeywordOverlap : true;

    if (passesScore && passesWordCount && passesKeyword) {
      kept.push(candidate);
    } else {
      removed.push(candidate);
    }
  }

  return {
    settings: {
      min_score: minScore,
      require_keyword_overlap: requireKeywordOverlap,
      min_word_count: minWordCount,
    },
    input_count: candidates.length,
    kept_count: kept.length,
    removed_count: removed.length,
    filtered_candidates: kept,
    removed_candidates: removed,
    filtering_notes: [
      `Minimum similarity score: ${minScore.toFixed(2)}.`,
      `Minimum chunk word count: ${minWordCount}.`,
      requireKeywordOverlap
        ? "Keyword-overlap filtering is enabled, so a candidate must share at least one processed query token."
        : "Keyword-overlap filtering is disabled, so lexical overlap is not required.",
      removed.length
        ? `${removed.length} candidate(s) were removed before the final semantic search view.`
        : "No candidates were removed by the current filters.",
    ],
  };
};

export async function runLocalPipeline(input: PipelineInput): Promise<PipelineResponse> {
  const sourceText = normalizeSource(input.sourceText);
  const queryProcessing = buildQueryProcessing(input.query);
  const chunks = await buildChunks(sourceText, input.chunker, input.chunkSize, input.chunkOverlap);
  const embeddingResources = buildEmbeddingResources(chunks, input.embeddingModel);
  const chunkEmbeddings = chunks.map((chunk) => embedText(chunk.text, embeddingResources));
  const vectorIndex = buildVectorIndex(chunkEmbeddings, input.vectorStore, input.embeddingModel, chunks.length);
  const queryEmbedding = embedText(queryProcessing.normalized_query, embeddingResources);
  const scoredCandidates = scoreChunks(chunks, chunkEmbeddings, queryEmbedding, input.vectorStore);
  const candidateRetrieval = buildCandidateRetrieval(scoredCandidates, input.vectorStore, input.topK);
  const candidateWindow = selectTopK(scoredCandidates, input.topK);
  const filtering = buildFiltering(
    candidateWindow,
    chunks,
    queryProcessing.keyword_tokens,
    input.minScore,
    input.requireKeywordOverlap,
    input.minWordCount,
  );
  const retrievedChunks = filtering.filtered_candidates;
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
    query_processing: queryProcessing,
    candidate_retrieval: candidateRetrieval,
    filtering,
    chunks,
    chunk_embeddings: chunkEmbeddings,
    vector_index: vectorIndex,
    query_embedding: queryEmbedding,
    retrieved_chunks: retrievedChunks,
  };
}