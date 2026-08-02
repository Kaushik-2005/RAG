from fastapi import APIRouter, Form

from app.schemas import ChunkerName, PipelineRunResponse, VectorStoreName
from app.services.pipeline import run_pipeline

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


@router.post("/run", response_model=PipelineRunResponse)
async def run_pipeline_endpoint(
    query: str = Form(...),
    dataset_id: str | None = Form(default=None),
    chunker: ChunkerName = Form(default="recursive"),
    vector_store: VectorStoreName = Form(default="faiss"),
    top_k: int = Form(default=3),
) -> PipelineRunResponse:
    return await run_pipeline(
        query=query,
        dataset_id=dataset_id,
        chunker=chunker,
        vector_store=vector_store,
        top_k=top_k,
    )
