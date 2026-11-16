from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "version": "1"}
    
def test_database_health_endpoint():
    response = client.get("/v1/health/database")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "version": "1"}