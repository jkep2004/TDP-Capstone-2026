
from unicodedata import category
import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.schemas.Category import Category
from database.database import get_db

# Test data

CUSTOMER_ID = str(uuid.uuid4())
MONTH = "2026-11-01"

MOCK_CATEGORIES = [
    Category(
        id=1,
        name="Food",
        description="Food and dining expenses",
        parent_id=None,
        is_carbon_tracked=True
    ),
    Category(
        id=2,
        name="Groceries",
        description="Grocery expenses",
        parent_id=1,
        is_carbon_tracked=True
    ),
    Category(
        id=3,
        name="Travel",
        description="Travel expenses",
        parent_id=None,
        is_carbon_tracked=True
    ),
    Category(
        id=4,
        name="Flights",
        description="Flight expenses",
        parent_id=3,
        is_carbon_tracked=True
    ),
    Category(
        id=5,
        name="Utilities",
        description="Household utilities",
        parent_id=None,
        is_carbon_tracked=False
    ),
    Category(
        id=6,
        name="Public Transport",
        description="Public transport expenses",
        parent_id=3,
        is_carbon_tracked=True
    ),
    Category(
        id=7,
        name="Other",
        description="Other expenses",
        parent_id=None,
        is_carbon_tracked=False
    ),
]

def make_spending_item(
    categoryID=3,
    subcategoryID=None,
    amount=100.0,
    week=1,
    customerID=CUSTOMER_ID,
    month=MONTH,
):
    return {
        "customerID": customerID,
        "categoryID": categoryID,
        "subcategoryID": subcategoryID,
        "amount": amount,
        "month": month,
        "week": week,
    }
    
def make_db_result(row=None, rows=None):
    """Create a mock SQLAlchemy result supporting first() and fetchall()."""
    result = MagicMock()
    result.first.return_value = row
    result.fetchall.return_value = rows if rows is not None else []
    return result

# Fixtures

@pytest.fixture
def mock_db():
    db = MagicMock()

    def execute_side_effect(statement, params=None):
        sql = str(statement).lower()
        params = params or {}

        # Parent category lookup
        if "parentcategoryid is null" in sql:
            category_id = params.get("category_id")

            category = next(
                (
                    row for row in MOCK_CATEGORIES
                    if row.id == category_id and row.parent_id is None
                ),
                None,
            )

            return make_db_result(
                row=(category.id,) if category else None
            )

        # Subcategory lookup
        if "parentcategoryid" in sql and "subcategory_id" in sql:
            parent_id = params.get("parent_category_id")
            subcategory_id = params.get("subcategory_id")

            category = next(
                (
                    row for row in MOCK_CATEGORIES
                    if row.parent_id == parent_id
                    and row.id == subcategory_id
                ),
                None,
            )

            return make_db_result(
                row=(category.id,) if category else None
            )

        # Fallback for unexpected queries
        return make_db_result()

    db.execute.side_effect = execute_side_effect

    return db

@pytest.fixture
def client(mock_db):
    def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()

# Successful calculation tests

