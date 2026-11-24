
import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from src.Routers.spend import router
from database.database import get_db
from src.Core.auth import get_current_user
from src.schemas.Category import Itemtype

app = FastAPI()
app.include_router(router)

client = TestClient(app)

@pytest.fixture
def customer_id():
    return uuid.uuid4()

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_user(customer_id):
    return {
        "user_id": customer_id
    }

@pytest.fixture
def valid_category():
    """Use an actual category enum member."""
    return next(iter(Itemtype))

@pytest.fixture
def valid_payload(customer_id, valid_category):
    return {
        "CustomerID": str(customer_id),
        "category": valid_category.value,
        "subcategory": None,
        "amount": 125.50,
        "month": "2026-11-01",
        "week": 3
    }

@pytest.fixture(autouse=True)
def override_dependencies(mock_db, mock_user):
    """Override database and authentication dependencies."""

    def override_get_db():
        yield mock_db

    def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = (
        override_get_current_user
    )

    yield

    app.dependency_overrides.clear()
    

@pytest.fixture
def mock_category_lookup(monkeypatch):
    """
    Mock category ID lookup for endpoint tests.

    Returns category ID 1 without executing a real
    database query.
    """

    mock = MagicMock(return_value=1)

    monkeypatch.setattr(
        Itemtype,
        "get_category_id",
        mock
    )

    return mock


@pytest.fixture
def successful_insert(mock_db):
    """Configure a successful SQL INSERT."""

    result = MagicMock()
    result.scalar_one.return_value = 456

    mock_db.execute.return_value = result

    return result

# Sucessful tests

def test_create_spend_entry_success(
    mock_db,
    valid_payload,
    successful_insert,
    mock_category_lookup
):
    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 200

    assert response.json() == {
        "message": "Spend entry created successfully",
        "spendingId": 456
    }

    mock_db.commit.assert_called_once()
    mock_db.rollback.assert_not_called()


def test_create_spend_entry_returns_generated_id(
    valid_payload,
    successful_insert,
    mock_category_lookup
):
    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.json()["spendingId"] == 456


def test_create_spend_entry_uses_authenticated_customer(
    mock_db,
    valid_payload,
    customer_id,
    mock_category_lookup,
    successful_insert
):
    # Deliberately supply a different CustomerID.
    valid_payload["CustomerID"] = str(uuid.uuid4())

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 200

    params = mock_db.execute.call_args.args[1]

    assert params["customer_id"] == customer_id


def test_create_spend_entry_uses_correct_category_id(
    mock_db,
    valid_payload,
    mock_category_lookup,
    successful_insert
):
    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 200

    params = mock_db.execute.call_args.args[1]

    assert params["category_id"] == 1


def test_create_spend_entry_uses_correct_amount(
    mock_db,
    valid_payload,
    mock_category_lookup,
    successful_insert
):
    client.post("/spend/", json=valid_payload)

    params = mock_db.execute.call_args.args[1]

    assert params["amount_gbp"] == 125.50


def test_create_spend_entry_uses_correct_month(
    mock_db,
    valid_payload,
    mock_category_lookup,
    successful_insert
):
    client.post("/spend/", json=valid_payload)

    params = mock_db.execute.call_args.args[1]

    assert params["spend_month"] == date(2026, 11, 1)


def test_create_spend_entry_uses_correct_week(
    mock_db,
    mock_category_lookup,
    valid_payload,
    successful_insert
):
    client.post("/spend/", json=valid_payload)

    params = mock_db.execute.call_args.args[1]

    assert params["week_number"] == 3


# SQL Tests

def test_create_spend_entry_executes_insert(
    mock_db,
    valid_payload,
    mock_category_lookup,
    successful_insert
):
    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 200

    query = mock_db.execute.call_args.args[0]

    assert "INSERT INTO dbo.Spending" in str(query)
    assert "OUTPUT INSERTED.SpendingId" in str(query)


def test_create_spend_entry_passes_all_sql_parameters(
    mock_db,
    valid_payload,
    customer_id,
    mock_category_lookup,
    successful_insert
):
    client.post("/spend/", json=valid_payload)

    params = mock_db.execute.call_args.args[1]

    assert params == {
        "customer_id": customer_id,
        "category_id": 1,
        "spend_month": date(2026, 11, 1),
        "week_number": 3,
        "amount_gbp": 125.50
    }


def test_create_spend_entry_commits_transaction(
    mock_db,
    valid_payload,
    mock_category_lookup,
    successful_insert
):
    client.post("/spend/", json=valid_payload)

    mock_db.commit.assert_called_once()


# Database Connection Error Tests

def test_database_execution_error(
    mock_db,
    valid_payload,
    mock_category_lookup
):
    mock_db.execute.side_effect = SQLAlchemyError(
        "Database connection failed"
    )

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 500

    assert response.json() == {
        "detail": "Failed to create spend entry"
    }

    mock_db.rollback.assert_called_once()
    mock_db.commit.assert_not_called()


def test_database_commit_error(
    mock_db,
    mock_category_lookup,
    valid_payload
):
    result = MagicMock()
    result.scalar_one.return_value = 456

    mock_db.execute.return_value = result

    mock_db.commit.side_effect = SQLAlchemyError(
        "Commit failed"
    )

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 500

    mock_db.commit.assert_called_once()
    mock_db.rollback.assert_called_once()


