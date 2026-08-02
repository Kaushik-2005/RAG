from fastapi import APIRouter, HTTPException

from app.schemas import DemoDatasetDetail
from app.services.pipeline import get_dataset, list_dataset_summaries

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("")
def list_datasets() -> dict:
    return {"items": list_dataset_summaries()}


@router.get("/{dataset_id}", response_model=DemoDatasetDetail)
def get_dataset_detail(dataset_id: str) -> DemoDatasetDetail:
    dataset = get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset
