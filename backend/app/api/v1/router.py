from fastapi import APIRouter

from app.api.v1.contracts import router as contracts_router
from app.api.v1.datasets import router as datasets_router
from app.api.v1.health import router as health_router
from app.api.v1.pipeline import router as pipeline_router
from app.api.v1.visualizations import router as visualizations_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router)
api_router.include_router(contracts_router)
api_router.include_router(datasets_router)
api_router.include_router(pipeline_router)
api_router.include_router(visualizations_router)
