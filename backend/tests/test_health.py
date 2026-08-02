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