def test_database_scalar_error(
    mock_db,
    mock_category_lookup,
    valid_payload
):
    result = MagicMock()

    result.scalar_one.side_effect = SQLAlchemyError(
        "Failed to retrieve SpendingId"
    )

    mock_db.execute.return_value = result

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 500

    mock_db.rollback.assert_called_once()


# Payload Validation Tests

def test_missing_customer_id(
    mock_db,
    valid_payload
):
    del valid_payload["CustomerID"]

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


def test_invalid_customer_id(
    mock_db,
    valid_payload
):
    valid_payload["CustomerID"] = "not-a-uuid"

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


def test_missing_category(
    mock_db,
    valid_payload
):
    del valid_payload["category"]

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


def test_invalid_category(
    mock_db,
    valid_payload
):
    valid_payload["category"] = "not-a-valid-category"

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


def test_category_is_converted_to_lowercase(
    valid_payload,
    valid_category
):
    from src.schemas.SpendingItem import SpendingItem

    valid_payload["category"] = valid_category.value.upper()

    item = SpendingItem(**valid_payload)

    assert item.category == valid_category


def test_negative_amount_is_rejected(
    mock_db,
    valid_payload
):
    valid_payload["amount"] = -10

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


def test_zero_amount_is_accepted(
    valid_payload
):
    from src.schemas.SpendingItem import SpendingItem

    valid_payload["amount"] = 0

    item = SpendingItem(**valid_payload)

    assert item.amount == 0


def test_missing_amount(
    mock_db,
    valid_payload
):
    del valid_payload["amount"]

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


def test_invalid_month(
    mock_db,
    valid_payload
):
    valid_payload["month"] = "not-a-date"

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


def test_week_zero_is_rejected(
    mock_db,
    valid_payload
):
    valid_payload["week"] = 0

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


def test_week_six_is_rejected(
    mock_db,
    valid_payload
):
    valid_payload["week"] = 6

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


def test_week_one_is_accepted(
    valid_payload
):
    from src.schemas.SpendingItem import SpendingItem

    valid_payload["week"] = 1

    item = SpendingItem(**valid_payload)

    assert item.week == 1


def test_week_five_is_accepted(
    valid_payload
):
    from src.schemas.SpendingItem import SpendingItem

    valid_payload["week"] = 5

    item = SpendingItem(**valid_payload)

    assert item.week == 5


# Subcategory Validation Tests

def test_get_category_id_success(mock_db):
    """Returns the category ID from the database."""

    from src.schemas.Category import Itemtype

    mock_result = MagicMock()
    mock_result.fetchone.return_value = (1,)

    mock_db.execute.return_value = mock_result

    result = Itemtype.Travel.get_category_id(mock_db)

    assert result == 1
    mock_db.execute.assert_called_once()


def test_get_category_id_not_found(mock_db):
    """Raises ValueError when category does not exist."""

    from src.schemas.Category import Itemtype

    mock_result = MagicMock()
    mock_result.fetchone.return_value = None

    mock_db.execute.return_value = mock_result

    with pytest.raises(
        ValueError,
        match="Category 'travel' not found"
    ):
        Itemtype.Travel.get_category_id(mock_db)


def test_get_category_id_database_error(mock_db):
    """Converts SQLAlchemy errors into ValueError."""

    from src.schemas.Category import Itemtype

    mock_db.execute.side_effect = SQLAlchemyError(
        "Database unavailable"
    )

    with pytest.raises(
        ValueError,
        match="Database error occurred"
    ):
        Itemtype.Travel.get_category_id(mock_db)

@pytest.mark.parametrize(
    "category,subcategory",
    [
        (Itemtype.Food, "groceries"),
        (Itemtype.Food, "eating out"),
        (Itemtype.Travel, "fuel"),
        (Itemtype.Travel, "public transport"),
        (Itemtype.Travel, "flights"),
        (Itemtype.Utilities, "electricity"),
        (Itemtype.Utilities, "gas"),
        (Itemtype.Utilities, "water"),
        (Itemtype.Shopping, "clothing"),
        (Itemtype.Shopping, "electronics"),
        (Itemtype.Shopping, "furniture and appliances"),
        (Itemtype.Housing, "rent"),
        (Itemtype.Housing, "mortgage"),
    ]
)
def test_allowed_subcategories(category, subcategory):
    assert category.allowed_subcategory(subcategory)

@pytest.mark.parametrize(
    "category",
    list(Itemtype)
)
def test_invalid_subcategory(category):
    assert not category.allowed_subcategory(
        "invalid-subcategory"
    )


def test_other_category_has_no_subcategories():
    assert not Itemtype.Other.allowed_subcategory("anything")

# Unexpected Fields and Empty Payload Tests

def test_extra_fields_are_rejected(
    mock_db,
    valid_payload
):
    valid_payload["unexpected_field"] = "invalid"

    response = client.post(
        "/spend/",
        json=valid_payload
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


def test_empty_payload_is_rejected(mock_db):
    response = client.post(
        "/spend/",
        json={}
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


def test_invalid_json_is_rejected(mock_db):
    response = client.post(
        "/spend/",
        content="{invalid json",
        headers={
            "Content-Type": "application/json"
        }
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()
