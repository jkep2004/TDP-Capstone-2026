import pathlib

import pytest
from fastapi.testclient import TestClient


from api.main import app

client = TestClient(app)


test_rows = [
     {"spending" : [{"CustomerID": 15, "category": "travel",    "subcategory": "flights",     "amount": 12,    "week": 3}]}, 
     {"spending" : [{"CustomerID": 13, "category": "food",      "subcategory": "flights",     "amount": 12312, "week": 3}]},
     {"spending" : [{"CustomerID": 12, "category": "other",     "subcategory": "something",   "amount": 232,   "week": 3}]},
     {"spending" : [{"CustomerID": 1,  "category": "other",     "subcategory": None,          "amount": 2132,  "week": 3}]},
    ]


@pytest.mark.parametrize(
    "payload", test_rows, ids= ["Travel-Flights", "food-flights", "other-something", "other-None"])
def test_input_validation(bad_payload):
        response = client.post("/v1/calculate", json=bad_payload)
        response_data = response.json()
        print(response_data)
        assert response.status_code == 422