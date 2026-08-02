const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type DatasetSummary = {
  id: string;
  name: string;
  description: string;
  source: string;
  recommended_chunker: string;
  preview: string;
};

export type HealthResponse = {
  status: string;
  app_name: string;
  environment: string;
  version: string;
};

export type ContractResponse = {
  service: string;
  endpoints: Array<{ method: string; path: string; purpose: string }>;
  note: string;
};

export type PipelineStep = {
  id: string;
  title: string;
  description: string;
  explanation: string;
};

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

export type PipelineVisuals = {
  chunk_lengths: number[];
  scores: number[];
  retrieved_indices: number[];
  embedding_provider: string;
  embedding_model: string;
  vector_store_backend: string;
  source_kind: string;
  top_k: number;
  chunker: string;
};

export type PipelineResponse = {
  query: string;
  dataset: DatasetSummary;
  loader: string;
  chunker: string;
  embedding_provider: string;
  embedding_model: string;
  vector_store: string;
  llm_provider: string;
  answer: string;
  context: string;
  chunks: Chunk[];
  retrieved_chunks: RetrievalMatch[];
  steps: PipelineStep[];
  visuals: PipelineVisuals;
};

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${path} request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getHealth() {
  return requestJson<HealthResponse>("/api/v1/health");
}

export function getContracts() {
  return requestJson<ContractResponse>("/api/v1/contracts");
}

export function getDatasets() {
  return requestJson<{ items: DatasetSummary[] }>("/api/v1/datasets");
}

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
