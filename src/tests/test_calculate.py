import pathlib

import pytest
from fastapi.testclient import TestClient

from api.main import app

# =====================================================================
# SECTION 1: SETUP (keep)
# =====================================================================

client = TestClient(app)

# Built from this file's location, so it works whichever folder pytest runs from.
CSV_PATH = pathlib.Path(__file__).parent.parent / "test-data" / "sample_customer_spending.csv"

# sample_csv_dict is a list of rows. Each row looks like:
# {"customer_id": "1", "week": "1", "travel": "120", "food": "180", "utilities": "95"}
# Remember: every value is a string.
with open(CSV_PATH, "r") as file:
    sample_csv_lines = file.read().splitlines()
    sample_csv_headers = sample_csv_lines[0].split(",")
    sample_csv_dict = [
        dict(zip(sample_csv_headers, line.split(","))) for line in sample_csv_lines[1:]
    ]


# =====================================================================
# SECTION 2: NEW TESTS (work here)
# =====================================================================

@pytest.mark.skip(reason="work in progress")
def test_happy_path():
    test_row = sample_csv_dict[1]
    # 1. Pick ONE row from sample_csv_dict (e.g. customer 1, week 1).
    test_rows = [
     {"CustomerID": int(test_row["customer_id"]), "category": "travel",    "amount": float(test_row["travel"]), "week": int(test_row["week"])}, 
     {"CustomerID": int(test_row["customer_id"]), "category": "food",      "amount": float(test_row["food"]), "week": int(test_row["week"])},
     {"CustomerID": int(test_row["customer_id"]), "category": "utilities", "amount": float(test_row["utilities"]), "week": int(test_row["week"])}
    ]
    # 2. Build three spending items (travel, food, utilities) from that row.
    #    Each item needs: CustomerID, category, amount, week.
    #    Convert the CSV strings to the right types first.
    # 3. Wrap the items as {"spending": [...]} and POST to /v1/calculate.
    # 4. Assert status code is 200.
    # 5. Assert the four keys: status, totalCarbonKg, breakdown, recommendations.
    # 6. Assert their types, and that breakdown has three entries.
    pass


# =====================================================================
# SECTION 3: OLD CODE (reference only, delete when finished)
# Commented out because it no longer matches the schema:
# no CustomerID or week, only two items, and it mixes rows 0 and 1.
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
