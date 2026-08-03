const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type Chunk = {
  index: number;
  text: string;
  char_count: number;
  word_count: number;
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

export async function runPipeline(formData: FormData) {
  const response = await fetch(`${apiBaseUrl}/api/v1/pipeline/run`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Pipeline request failed: ${response.status}`);
  }

  return response.json() as Promise<PipelineResponse>;
}
