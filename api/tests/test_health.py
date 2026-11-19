from fastapi.testclient import TestClient
from api.main import app
import pytest

client = TestClient(app)



@pytest.mark.skip(reason="This test is currently skipped because the database health check is not implemented yet.")
def test_health_endpoint():
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "version": "1"}
    
@pytest.mark.skip(reason="This test is currently skipped because the database health check is not implemented yet.")
def test_database_health_endpoint():
    response = client.get("/v1/health/database")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "version": "1"}