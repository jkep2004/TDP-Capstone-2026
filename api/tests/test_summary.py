from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from src.Core.auth import get_current_user
from src.Services.summary import carbon_share
from src.main import app
from database.database import get_db

CUSTOMER_ID = "00000000-0000-0000-0000-000000000001"

# Rows as the query returns them: (CategoryId, Category, EstMonthlyGBP, EstMonthlyCarbonKg)
# Deliberately not in carbon order, to check the sorting.
ROWS = [
    (2, "Food", Decimal("250.00"), Decimal("200.00")),
    (1, "Travel", Decimal("400.00"), Decimal("1000.00")),
    (3, "Utilities", Decimal("150.00"), Decimal("300.00")),
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

def test_carbon_share_known_value():
    assert carbon_share(1000.0, 1500.0) == 66.67


def test_carbon_share_zero_total_is_zero():
    assert carbon_share(0.0, 0.0) == 0.0


# GET /summary

def test_summary_totals_and_top_category(client):
    response = client.get("/api/v1/summary/?month=2026-11-01")

    assert response.status_code == 200
    body = response.json()
    assert body["month"] == "2026-11-01"
    assert body["total_carbon_kg"] == 1500.0     # 1000 + 300 + 200
    assert body["total_spend_gbp"] == 800.0      # 400 + 150 + 250
    assert body["top_category"] == "Travel"


def test_summary_categories_sorted_highest_carbon_first_with_shares(client):
    body = client.get("/api/v1/summary/?month=2026-11-01").json()

    assert [c["category"] for c in body["categories"]] == ["Travel", "Utilities", "Food"]
    assert [c["share_pct"] for c in body["categories"]] == [66.67, 20.0, 13.33]


def test_summary_empty_month_returns_zeros(client, mock_db):
    mock_db.execute.return_value.fetchall.return_value = []

    response = client.get("/api/v1/summary/?month=2026-11-01")

    assert response.status_code == 200
    body = response.json()
    assert body["total_carbon_kg"] == 0
    assert body["top_category"] is None
    assert body["categories"] == []


def test_summary_uses_token_customer_not_query(client, mock_db):
    client.get("/api/v1/summary/?month=2026-11-01&customer_id=someone-else")

    params = mock_db.execute.call_args.args[1]
    assert params["customer_id"] == CUSTOMER_ID


@pytest.mark.parametrize("query", ["", "?month=2026-11-15", "?month=not-a-date"])
def test_summary_rejects_bad_month(client, query):
    assert client.get(f"/api/v1/summary/{query}").status_code == 422
