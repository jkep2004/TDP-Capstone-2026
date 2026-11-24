
import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from src.main import app
from database.database import get_db

# Test data

CUSTOMER_ID = str(uuid.uuid4())
MONTH = "2026-11-01"

MOCK_CATEGORIES = [
    (1, "Food", "Food and dining expenses", None, True),
    (2, "Groceries", "Grocery expenses", 1, True),
    (3, "Travel", "Travel expenses", None, True),
    (4, "Flights", "Flight expenses", 3, True),
    (5, "Utilities", "Household utilities", None, False),
    (6, "Public Transport", "Public transport expenses", 3, True),
    (7, "Other", "Other expenses", None, False),
]

def make_spending_item(
    category=3,
    subcategory=None,
    amount=100.0,
    week=1,
    customer_id=CUSTOMER_ID,
    month=MONTH,
):
    return {
        "CustomerID": customer_id,
        "category": category,
        "subcategory": subcategory,
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
                    if row[0] == category_id and row[3] is None
                ),
                None,
            )

            return make_db_result(
                row=(category[0],) if category else None
            )

        # Subcategory lookup
        if "parentcategoryid" in sql and "name" in sql:
            parent_id = params.get("parent_category_id")
            subcategory_name = params.get("subcategory")

            category = next(
                (
                    row for row in MOCK_CATEGORIES
                    if row[3] == parent_id
                    and row[1].lower() == str(subcategory_name).lower()
                ),
                None,
            )

            return make_db_result(
                row=(category[0],) if category else None
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
                category=3,
                subcategory=None,
                amount=100.0,
                week=1,
            )
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

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
                category=3,
                subcategory="flights",
                amount=250.0,
                week=2,
            )
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "success"
    assert len(data["breakdown"]) == 1

    breakdown_item = data["breakdown"][0]

    assert breakdown_item["category"] == 3
    assert breakdown_item["subcategory"] == "flights"
    assert breakdown_item["amount"] == 250.0
    assert breakdown_item["week"] == 2

def test_calculate_with_multiple_spending_items(client):
    payload = {
        "spending": [
            make_spending_item(
                category=1,
                subcategory="groceries",
                amount=75.50,
                week=1,
            ),
            make_spending_item(
                category=3,
                subcategory="flights",
                amount=250.0,
                week=2,
            ),
            make_spending_item(
                category=5,
                subcategory=None,
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
                category=7,
                subcategory=None,
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
                category=3,
                subcategory="public transport",
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
            make_spending_item(category=999)
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_child_category_as_parent(client):
    # Category 4 (Flights) is a child of Travel, not a parent category.
    payload = {
        "spending": [
            make_spending_item(category=4)
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_invalid_subcategory(client):
    payload = {
        "spending": [
            make_spending_item(
                category=3,
                subcategory="hotels",
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
                category=3,
                subcategory="groceries",
            )
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_subcategory_case_insensitive(client):
    payload = {
        "spending": [
            make_spending_item(
                category=3,
                subcategory="FLIGHTS",
            )
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 200

def test_calculate_with_subcategory_whitespace(client):
    payload = {
        "spending": [
            make_spending_item(
                category=3,
                subcategory="  flights  ",
            )
        ]
    }

    # The SpendingItem validator strips and lowercases the input.
    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 200

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
            make_spending_item(customer_id="not-a-uuid")
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_string_category(client):
    payload = {
        "spending": [
            make_spending_item(category="travel")
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_zero_category(client):
    payload = {
        "spending": [
            make_spending_item(category=0)
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422

def test_calculate_with_negative_category(client):
    payload = {
        "spending": [
            make_spending_item(category=-1)
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
    del item["CustomerID"]

    response = client.post(
        "/api/v1/calculate/",
        json={"spending": [item]},
    )

    assert response.status_code == 422

def test_calculate_with_missing_category(client):
    item = make_spending_item()
    del item["category"]

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
            make_spending_item(subcategory=123)
        ]
    }

    response = client.post("/api/v1/calculate/", json=payload)

    assert response.status_code == 422
