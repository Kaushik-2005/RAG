from fastapi import APIRouter

from app.schemas import ContractEndpoint, ContractResponse

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.get("", response_model=ContractResponse)
def get_contracts() -> ContractResponse:
    return ContractResponse(
        service="rag-lab-backend",
        endpoints=[
            ContractEndpoint(method="GET", path="/api/v1/health", purpose="Service health"),
            ContractEndpoint(method="GET", path="/api/v1/contracts", purpose="API contract summary"),
            ContractEndpoint(method="GET", path="/api/v1/datasets", purpose="Dataset catalog"),
            ContractEndpoint(method="POST", path="/api/v1/pipeline/run", purpose="Pipeline execution"),
            ContractEndpoint(method="GET", path="/api/v1/visualizations", purpose="Visualization metadata"),
        ],
    )
