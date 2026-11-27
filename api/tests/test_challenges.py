from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError, OperationalError

from database.database import get_db
from src.Core.auth import get_current_user
from src.main import app
from src.schemas.ChallengeResponse import ChallengeStatus
from src.Services.challenges import can_transition

CUSTOMER_ID = "00000000-0000-0000-0000-000000000001"
MONTH = "2026-11-01"
STARTED = datetime(2026, 11, 5, 9, 30)
COMPLETED = datetime(2026, 11, 20, 18, 0)

# Rows as vw_CustomerChallenges returns them:
# (CategoryId, Category, Recommendation, LowerCarbonAlternative, Action,
#  SavingGBP, CarbonSavedKg, Priority, Status, StartedAt, CompletedAt)
TRAVEL_NOT_STARTED = (1, "Travel", "Share car journeys", "Car pool", "Car pool twice a week",
                      Decimal("56.00"), Decimal("140.00"), 1, "NOT_STARTED", None, None)
TRAVEL_IN_PROGRESS = TRAVEL_NOT_STARTED[:8] + ("IN_PROGRESS", STARTED, None)
TRAVEL_COMPLETED = TRAVEL_NOT_STARTED[:8] + ("COMPLETED", STARTED, COMPLETED)
UTILITIES_IN_PROGRESS = (3, "Utilities", "Reduce heating by 1C", None, None,
                         Decimal("38.00"), Decimal("57.00"), 2, "IN_PROGRESS", STARTED, None)


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: {"user_id": CUSTOMER_ID}

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def lookups(mock_db, *rows):
    """Each single-challenge SELECT returns the next row (before, then after the write)."""
    mock_db.execute.return_value.first.side_effect = list(rows)


def sql_of(call) -> str:
    return str(call.args[0])


def writes(mock_db) -> list[str]:
    return [sql_of(c) for c in mock_db.execute.call_args_list
            if "INSERT" in sql_of(c) or "UPDATE" in sql_of(c)]


# Pure function: the transition rules

@pytest.mark.parametrize(
    "current, new, expected",
    [
        (ChallengeStatus.NOT_STARTED, ChallengeStatus.NOT_STARTED, True),
        (ChallengeStatus.NOT_STARTED, ChallengeStatus.IN_PROGRESS, True),
        (ChallengeStatus.IN_PROGRESS, ChallengeStatus.IN_PROGRESS, True),
        (ChallengeStatus.IN_PROGRESS, ChallengeStatus.COMPLETED, True),
        (ChallengeStatus.COMPLETED, ChallengeStatus.IN_PROGRESS, False),
        (ChallengeStatus.NOT_STARTED, ChallengeStatus.COMPLETED, False),
        (ChallengeStatus.IN_PROGRESS, ChallengeStatus.NOT_STARTED, False),
        (ChallengeStatus.COMPLETED, ChallengeStatus.NOT_STARTED, False),
        (ChallengeStatus.COMPLETED, ChallengeStatus.COMPLETED, False),
    ],
    ids=[
        "not_started_to_not_started",
        "not_started_to_in_progress",
        "in_progress_to_in_progress",
        "in_progress_to_completed",
        "completed_to_in_progress",
        "not_started_to_completed",
        "in_progress_to_not_started",
        "completed_to_not_started",
        "completed_to_completed",
    ],
)
def test_can_transition(current, new, expected):
    assert can_transition(current, new) == expected


# GET /challenges

def test_challenges_lists_each_with_status_and_savings(client, mock_db):
    mock_db.execute.return_value.fetchall.return_value = [TRAVEL_NOT_STARTED, UTILITIES_IN_PROGRESS]

    response = client.get(f"/api/v1/challenges/?month={MONTH}")

    assert response.status_code == 200
    body = response.json()
    assert body["month"] == MONTH
    travel, utilities = body["challenges"]
    assert travel["category"] == "Travel"
    assert travel["status"] == "NOT_STARTED"
    assert travel["started_at"] is None
    assert travel["projected_savings_gbp"] == 56.0
    assert travel["projected_carbon_reduction_kg"] == 140.0
    assert travel["action"] == "Car pool twice a week"
    assert utilities["status"] == "IN_PROGRESS"
    assert utilities["lower_carbon_alternative"] is None


def test_challenges_empty_month(client, mock_db):
    mock_db.execute.return_value.fetchall.return_value = []

    body = client.get(f"/api/v1/challenges/?month={MONTH}").json()

    assert body["challenges"] == []


def test_challenges_uses_token_customer_not_query(client, mock_db):
    mock_db.execute.return_value.fetchall.return_value = []

    client.get(f"/api/v1/challenges/?month={MONTH}&customer_id=someone-else")

    params = mock_db.execute.call_args.args[1]
    assert params["customer_id"] == CUSTOMER_ID


@pytest.mark.parametrize("query", ["", "?month=2026-11-15", "?month=not-a-date"])
def test_challenges_rejects_bad_month(client, query):
    assert client.get(f"/api/v1/challenges/{query}").status_code == 422


# PATCH /challenges/{category_id}

