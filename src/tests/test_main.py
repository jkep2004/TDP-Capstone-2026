from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)
with open("./src/test-data/sample_customer_spending.csv", "r") as file: # Read sample CSV data and convert it to a list of dictionaries for testing 
    sample_csv_data = file.read()
    sample_csv_lines = sample_csv_data.splitlines()
    sample_csv_headers = sample_csv_lines[0].split(",")
    sample_csv_dict = [
        dict(zip(sample_csv_headers, line.split(","))) for line in sample_csv_lines[1:]
    ]
    # print("Sample CSV Data:", sample_csv_dict)  # Debugging: print the parsed CSV data

def test_health_endpoint():
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
    
def test_calculate_endpoint():
    
    transaction_data = [
        {"category": "food", "amount": float(sample_csv_dict[0]["food"])},
        {"category": "travel", "amount": float(sample_csv_dict[1]["travel"])}
    ]
    
    payload = {
        "spending": transaction_data
    }
    
    response = client.post("/v1/calculate", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "success"
    assert data["totalCarbonKg"] == 0
    assert len(data["breakdown"]) == 2
    
    assert data["breakdown"][0]["category"] == transaction_data[0]["category"]
    assert data["breakdown"][0]["amount"] == transaction_data[0]["amount"]
    assert data["breakdown"][0]["carbonKg"] == 0
    
    assert data["breakdown"][1]["category"] == transaction_data[1]["category"]
    assert data["breakdown"][1]["amount"] == transaction_data[1]["amount"]
    assert data["breakdown"][1]["carbonKg"] == 0