import {
  CharacterTextSplitter,
  MarkdownTextSplitter,
  RecursiveCharacterTextSplitter,
  TokenTextSplitter,
} from "@langchain/textsplitters";
import { getEncoding } from "js-tiktoken";

import type {
  CandidateRetrievalResult,
  Chunk,
  CitationItem,
  ContextConstructionResult,
  EvaluationResult,
  FilteringResult,
  PipelineResponse,
  QueryProcessingResult,
  RerankedCandidate,
  RerankingResult,
  RetrievalMatch,
  VectorIndexResult,
} from "@/lib/api";
import type { CorpusDocument } from "@/lib/demo-corpus";
import type { ChunkerValue, EmbeddingValue, VectorStoreValue } from "@/app/experiment/components/experiment-content";

type PipelineInput = {
  query: string;
  documents: CorpusDocument[];
  activeDocumentId: string;
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
const tokenizeWords = (value: string): string[] => value.toLowerCase().match(TOKEN_PATTERN) ?? [];
const normalizeQueryText = (value: string) => value.replace(/\s+/g, " ").trim();
const expandQueryText = (value: string) => value
  .replace(/\brag\b/gi, "retrieval augmented generation RAG")
  .replace(/\bllm\b/gi, "large language model LLM");
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clampUnit = (value: number) => Math.max(0, Math.min(1, value));
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

const createSplitter = (chunker: ChunkerValue, chunkSize: number, chunkOverlap: number) => {
  const safeChunkSize = clamp(chunkSize, 32, Math.max(32, chunkSize));
  const safeOverlap = clamp(chunkOverlap, 0, Math.max(0, safeChunkSize - 1));
  const common = {
    chunkSize: safeChunkSize,
    chunkOverlap: safeOverlap,
    keepSeparator: true,
    stripWhitespace: false,
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

const mapChunkTextsToChunks = (document: CorpusDocument, sourceText: string, chunkTexts: string[], chunkOverlap: number, globalStartIndex: number): Chunk[] => {
  const chunks: Chunk[] = [];
  const overlapWindow = Math.max(0, chunkOverlap) + 256;
  let cursor = 0;

  for (const rawText of chunkTexts) {
    const text = rawText;
    const visibleText = text.trim();
    if (!visibleText) continue;

    const preferredStart = Math.max(0, cursor - overlapWindow);
    let start = sourceText.indexOf(text, preferredStart);

    if (start === -1) start = sourceText.indexOf(text);
    if (start === -1) start = fallbackLocateChunk(sourceText, text, preferredStart);
    if (start === -1) start = fallbackLocateChunk(sourceText, text, 0);
    if (start === -1) continue;

    const end = start + text.length;
    const documentChunkIndex = chunks.length;
    chunks.push({
      index: globalStartIndex + documentChunkIndex,
      document_id: document.id,
      document_title: document.title,
      document_chunk_index: documentChunkIndex,
      text,
      char_count: text.length,
      word_count: tokenizeWords(visibleText).length,
      token_count: countTokens(text),
      start_char: start,
      end_char: end,
    });
    cursor = end;
  }

  return chunks;
};

const buildChunksForDocument = async (document: CorpusDocument, chunker: ChunkerValue, chunkSize: number, chunkOverlap: number, globalStartIndex = 0) => {
  const normalizedSource = normalizeSource(document.text);
  if (!normalizedSource) return [] as Chunk[];

  const splitter = createSplitter(chunker, chunkSize, chunkOverlap);
  const chunkTexts = await splitter.splitText(normalizedSource);
  return mapChunkTextsToChunks({ ...document, title: document.title.trim() || "Untitled document" }, normalizedSource, chunkTexts, chunkOverlap, globalStartIndex);
};

const buildChunksForCorpus = async (documents: CorpusDocument[], chunker: ChunkerValue, chunkSize: number, chunkOverlap: number) => {
  let nextGlobalIndex = 0;
  const allChunks: Chunk[] = [];

  for (const document of documents) {
    const docChunks = await buildChunksForDocument(document, chunker, chunkSize, chunkOverlap, nextGlobalIndex);
    allChunks.push(...docChunks);
    nextGlobalIndex += docChunks.length;
  }

  return allChunks;
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

const buildVectorIndex = (chunkEmbeddings: number[][], vectorStore: VectorStoreValue, embeddingModel: EmbeddingValue, chunks: Chunk[]): VectorIndexResult => {
  const documentChunkCountsMap = new Map<string, { document_id: string; document_title: string; chunk_count: number }>();

  for (const chunk of chunks) {
    const existing = documentChunkCountsMap.get(chunk.document_id);
    if (existing) {
      existing.chunk_count += 1;
    } else {
      documentChunkCountsMap.set(chunk.document_id, {
        document_id: chunk.document_id,
        document_title: chunk.document_title,
        chunk_count: 1,
      });
    }
  }

  const documentChunkCounts = [...documentChunkCountsMap.values()];

  return {
    index_type: "flat-array",
    distance_metric: vectorStore,
    vector_dimension: chunkEmbeddings[0]?.length ?? 0,
    item_count: chunks.length,
    document_count: documentChunkCounts.length,
    document_chunk_counts: documentChunkCounts,
    build_notes: [
      `The full corpus contributes ${documentChunkCounts.length} document(s) to the index.`,
      `A total of ${chunks.length} chunk vectors are stored in one browser-side flat array index.`,
      `Distance metric configured for retrieval: ${vectorStore}.`,
      `Embedding model used to produce the vectors: ${embeddingModel}.`,
      chunks.length ? "The corpus index is ready for query-time retrieval." : "No chunks are indexed yet. Run an earlier stage or adjust chunking first.",
    ],
  };
};

const buildQueryProcessing = (query: string): QueryProcessingResult => {
  const normalizedQuery = normalizeQueryText(query);
  const expandedQuery = expandQueryText(normalizedQuery);
  const keywordTokens = Array.from(new Set(tokenizeWords(expandedQuery))).slice(0, 12);
  const expansionApplied = expandedQuery !== normalizedQuery;

  return {
    original_query: query,
    normalized_query: normalizedQuery,
    expanded_query: expandedQuery,
    lowered_query: normalizedQuery.toLowerCase(),
    token_count: countTokens(expandedQuery),
    keyword_tokens: keywordTokens,
    processing_notes: [
      "Whitespace is normalized before embedding so accidental spacing does not change the query form.",
      expansionApplied
        ? `Query expansion added domain terms for retrieval: ${expandedQuery}.`
        : "No domain-specific query expansion was applied.",
      "A lowered form is kept for lightweight lexical inspection and debugging.",
      "Keyword tokens show the content-bearing terms that survive normalization and expansion.",
      "Later production systems may add stronger rewriting, classification, or safety checks here.",
    ],
  };
};

const detectDefinitionIntent = (query: string) => {
  const lowered = query.toLowerCase();
  return /\bwhat\s+is\b|\bdefine\b|\bdefinition\b|\bstands\s+for\b/.test(lowered);
};

const buildRerankSignals = (query: string, chunk: Chunk) => {
  const loweredQuery = query.toLowerCase();
  const loweredText = chunk.text.toLowerCase();
  const loweredTitle = chunk.document_title.toLowerCase();
  const reasonLabels: string[] = [];
  let bonus = 0;

  const definitionIntent = detectDefinitionIntent(query);
  const asksAboutRag = /\brag\b|retrieval\s+augmented\s+generation/.test(loweredQuery);

  if (definitionIntent && chunk.document_chunk_index <= 2) {
    bonus += 0.18;
    reasonLabels.push("Lead chunk bonus");
  }

  if (definitionIntent && /( is | refers to | is the process of | is a system pattern that | is a pipeline )/.test(` ${loweredText} `)) {
    bonus += 0.14;
    reasonLabels.push("Definitional phrasing");
  }

  if (asksAboutRag && loweredTitle.includes("rag overview")) {
    bonus += 0.22;
    reasonLabels.push("RAG overview title match");
  }

  if (asksAboutRag && /retrieval-augmented generation|retrieval augmented generation/.test(loweredText)) {
    bonus += 0.26;
    reasonLabels.push("Exact concept mention");
  }

  if (/chunk|chunking/.test(loweredQuery) && loweredTitle.includes("chunking guide")) {
    bonus += 0.24;
    reasonLabels.push("Chunking title match");
  }

  if (/vector\s+index|index|vector\s+store/.test(loweredQuery) && loweredTitle.includes("vector search notes")) {
    bonus += 0.24;
    reasonLabels.push("Vector index title match");
  }

  if (/retrieval|filtering|candidate|query/.test(loweredQuery) && loweredTitle.includes("retrieval operations")) {
    bonus += 0.18;
    reasonLabels.push("Retrieval operations title match");
  }

  const keywordOverlap = tokenizeWords(loweredQuery).filter((token) => token.length > 2 && loweredText.includes(token)).length;
  if (keywordOverlap > 0) {
    bonus += Math.min(keywordOverlap * 0.02, 0.12);
    reasonLabels.push(`Keyword overlap ×${keywordOverlap}`);
  }

  return { bonus, reasonLabels };
};

const scoreChunks = (chunks: Chunk[], chunkEmbeddings: number[][], queryEmbedding: number[], vectorStore: VectorStoreValue): RetrievalMatch[] => chunks
  .map((chunk, index) => {
    const score = vectorStore === "dot"
      ? dotProduct(queryEmbedding, chunkEmbeddings[index] ?? [])
      : cosineSimilarity(queryEmbedding, chunkEmbeddings[index] ?? []);

    return {
      rank: 0,
      chunk_index: index,
      document_id: chunk.document_id,
      document_title: chunk.document_title,
      document_chunk_index: chunk.document_chunk_index,
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
    `Candidates are ordered only by ${vectorStore} similarity at this point.`,
    "The selected top-k window is passed to the reranking stage for query-aware reordering.",
    matches.length ? `The current query produced ${matches.length} scored candidates across the corpus.` : "No candidates were produced because there are no indexed chunks yet.",
  ],
});

const selectTopK = (matches: RetrievalMatch[], topK: number): RetrievalMatch[] => matches.slice(0, clamp(topK, 1, Math.max(1, matches.length || 1)));

const buildReranking = (matches: RetrievalMatch[], chunks: Chunk[], topK: number, query: string): RerankingResult => {
  const candidateWindow = selectTopK(matches, topK);
  const rerankedCandidates = candidateWindow
    .map((match) => {
      const chunk = chunks[match.chunk_index];
      const signals = buildRerankSignals(query, chunk);
      return {
        original_rank: match.rank,
        reranked_rank: 0,
        chunk_index: match.chunk_index,
        document_id: match.document_id,
        document_title: match.document_title,
        document_chunk_index: match.document_chunk_index,
        semantic_score: match.score,
        rerank_bonus: signals.bonus,
        final_score: match.score + signals.bonus,
        reason_labels: signals.reasonLabels,
        text: match.text,
      } satisfies RerankedCandidate;
    })
    .sort((left, right) => right.final_score - left.final_score)
    .map((candidate, index) => ({ ...candidate, reranked_rank: index + 1 }));

  return {
    strategy: "heuristic-query-aware-reranker",
    input_count: candidateWindow.length,
    reranked_count: rerankedCandidates.length,
    cutoff_rank: candidateWindow.length,
    reranked_candidates: rerankedCandidates,
    reranking_notes: [
      "Reranking reorders the top-k retrieval window instead of rescoring the full corpus.",
      detectDefinitionIntent(query)
        ? "Definition-style queries receive bonuses for lead chunks, definitional phrasing, and likely source documents."
        : "This reranker applies lightweight query-aware bonuses on top of semantic retrieval scores.",
      rerankedCandidates.length
        ? `The reranker inspected ${rerankedCandidates.length} candidate(s) from the retrieval window.`
        : "No candidates entered the reranking stage.",
    ],
  };
};

const buildFiltering = (
  candidates: RerankedCandidate[],
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
    const passesScore = candidate.final_score >= minScore;
    const passesWordCount = (chunk?.word_count ?? 0) >= minWordCount;
    const passesKeyword = requireKeywordOverlap ? hasKeywordOverlap : true;

    const match: RetrievalMatch = {
      rank: candidate.reranked_rank,
      chunk_index: candidate.chunk_index,
      document_id: candidate.document_id,
      document_title: candidate.document_title,
      document_chunk_index: candidate.document_chunk_index,
      score: candidate.final_score,
      text: candidate.text,
    };

    if (passesScore && passesWordCount && passesKeyword) {
      kept.push(match);
    } else {
      removed.push(match);
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
      `Minimum final reranked score: ${minScore.toFixed(2)}.`,
      `Minimum chunk word count: ${minWordCount}.`,
      requireKeywordOverlap
        ? "Keyword-overlap filtering is enabled, so a candidate must share at least one processed query token."
        : "Keyword-overlap filtering is disabled, so lexical overlap is not required.",
      removed.length
        ? `${removed.length} candidate(s) were removed after reranking and before the final semantic-search view.`
        : "No candidates were removed by the current filters.",
    ],
  };
};

const buildContextConstruction = (retrievedChunks: RetrievalMatch[], chunks: Chunk[]): ContextConstructionResult => {
  const blocks = retrievedChunks.map((match, index) => {
    const chunk = chunks[match.chunk_index];
    const citation_id = `[${index + 1}]`;
    return {
      citation_id,
      document_title: match.document_title,
      document_chunk_index: match.document_chunk_index,
      score: match.score,
      text: match.text,
      char_count: chunk?.char_count ?? match.text.length,
      token_count: chunk?.token_count ?? countTokens(match.text),
    };
  });

  const assembled_context = blocks
    .map((block) => `${block.citation_id} ${block.document_title} · Chunk ${block.document_chunk_index + 1}\n${block.text}`)
    .join("\n\n");

  return {
    block_count: blocks.length,
    total_characters: blocks.reduce((sum, block) => sum + block.char_count, 0),
    total_tokens: blocks.reduce((sum, block) => sum + block.token_count, 0),
    assembled_context,
    blocks,
    construction_notes: [
      `Context is built from ${blocks.length} retrieved block(s) that survived filtering.`,
      "Each block keeps its source identity so later answer generation can remain attributable.",
      blocks.length ? "The context is ordered by the surviving retrieval rank." : "No blocks are available to assemble into context.",
    ],
  };
};

const buildCitations = (contextConstruction: ContextConstructionResult): CitationItem[] => contextConstruction.blocks.map((block) => ({
  citation_id: block.citation_id,
  document_title: block.document_title,
  document_chunk_index: block.document_chunk_index,
  score: block.score,
  char_count: block.char_count,
  snippet: block.text.slice(0, 220),
}));

export const evaluateGeneratedAnswer = (answer: string, query: string, contextConstruction: ContextConstructionResult, citations: CitationItem[]): EvaluationResult => {
  const normalizedAnswer = answer.trim();
  const answerTerms = Array.from(new Set(tokenizeWords(normalizedAnswer)));
  const answerTokens = tokenizeWords(normalizedAnswer);
  const queryTerms = Array.from(new Set(tokenizeWords(query))).filter((token) => token.length > 2);
  const contextTokens = new Set(tokenizeWords(contextConstruction.assembled_context));
  const answerTermHits = answerTerms.filter((token) => contextTokens.has(token)).length;
  const groundedness = answerTerms.length ? answerTermHits / answerTerms.length : 0;
  const queryHits = queryTerms.filter((token) => answerTokens.includes(token)).length;
  const queryCoverage = queryTerms.length ? queryHits / queryTerms.length : 1;
  const citationCoverage = contextConstruction.block_count ? citations.length / contextConstruction.block_count : 0;
  const abstained = /i do not know based on the provided context/i.test(normalizedAnswer);

  const verdict = abstained
    ? "Abstained from unsupported answer"
    : groundedness >= 0.72 && queryCoverage >= 0.45
      ? "Reasonably grounded answer"
      : groundedness >= 0.5
        ? "Partially grounded answer"
        : "Low grounding confidence";

  return {
    groundedness_score: clampUnit(groundedness),
    query_coverage_score: clampUnit(queryCoverage),
    citation_coverage_score: clampUnit(citationCoverage),
    answer_word_count: answerTokens.length,
    context_block_count: contextConstruction.block_count,
    verdict,
    notes: [
      abstained
        ? "The model abstained, which is acceptable when the retrieved context does not support the question."
        : `About ${Math.round(clampUnit(groundedness) * 100)}% of distinct answer terms also appear in the assembled context.`,
      `About ${Math.round(clampUnit(queryCoverage) * 100)}% of normalized query terms appear in the answer text.`,
      citations.length
        ? `${citations.length} citation block(s) are available to justify the answer.`
        : "No citation blocks are available, so answer attribution is weak.",
    ],
  };
};

export async function runLocalPipeline(input: PipelineInput): Promise<PipelineResponse> {
  const activeDocument = input.documents.find((document) => document.id === input.activeDocumentId) ?? input.documents[0];
  if (!activeDocument) {
    throw new Error("No corpus documents are available.");
  }

  const queryProcessing = buildQueryProcessing(input.query);
  const activeDocumentChunks = await buildChunksForDocument(activeDocument, input.chunker, input.chunkSize, input.chunkOverlap);
  const chunks = await buildChunksForCorpus(input.documents, input.chunker, input.chunkSize, input.chunkOverlap);
  const embeddingResources = buildEmbeddingResources(chunks, input.embeddingModel);
  const chunkEmbeddings = chunks.map((chunk) => embedText(chunk.text, embeddingResources));
  const vectorIndex = buildVectorIndex(chunkEmbeddings, input.vectorStore, input.embeddingModel, chunks);
  const queryEmbedding = embedText(queryProcessing.expanded_query, embeddingResources);
  const scoredCandidates = scoreChunks(chunks, chunkEmbeddings, queryEmbedding, input.vectorStore);
  const candidateRetrieval = buildCandidateRetrieval(scoredCandidates, input.vectorStore, input.topK);
  const reranking = buildReranking(scoredCandidates, chunks, input.topK, input.query);
  const filtering = buildFiltering(
    reranking.reranked_candidates,
    chunks,
    queryProcessing.keyword_tokens,
    input.minScore,
    input.requireKeywordOverlap,
    input.minWordCount,
  );
  const retrievedChunks = filtering.filtered_candidates;
  const contextConstruction = buildContextConstruction(retrievedChunks, chunks);
  const citations = buildCitations(contextConstruction);
  const context = contextConstruction.assembled_context;
  const embeddingDimension = chunkEmbeddings[0]?.length ?? queryEmbedding.length ?? 0;

  return {
    query: input.query,
    source_title: activeDocument.title,
    source_kind: activeDocument.sourceKind,
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
    reranking,
    filtering,
    context_construction: contextConstruction,
    citations,
    evaluation: null,
    active_document_chunks: activeDocumentChunks,
    chunks,
    chunk_embeddings: chunkEmbeddings,
    vector_index: vectorIndex,
    query_embedding: queryEmbedding,
    retrieved_chunks: retrievedChunks,
  };
}