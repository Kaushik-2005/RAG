from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["app_name"] == "RAG Lab API"


def test_contract_endpoint() -> None:
    response = client.get("/api/v1/contracts")
    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "rag-lab-backend"
    assert len(payload["endpoints"]) >= 4


def test_datasets_endpoint() -> None:
    response = client.get("/api/v1/datasets")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) >= 3


def test_pipeline_endpoint() -> None:
    response = client.post(
        "/api/v1/pipeline/run",
        data={
            "query": "What is RAG?",
            "dataset_id": "intro-rag",
            "chunker": "recursive",
            "vector_store": "faiss",
            "top_k": 3,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["query"] == "What is RAG?"
    assert payload["source_title"] == "Intro to RAG"
    assert payload["source_kind"] == "built-in"
    assert payload["chunker"] == "recursive"
    assert payload["chunks"]
    assert payload["retrieved_chunks"]
    assert payload["answer"]
