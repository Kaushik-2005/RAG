export type Chunk = {
  index: number;
  document_id: string;
  document_title: string;
  document_chunk_index: number;
  text: string;
  char_count: number;
  word_count: number;
  token_count?: number;
  start_char: number;
  end_char: number;
};

export type RetrievalMatch = {
  rank: number;
  chunk_index: number;
  document_id: string;
  document_title: string;
  document_chunk_index: number;
  score: number;
  text: string;
};

export type QueryProcessingResult = {
  original_query: string;
  normalized_query: string;
  expanded_query: string;
  lowered_query: string;
  token_count: number;
  keyword_tokens: string[];
  processing_notes: string[];
};

export type CandidateRetrievalResult = {
  distance_metric: string;
  candidate_count: number;
  selected_top_k: number;
  threshold_rank: number;
  candidates: RetrievalMatch[];
  retrieval_notes: string[];
};

export type RerankedCandidate = {
  original_rank: number;
  reranked_rank: number;
  chunk_index: number;
  document_id: string;
  document_title: string;
  document_chunk_index: number;
  semantic_score: number;
  rerank_bonus: number;
  final_score: number;
  reason_labels: string[];
  text: string;
};

export type RerankingResult = {
  strategy: string;
  input_count: number;
  reranked_count: number;
  cutoff_rank: number;
  reranked_candidates: RerankedCandidate[];
  reranking_notes: string[];
};

export type FilteringSettings = {
  min_score: number;
  require_keyword_overlap: boolean;
  min_word_count: number;
};

export type FilteringResult = {
  settings: FilteringSettings;
  input_count: number;
  kept_count: number;
  removed_count: number;
  filtered_candidates: RetrievalMatch[];
  removed_candidates: RetrievalMatch[];
  filtering_notes: string[];
};

export type DocumentIndexSummary = {
  document_id: string;
  document_title: string;
  chunk_count: number;
};

export type VectorIndexResult = {
  index_type: string;
  distance_metric: string;
  vector_dimension: number;
  item_count: number;
  document_count: number;
  document_chunk_counts: DocumentIndexSummary[];
  build_notes: string[];
};

export type ContextBlock = {
  citation_id: string;
  document_title: string;
  document_chunk_index: number;
  score: number;
  text: string;
  char_count: number;
  token_count: number;
};

export type ContextConstructionResult = {
  block_count: number;
  total_characters: number;
  total_tokens: number;
  assembled_context: string;
  blocks: ContextBlock[];
  construction_notes: string[];
};

export type CitationItem = {
  citation_id: string;
  document_title: string;
  document_chunk_index: number;
  score: number;
  char_count: number;
  snippet: string;
};

export type EvaluationResult = {
  groundedness_score: number;
  query_coverage_score: number;
  citation_coverage_score: number;
  answer_word_count: number;
  context_block_count: number;
  verdict: string;
  notes: string[];
};

export type PipelineResponse = {
  query: string;
  source_title: string;
  source_kind: string;
  chunker: string;
  chunk_size: number;
  chunk_overlap: number;
  embedding_backend: string;
  embedding_model: string;
  embedding_dimension: number;
  vector_store: string;
  vector_store_backend: string;
  top_k: number;
  answer: string;
  context: string;
  query_processing: QueryProcessingResult;
  candidate_retrieval: CandidateRetrievalResult;
  reranking: RerankingResult;
  filtering: FilteringResult;
  context_construction: ContextConstructionResult;
  citations: CitationItem[];
  evaluation: EvaluationResult | null;
  active_document_chunks: Chunk[];
  chunks: Chunk[];
  chunk_embeddings: number[][];
  vector_index: VectorIndexResult;
  query_embedding: number[];
  retrieved_chunks: RetrievalMatch[];
};

export async function generateGroundedAnswer(input: { query: string; context: string; model?: string }) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as { answer?: string; error?: string; details?: string };

  if (!response.ok || !payload.answer) {
    const message = payload.details
      ? `${payload.error ?? `Generation request failed: ${response.status}`}\n${payload.details}`
      : (payload.error ?? `Generation request failed: ${response.status}`);
    throw new Error(message);
  }

  return payload.answer;
}