from fastapi import APIRouter, Form

from app.schemas import ChunkerName, PipelineRunResponse, VectorStoreName
from app.services.pipeline import run_pipeline

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


@router.post("/run", response_model=PipelineRunResponse)
async def run_pipeline_endpoint(
    query: str = Form(...),
    source_text: str | None = Form(default=None),
    dataset_id: str | None = Form(default=None),
    source_title: str | None = Form(default=None),
    chunker: ChunkerName = Form(default="recursive"),
    chunk_size: int = Form(default=320),
    chunk_overlap: int = Form(default=50),
    embedding_model: str = Form(default="tfidf"),
    vector_store: VectorStoreName = Form(default="faiss"),
    top_k: int = Form(default=3),
) -> PipelineRunResponse:
    return await run_pipeline(
        query=query,
        source_text=source_text,
        dataset_id=dataset_id,
        source_title=source_title,
        chunker=chunker,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        embedding_model=embedding_model,
        vector_store=vector_store,
        top_k=top_k,
    )

