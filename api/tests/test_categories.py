import pathlib
import pytest
from fastapi.testclient import TestClient
from src.schemas.Category import Itemtype, Subcategories_by_type

from src.main import app

client = TestClient(app)


test_rows = [
     pytest.param({"spending" : [{"CustomerID": 15, "category": "travel",    "subcategory": "flights",                  "amount": 12,    "week": 3}]}, 200), 
     pytest.param({"spending" : [{"CustomerID": 13, "category": "food",      "subcategory": "flights",                  "amount": 12312, "week": 3}]}, 422),
     pytest.param({"spending" : [{"CustomerID": 12, "category": "other",     "subcategory": "something",                "amount": 232,   "week": 3}]}, 422),
     pytest.param({"spending" : [{"CustomerID": 1,  "category": "other",     "subcategory": None,                       "amount": 2132,  "week": 3}]}, 200),
     pytest.param({"spending" : [{"CustomerID": 6,  "category": "travel",     "subcategory": None,                      "amount": 2132,  "week": 3}]}, 200),
     pytest.param({"spending" : [{"CustomerID": 7,  "category": "travel",     "subcategory": "public transport",        "amount": 2132,  "week": 3}]}, 200),
     pytest.param({"spending" : [{"CustomerID": 8,  "category": "travel",     "subcategory": "public  transport",       "amount": 2132,  "week": 3}]}, 422),
     pytest.param({"spending" : [{"CustomerID": 1,  "category": "travel",     "subcategory": "FLIGHTS",                 "amount": 2132,  "week": 3}]}, 200)


    ]


@pytest.mark.parametrize(
    "payload, expected_status", test_rows, ids= ["Travel-Flights", "food-flights", "other-something", "other-None", "Travel-None" ,"Travel-public transport", "Travel-public  transport", "Travel-FLIGHTS"])
def test_input_validation(payload, expected_status):
    response = client.post("/api/v1/calculate", json=payload)
    response_data = response.json()
    assert expected_status == response.status_code
    
def test_category_validation():
    assert set(Itemtype) == set(Subcategories_by_type)
    myset = (Subcategories_by_type)
    count_of_subcategories = 0
    for i in myset.values():
        count_of_subcategories += len(i)
    assert count_of_subcategories == 13


def test_category_endpoint_validation():
    response = client.get("/api/v1/categories/")
    assert response.status_code == 200

    my_values = [i.value for i in Itemtype]
    assert response.json() == my_values
    assert response.json() == ['travel', 'food', 'utilities', 'shopping', 'housing', 'other']

    assert len(response.json()) == 6



list_test_rows = [
    pytest.param("travel", ['fuel', 'public transport', 'flights']),
    pytest.param("food", ['groceries', 'eating out']),
    pytest.param("utilities", ["electricity","gas", "water"]),
    pytest.param("shopping", ["clothing", "electronics", "furniture and appliances"]),
    pytest.param("housing", ["rent", "mortgage"]),
    pytest.param("other", [])
]

@pytest.mark.parametrize("category, expected_list", list_test_rows, ids=['Travel', 'Food', 'Utilities', 'Shopping', 'Housing', 'Other'])
def test_category_list_and_subcategory(category, expected_list):
    response = client.get(f"/api/v1/categories/{category}")
    assert response.status_code == 200
    assert expected_list == response.json()