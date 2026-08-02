from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


class PipelineRunRequest(BaseModel):
    query: str
    dataset_id: str | None = None


@router.post("/run")
def run_pipeline(request: PipelineRunRequest) -> dict:
    return {
        "query": request.query,
        "dataset_id": request.dataset_id,
        "status": "stubbed",
        "message": "Pipeline scaffold is ready for Milestone 2 implementation.",
    }
