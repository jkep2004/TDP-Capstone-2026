from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from src.Core.auth import get_current_user
from src.Services.trends import percent_change
from src.main import app
from database.database import get_db

CUSTOMER_ID = "00000000-0000-0000-0000-000000000101"

# Rows as the query returns them: (SpendMonth, CategoryId, Category, EstMonthlyGBP, EstMonthlyCarbonKg)
# Totals: Sep 1000 kg, Oct 1200 kg (+200, +20%), Nov 900 kg (-300, -25%).
ROWS = [
    (date(2026, 9, 1), 1, "Travel", Decimal("300.00"), Decimal("700.00")),
    (date(2026, 9, 1), 2, "Food", Decimal("200.00"), Decimal("300.00")),
    (date(2026, 10, 1), 1, "Travel", Decimal("400.00"), Decimal("900.00")),
    (date(2026, 10, 1), 2, "Food", Decimal("250.00"), Decimal("300.00")),
    (date(2026, 11, 1), 1, "Travel", Decimal("250.00"), Decimal("600.00")),
    (date(2026, 11, 1), 2, "Food", Decimal("220.00"), Decimal("300.00")),
]


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.execute.return_value.fetchall.return_value = ROWS
    return db


@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: {"user_id": CUSTOMER_ID}

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# Pure function

def test_percent_change_known_values():
    assert percent_change(1000.0, 1200.0) == 20.0
    assert percent_change(1200.0, 900.0) == -25.0


def test_percent_change_without_baseline_is_none():
    assert percent_change(0.0, 500.0) is None


# GET /trends

def test_trends_returns_months_oldest_first_with_changes(client):
    response = client.get("/api/v1/trends/")

    assert response.status_code == 200
    months = response.json()["months"]
    assert [m["month"] for m in months] == ["2026-09-01", "2026-10-01", "2026-11-01"]
    assert [m["total_carbon_kg"] for m in months] == [1000.0, 1200.0, 900.0]
    assert [m["carbon_change_kg"] for m in months] == [None, 200.0, -300.0]
    assert [m["carbon_change_pct"] for m in months] == [None, 20.0, -25.0]


def test_trends_includes_category_breakdown_per_month(client):
    october = client.get("/api/v1/trends/").json()["months"][1]

    assert october["total_spend_gbp"] == 650.0
    assert [c["category"] for c in october["categories"]] == ["Travel", "Food"]
    assert october["categories"][0]["carbon_kg"] == 900.0


def test_trends_months_parameter_keeps_the_latest(client):
    months = client.get("/api/v1/trends/?months=2").json()["months"]

    assert [m["month"] for m in months] == ["2026-10-01", "2026-11-01"]
    # The first returned month still has no change, because it is the first one in the response.
    assert months[0]["carbon_change_kg"] is None


def test_trends_empty_when_no_data(client, mock_db):
    mock_db.execute.return_value.fetchall.return_value = []

    response = client.get("/api/v1/trends/")

    assert response.status_code == 200
    assert response.json()["months"] == []


def test_trends_uses_token_customer_not_query(client, mock_db):
    client.get("/api/v1/trends/?customer_id=someone-else")

    params = mock_db.execute.call_args.args[1]
    assert params["customer_id"] == CUSTOMER_ID


@pytest.mark.parametrize("query", ["?months=0", "?months=25", "?months=abc"])
def test_trends_rejects_bad_months(client, query):
    assert client.get(f"/api/v1/trends/{query}").status_code == 422
