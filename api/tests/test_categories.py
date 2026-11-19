import pathlib
import pytest
from fastapi.testclient import TestClient
from src.schemas.Category import Itemtype, Subcategories_by_type

from src.main import app

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
    assert expected_status == response.status_code
    
def test_category_validation():
    assert set(Itemtype) == set(Subcategories_by_type)
    myset = (Subcategories_by_type)
    count_of_subcategories = 0
    for i in myset.values():
        count_of_subcategories += len(i)
    assert count_of_subcategories == 13
