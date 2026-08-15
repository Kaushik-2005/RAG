export type Chunk = {
  index: number;
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
  score: number;
  text: string;
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
  chunks: Chunk[];
  chunk_embeddings: number[][];
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

  const payload = (await response.json()) as { answer?: string; error?: string };

  if (!response.ok || !payload.answer) {
    throw new Error(payload.error ?? `Generation request failed: ${response.status}`);
  }

  return payload.answer;
}