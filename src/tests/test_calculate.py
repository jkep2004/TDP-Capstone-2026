import pathlib

import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)

CSV_PATH = pathlib.Path(__file__).parent.parent / "test-data" / "sample_customer_spending.csv"

with open(CSV_PATH, "r") as file:
    sample_csv_lines = file.read().splitlines()
    sample_csv_headers = sample_csv_lines[0].split(",")
    sample_csv_dict = [
        dict(zip(sample_csv_headers, line.split(","))) for line in sample_csv_lines[1:]
    ]

# =====================================================================
# =====================================================================


def test_happy_path():
    test_row = sample_csv_dict[1]
    test_rows = [
     {"CustomerID": int(test_row["customer_id"]), "category": "travel",    "amount": float(test_row["travel"]), "week": int(test_row["week"])}, 
     {"CustomerID": int(test_row["customer_id"]), "category": "food",      "amount": float(test_row["food"]), "week": int(test_row["week"])},
     {"CustomerID": int(test_row["customer_id"]), "category": "utilities", "amount": float(test_row["utilities"]), "week": int(test_row["week"])}
    ]
  
    test_payload = {"spending": test_rows}
    response = client.post("/api/v1/calculate", json=test_payload)
    respond = response.json()

    assert response.status_code == 200

    
    assert set(respond.keys()) == {"status", "totalCarbonKg", "breakdown", "recommendations"}
    assert isinstance(respond["status"], str)
    assert isinstance(respond["totalCarbonKg"], (int, float))
    assert isinstance(respond["breakdown"], list)
    assert isinstance(respond["recommendations"], list)
    assert len(respond["breakdown"]) == 3
    # DO NOT DELETE THESE INSTRUCTIONS OR I WILL FORGET THEM LIKE A BOZO XD



# =====================================================================
# =====================================================================

# def test_calculate_endpoint():
#     transaction_data = [
#         {"category": "food", "amount": float(sample_csv_dict[0]["food"])},
#         {"category": "travel", "amount": float(sample_csv_dict[1]["travel"])}
#     ]
#     payload = {"spending": transaction_data}
#     response = client.post("/v1/calculate", json=payload)
#     assert response.status_code == 200
#
#     data = response.json()
#     assert data["status"] == "success"
#     assert data["totalCarbonKg"] == 0
#     assert len(data["breakdown"]) == 2
#
#     assert data["breakdown"][0]["category"] == transaction_data[0]["category"]
#     assert data["breakdown"][0]["amount"] == transaction_data[0]["amount"]
#     assert data["breakdown"][0]["carbonKg"] == 0
#
#     assert data["breakdown"][1]["category"] == transaction_data[1]["category"]
#     assert data["breakdown"][1]["amount"] == transaction_data[1]["amount"]
#     assert data["breakdown"][1]["carbonKg"] == 0