def test_start_challenge_inserts_row(client, mock_db):
    lookups(mock_db, TRAVEL_NOT_STARTED, TRAVEL_IN_PROGRESS)

    response = client.patch(f"/api/v1/challenges/1?month={MONTH}", json={"status": "IN_PROGRESS"})

    assert response.status_code == 200
    assert response.json()["status"] == "IN_PROGRESS"
    assert response.json()["started_at"] is not None
    [write] = writes(mock_db)
    assert "INSERT INTO dbo.CustomerChallenges" in write
    mock_db.commit.assert_called_once()


def test_complete_challenge_updates_row(client, mock_db):
    lookups(mock_db, TRAVEL_IN_PROGRESS, TRAVEL_COMPLETED)

    response = client.patch(f"/api/v1/challenges/1?month={MONTH}", json={"status": "COMPLETED"})

    assert response.status_code == 200
    assert response.json()["status"] == "COMPLETED"
    assert response.json()["completed_at"] is not None
    [write] = writes(mock_db)
    assert "UPDATE dbo.CustomerChallenges" in write
    assert "CompletedAt" in write
    mock_db.commit.assert_called_once()


def test_same_status_again_writes_nothing(client, mock_db):
    lookups(mock_db, TRAVEL_IN_PROGRESS)

    response = client.patch(f"/api/v1/challenges/1?month={MONTH}", json={"status": "IN_PROGRESS"})

    assert response.status_code == 200
    assert writes(mock_db) == []
    mock_db.commit.assert_not_called()


@pytest.mark.parametrize(
    "row, new_status",
    [(TRAVEL_COMPLETED, "IN_PROGRESS"), (TRAVEL_NOT_STARTED, "COMPLETED"), (TRAVEL_IN_PROGRESS, "NOT_STARTED")],
    ids=["completed_is_final", "cannot_skip_start", "cannot_go_back"],
)
def test_disallowed_transition_is_409(client, mock_db, row, new_status):
    lookups(mock_db, row)

    response = client.patch(f"/api/v1/challenges/1?month={MONTH}", json={"status": new_status})

    assert response.status_code == 409
    assert writes(mock_db) == []


def test_unknown_challenge_is_404(client, mock_db):
    lookups(mock_db, None)

    response = client.patch(f"/api/v1/challenges/99?month={MONTH}", json={"status": "IN_PROGRESS"})

    assert response.status_code == 404


@pytest.mark.parametrize("body", [{"status": "done"}, {"status": "in_progress"}, {}, {"status": "IN_PROGRESS", "extra": 1}])
def test_invalid_body_is_422(client, body):
    assert client.patch(f"/api/v1/challenges/1?month={MONTH}", json=body).status_code == 422


def test_patch_rejects_bad_month(client):
    response = client.patch("/api/v1/challenges/1?month=2026-11-15", json={"status": "IN_PROGRESS"})

    assert response.status_code == 422


def test_patch_uses_token_customer(client, mock_db):
    lookups(mock_db, TRAVEL_NOT_STARTED, TRAVEL_IN_PROGRESS)

    client.patch(f"/api/v1/challenges/1?month={MONTH}&customer_id=someone-else", json={"status": "IN_PROGRESS"})

    for call in mock_db.execute.call_args_list:
        assert call.args[1]["customer_id"] == CUSTOMER_ID


def test_concurrent_start_is_409_and_rolls_back(client, mock_db):
    lookups(mock_db, TRAVEL_NOT_STARTED)

    def execute(statement, params=None):
        if "INSERT" in str(statement):
            raise IntegrityError("INSERT", params, Exception("UQ_CustomerChallenge"))
        return mock_db.execute.return_value

    mock_db.execute.side_effect = execute

    response = client.patch(f"/api/v1/challenges/1?month={MONTH}", json={"status": "IN_PROGRESS"})

    assert response.status_code == 409
    mock_db.rollback.assert_called_once()
    mock_db.commit.assert_not_called()


def test_database_error_is_500_and_rolls_back(client, mock_db):
    lookups(mock_db, TRAVEL_IN_PROGRESS)

    def execute(statement, params=None):
        if "UPDATE" in str(statement):
            raise OperationalError("UPDATE", params, Exception("connection lost"))
        return mock_db.execute.return_value

    mock_db.execute.side_effect = execute

    response = client.patch(f"/api/v1/challenges/1?month={MONTH}", json={"status": "COMPLETED"})

    assert response.status_code == 500
    mock_db.rollback.assert_called_once()


# GET /challenges/medal

@pytest.mark.parametrize(
    "row, expected",
    [((3, "Gold"), {"completed_challenges": 3, "medal": "Gold"}),
     ((0, None), {"completed_challenges": 0, "medal": None}),
     (None, {"completed_challenges": 0, "medal": None})],
    ids=["gold", "none_completed", "customer_not_in_view"],
)
def test_medal(client, mock_db, row, expected):
    mock_db.execute.return_value.first.return_value = row

    response = client.get("/api/v1/challenges/medal")

    assert response.status_code == 200
    assert response.json() == expected
