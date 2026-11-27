from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from src.Core.auth import get_current_user
from src.Services.recommendations import projected_reduction
from src.main import app
from database.database import get_db

# Rows as the query returns them:
# (CategoryId, Category, EstMonthlyGBP, EstMonthlyCarbonKg, Threshold, Advice, ReductionPct)
OVER_THRESHOLD_ROWS = [
    (1, "Travel", Decimal("400.00"), Decimal("1000.00"), Decimal("300.00"), "Share car journeys", Decimal("0.1400")),
    (3, "Utilities", Decimal("200.00"), Decimal("300.00"), Decimal("150.00"), "Reduce heating by 1C", Decimal("0.1900")),
]


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.execute.return_value.fetchall.return_value = OVER_THRESHOLD_ROWS
    return db


@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "00000000-0000-0000-0000-000000000001"}

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# Pure function

def test_projected_reduction_known_value():
    assert projected_reduction(400.0, 0.14) == 56.0


def test_projected_reduction_rounds_to_two_places():
    assert projected_reduction(333.33, 0.14) == 46.67


# GET /recommendations

def test_recommendations_returns_advice_and_both_savings(client):
    response = client.get("/api/v1/recommendations/?month=2026-11-01")

    assert response.status_code == 200
    body = response.json()
    assert body["month"] == "2026-11-01"
    travel = body["recommendations"][0]
    assert travel["category"] == "Travel"
    assert travel["advice"] == "Share car journeys"
    assert travel["projected_savings_gbp"] == 56.0            # 400 x 0.14
    assert travel["projected_carbon_reduction_kg"] == 140.0   # 1000 x 0.14


def test_recommendations_empty_when_nothing_over_threshold(client, mock_db):
    mock_db.execute.return_value.fetchall.return_value = []

    response = client.get("/api/v1/recommendations/?month=2026-11-01")

    assert response.status_code == 200
    assert response.json()["recommendations"] == []


def test_recommendations_uses_token_customer_not_query(client, mock_db):
    client.get("/api/v1/recommendations/?month=2026-11-01&customer_id=someone-else")

    params = mock_db.execute.call_args.args[1]
    assert params["customer_id"] == "00000000-0000-0000-0000-000000000001"


@pytest.mark.parametrize("query", ["", "?month=2026-11-15", "?month=not-a-date"])
def test_recommendations_rejects_bad_month(client, query):
    response = client.get(f"/api/v1/recommendations/{query}")

    assert response.status_code == 422


# GET /savings

def test_savings_totals_add_up(client):
    response = client.get("/api/v1/savings/?month=2026-11-01")

    assert response.status_code == 200
    body = response.json()
    assert body["total_savings_gbp"] == 94.0              # 56 + 38
    assert body["total_carbon_reduction_kg"] == 197.0     # 140 + 57
    assert [row["category"] for row in body["breakdown"]] == ["Travel", "Utilities"]


def test_savings_zero_when_nothing_over_threshold(client, mock_db):
    mock_db.execute.return_value.fetchall.return_value = []

    response = client.get("/api/v1/savings/?month=2026-11-01")

    assert response.status_code == 200
    assert response.json()["total_savings_gbp"] == 0
    assert response.json()["breakdown"] == []


def test_savings_rejects_mid_month_date(client):
    assert client.get("/api/v1/savings/?month=2026-11-15").status_code == 422