def test_calculate_with_parent_category(client):
    payload = {
        "spending": [
            make_spending_item(
                categoryID=3,
                subcategoryID=None,
                amount=100.0,
                week=1,
            )
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)
    
    print("Response status:", response.status_code)
    print("Response body:", response.json())

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "success"
    assert data["totalCarbonKg"] == 0
    assert len(data["breakdown"]) == 1

    breakdown_item = data["breakdown"][0]

    assert breakdown_item["category"] == 3
    assert breakdown_item["subcategory"] is None
    assert breakdown_item["amount"] == 100.0
    assert breakdown_item["week"] == 1
    assert breakdown_item["carbonKg"] == 0

def test_calculate_with_valid_subcategory(client):
    payload = {
        "spending": [
            make_spending_item(
                categoryID=1,
                subcategoryID=2,
                amount=250.0,
                week=2,
            )
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    print ("Response status:", response.status_code)
    print ("Response body:", response.json())

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "success"
    assert len(data["breakdown"]) == 1

    breakdown_item = data["breakdown"][0]

    assert breakdown_item["category"] == 1
    assert breakdown_item["subcategory"] == 2
    assert breakdown_item["amount"] == 250.0
    assert breakdown_item["week"] == 2

def test_calculate_with_multiple_spending_items(client):
    payload = {
        "spending": [
            make_spending_item(
                categoryID=1,
                subcategoryID=2,
                amount=75.50,
                week=1,
            ),
            make_spending_item(
                categoryID=3,
                subcategoryID=4,
                amount=250.0,
                week=2,
            ),
            make_spending_item(
                categoryID=5,
                subcategoryID=None,
                amount=60.0,
                week=3,
            ),
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "success"
    assert len(data["breakdown"]) == 3
    assert data["totalCarbonKg"] == 0

def test_calculate_with_other_parent_category(client):
    payload = {
        "spending": [
            make_spending_item(
                categoryID=7,
                subcategoryID=None,
                amount=50.0,
            )
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 200

def test_calculate_with_public_transport_subcategory(client):
    payload = {
        "spending": [
            make_spending_item(
                categoryID=3,
                subcategoryID=6,
                amount=45.0,
            )
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 200

# Category and subcategory validation tests

def test_calculate_with_nonexistent_category(client):
    payload = {
        "spending": [
            make_spending_item(categoryID=999)
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_child_category_as_parent(client):
    # Category 4 (Flights) is a child of Travel, not a parent category.
    payload = {
        "spending": [
            make_spending_item(categoryID=4)
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_invalid_subcategory(client):
    payload = {
        "spending": [
            make_spending_item(
                categoryID=3,
                subcategoryID="hotels",
            )
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_subcategory_from_wrong_parent(client):
    # Groceries belongs to Food (category 1), not Travel (category 3).
    payload = {
        "spending": [
            make_spending_item(
                categoryID=3,
                subcategoryID=2,
            )
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

# Request schema validation tests

def test_calculate_without_spending(client):
    response = client.post(
        "/api/v1/calculate/",
        json={"spending": []},
    )

    assert response.status_code == 422

def test_calculate_without_spending_field(client):
    response = client.post(
        "/api/v1/calculate/",
        json={},
    )

    assert response.status_code == 422

def test_calculate_with_invalid_customer_id(client):
    payload = {
        "spending": [
            make_spending_item(customerID="not-a-uuid")
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_string_category(client):
    payload = {
        "spending": [
            make_spending_item(categoryID="travel")
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_zero_category(client):
    payload = {
        "spending": [
            make_spending_item(categoryID=0)
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_negative_category(client):
    payload = {
        "spending": [
            make_spending_item(categoryID=-1)
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_negative_amount(client):
    payload = {
        "spending": [
            make_spending_item(amount=-10.0)
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_invalid_week_zero(client):
    payload = {
        "spending": [
            make_spending_item(week=0)
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_invalid_week_above_five(client):
    payload = {
        "spending": [
            make_spending_item(week=6)
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_invalid_month(client):
    payload = {
        "spending": [
            make_spending_item(month="not-a-date")
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_missing_month(client):
    item = make_spending_item()
    del item["month"]

    response = client.post(
        "/api/v1/calculate/",
        json={"spending": [item]},
    )

    assert response.status_code == 422

def test_calculate_with_missing_customer_id(client):
    item = make_spending_item()
    del item["customerID"]

    response = client.post(
        "/api/v1/calculate/",
        json={"spending": [item]},
    )

    assert response.status_code == 422

def test_calculate_with_missing_category(client):
    item = make_spending_item()
    del item["categoryID"]

    response = client.post(
        "/api/v1/calculate/",
        json={"spending": [item]},
    )

    assert response.status_code == 422

def test_calculate_with_extra_field(client):
    item = make_spending_item()
    item["unexpected_field"] = "not allowed"

    response = client.post(
        "/api/v1/calculate/",
        json={"spending": [item]},
    )

    assert response.status_code == 422

def test_calculate_with_invalid_subcategory_type(client):
    payload = {
        "spending": [
            make_spending_item(subcategoryID=True)  # Boolean instead of int or None
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422
