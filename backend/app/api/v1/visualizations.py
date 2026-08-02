from fastapi import APIRouter

router = APIRouter(prefix="/visualizations", tags=["visualizations"])


@router.get("")
def list_visualizations() -> dict:
    return {
        "items": [
            {"id": "pipeline", "name": "Pipeline Flow"},
            {"id": "datasets", "name": "Dataset Explorer"},
        ]
    }
