from typing import Any, Literal

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


class PipelineStep(BaseModel):
    id: str
    title: str
    description: str
    explanation: str


class PipelineRunResponse(BaseModel):
    query: str
    dataset: DemoDatasetSummary
    loader: str
    chunker: ChunkerName
    embedding_provider: str
    embedding_model: str
    vector_store: VectorStoreName
    llm_provider: str
    answer: str
    context: str
    chunks: list[ChunkModel]
    retrieved_chunks: list[RetrievalMatch]
    steps: list[PipelineStep]
    visuals: dict[str, Any]


class PipelineRunRequest(BaseModel):
    query: str = Field(min_length=1)
    dataset_id: str | None = None
    chunker: ChunkerName = "recursive"
    vector_store: VectorStoreName = "faiss"
    top_k: int = Field(default=3, ge=1, le=8)
