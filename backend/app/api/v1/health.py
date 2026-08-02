from fastapi import APIRouter

from app.core.config import settings
from app.schemas import HealthResponse

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(
        app_name=settings.app_name,
        environment=settings.app_env,
        version="0.2.0",
    )
