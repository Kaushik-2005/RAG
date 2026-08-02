from fastapi import APIRouter

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("")
def list_datasets() -> dict:
    return {
        "items": [
            {"id": "demo-1", "name": "Intro RAG Demo", "source": "built-in"},
            {"id": "demo-2", "name": "Document Upload Demo", "source": "built-in"},
        ]
    }
