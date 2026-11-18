import pathlib

import pytest
from fastapi.testclient import TestClient


from api.main import app

client = TestClient(app)


test_rows = [
     pytest.param({"spending" : [{"CustomerID": 15, "category": "travel",    "subcategory": "flights",     "amount": 12,    "week": 3}]}, 200), 
     pytest.param({"spending" : [{"CustomerID": 13, "category": "food",      "subcategory": "flights",     "amount": 12312, "week": 3}]}, 422),
     pytest.param({"spending" : [{"CustomerID": 12, "category": "other",     "subcategory": "something",   "amount": 232,   "week": 3}]}, 422),
     pytest.param({"spending" : [{"CustomerID": 1,  "category": "other",     "subcategory": None,          "amount": 2132,  "week": 3}]}, 200)

    ]


@pytest.mark.parametrize(
    "payload, expected_status", test_rows, ids= ["Travel-Flights", "food-flights", "other-something", "other-None"])
def test_input_validation(payload, expected_status):
    response = client.post("/v1/calculate", json=payload)
    response_data = response.json()
    assert response_data
    assert response.status_code == expected_status