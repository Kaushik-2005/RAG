from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    app_name: str
    environment: str
    version: str


class ContractEndpoint(BaseModel):
    method: str
    path: str
    purpose: str


class ContractResponse(BaseModel):
    service: str
    endpoints: list[ContractEndpoint]
    note: str = Field(default="Initial foundation contract")


class DemoDatasetSummary(BaseModel):
    id: str
    name: str
    description: str
    source: str = "built-in"
    recommended_chunker: str = "recursive"
    preview: str


class DemoDatasetDetail(DemoDatasetSummary):
    content: str
    topics: list[str] = Field(default_factory=list)


ChunkerName = Literal["character", "recursive", "token", "markdown"]
VectorStoreName = Literal["faiss", "chroma"]


class ChunkModel(BaseModel):
    index: int
    text: str
    char_count: int
    word_count: int
    start_char: int
    end_char: int


class RetrievalMatch(BaseModel):
    rank: int
    chunk_index: int
    score: float
    text: str


class PipelineRunResponse(BaseModel):
    query: str
    source_title: str
    source_kind: str
    chunker: ChunkerName
    chunk_size: int
    chunk_overlap: int
    embedding_backend: str
    embedding_model: str
    embedding_dimension: int
    vector_store: VectorStoreName
    vector_store_backend: str
    top_k: int
    answer: str
    context: str
    chunks: list[ChunkModel]
    chunk_embeddings: list[list[float]]
    query_embedding: list[float]
    retrieved_chunks: list[RetrievalMatch]


class PipelineRunRequest(BaseModel):
    query: str = Field(min_length=1)
    source_text: str | None = None
    dataset_id: str | None = None
    source_title: str | None = None
    chunker: ChunkerName = "recursive"
    chunk_size: int = Field(default=320, ge=32, le=4000)
    chunk_overlap: int = Field(default=50, ge=0, le=2000)
    embedding_model: str = "tfidf"
    vector_store: VectorStoreName = "faiss"
    top_k: int = Field(default=3, ge=1, le=8)

