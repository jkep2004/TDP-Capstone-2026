
import uuid
from datetime import date
from unittest.mock import MagicMock, call

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from database.database import get_db
from src.Core.auth import get_current_user
from src.Routers.spend import router
from src.schemas.SpendingItem import SpendingItem

# Test application

app = FastAPI()
app.include_router(router)

client = TestClient(app)

# Helpers

def make_first_result(row):
    """Create a mocked SQLAlchemy result supporting .first()."""
    result = MagicMock()
    result.first.return_value = row
    return result

def make_insert_result(spending_id=456):
    """Create a mocked SQLAlchemy INSERT result."""
    result = MagicMock()
    result.scalar_one.return_value = spending_id
    return result

def get_insert_call(mock_db):
    """Return the execute call containing the Spending INSERT."""
    for execute_call in mock_db.execute.call_args_list:
        query = str(execute_call.args[0])

        if "INSERT INTO dbo.Spending" in query:
            return execute_call

    raise AssertionError("Spending INSERT was not executed")


def test_batch_saves_monthly_and_weekly_entries_in_one_transaction(mock_db, valid_payload):
    mock_db.execute.side_effect = [
        make_first_result((1,)), make_insert_result(504),
        make_first_result((1,)), make_insert_result(505),
    ]

    response = client.post("/spend/batch", json=[{**valid_payload, "week": None}, valid_payload])

    assert response.status_code == 200
    assert response.json() == {"spendingIds": [504, 505]}
    assert mock_db.execute.call_args_list[1].args[1]["week_number"] is None
    assert mock_db.execute.call_args_list[3].args[1]["week_number"] == valid_payload["week"]
    mock_db.commit.assert_called_once()


def test_batch_rolls_back_when_a_later_entry_fails(mock_db, valid_payload):
    mock_db.execute.side_effect = [
        make_first_result((1,)), make_insert_result(504),
        make_first_result(None),
    ]

    response = client.post("/spend/batch", json=[valid_payload, {**valid_payload, "categoryID": 99}])

    assert response.status_code == 422
    mock_db.commit.assert_not_called()
    mock_db.rollback.assert_called_once()


def test_batch_reports_duplicate_and_rolls_back_earlier_entries(mock_db, valid_payload):
    duplicate = IntegrityError(
        "INSERT", {}, Exception("Violation of UNIQUE KEY constraint 'UQ_Spending_Customer_Category_Month_Week'")
    )
    mock_db.execute.side_effect = [
        make_first_result((2,)), make_insert_result(505),
        make_first_result((1,)), duplicate,
    ]

    response = client.post("/spend/batch", json=[{**valid_payload, "categoryID": 2}, valid_payload])

    assert response.status_code == 409
    assert "2026-11, week 3" in response.json()["detail"]
    mock_db.commit.assert_not_called()
    mock_db.rollback.assert_called_once()

# Fixtures

def test_create_month_detects_existing_rows_without_writing(mock_db, valid_payload):
    mock_db.execute.return_value = make_insert_result(1)

    response = client.post("/spend/month", json=[valid_payload])

    assert response.status_code == 409
    assert response.json() == {"detail": {"code": "spending_month_exists"}}
    mock_db.execute.assert_called_once()
    mock_db.commit.assert_not_called()
    mock_db.rollback.assert_called_once()


@pytest.mark.parametrize("invalid_category", [False, True])
def test_replace_month_scopes_deletion_and_rolls_back_on_failure(mock_db, valid_payload, invalid_category):
    mock_db.execute.side_effect = [
        make_insert_result(1), MagicMock(),
        make_first_result(None if invalid_category else (1,)), make_insert_result(504),
    ]

    response = client.put("/spend/month", json=[valid_payload])

    delete = mock_db.execute.call_args_list[1]
    assert "DELETE FROM dbo.Spending" in str(delete.args[0])
    assert "CustomerId = :customer_id AND SpendMonth = :month" in str(delete.args[0])
    assert delete.args[1] == {"customer_id": valid_payload["customerID"], "month": date(2026, 11, 1)}
    if invalid_category:
        assert response.status_code == 422
        mock_db.commit.assert_not_called()
        mock_db.rollback.assert_called_once()
    else:
        assert response.status_code == 200
        assert response.json() == {"spendingIds": [504]}
        mock_db.commit.assert_called_once()


def test_replace_month_rejects_mixed_months_before_any_database_work(mock_db, valid_payload):
    response = client.put("/spend/month", json=[
        valid_payload, {**valid_payload, "month": "2026-12-01"},
    ])

    assert response.status_code == 422
    mock_db.execute.assert_not_called()


@pytest.fixture
def customer_id():
    return str(uuid.uuid4())

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_user(customer_id):
    return {
        "user_id": customer_id
    }

@pytest.fixture
def valid_payload(customer_id):
    return {
        "customerID": str(customer_id),
        "categoryID": 1,
        "subcategoryID": None,
        "amount": 125.50,
        "month": "2026-11-01",
        "week": 3,
    }

@pytest.fixture
def payload_with_subcategory(valid_payload):
    payload = valid_payload.copy()
    payload["subcategoryID"] = 5
    return payload

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
def successful_insert(mock_db):
    """
    Configure a successful request without a subcategory.

    Expected database calls:
    1. Parent category lookup
    2. Spending INSERT
    """
    insert_result = make_insert_result(456)

    mock_db.execute.side_effect = [
        make_first_result((1,)),
        insert_result,
    ]

    return insert_result

@pytest.fixture
def successful_subcategory_insert(mock_db):
    """
    Configure a successful request with a subcategory.

    Expected database calls:
    1. Parent category lookup
    2. Subcategory lookup
    3. Spending INSERT

    The subcategory has ID 7 and parent category ID 1.
    """
    insert_result = make_insert_result(456)

    mock_db.execute.side_effect = [
        make_first_result((1,)),
        make_first_result((7,)),
        insert_result,
    ]

    return insert_result

# Successful request tests

def test_create_spend_entry_success(
    mock_db,
    valid_payload,
    successful_insert,
):
    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 200

    assert response.json() == {
        "message": "Spend entry created successfully",
        "spendingId": 456,
    }

    mock_db.commit.assert_called_once()
    mock_db.rollback.assert_not_called()

def test_create_spend_entry_returns_generated_id(
    valid_payload,
    successful_insert,
):
    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 200
    assert response.json()["spendingId"] == 456

def test_create_spend_entry_uses_authenticated_customer(
    mock_db,
    valid_payload,
    customer_id,
    successful_insert,
):
    # Deliberately supply a different CustomerID.
    valid_payload["customerID"] = str(uuid.uuid4())

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 403
    assert mock_db.execute.call_count == 0

def test_create_spend_entry_uses_parent_category_id_when_no_subcategory(
    mock_db,
    valid_payload,
    successful_insert,
):
    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 200

    insert_call = get_insert_call(mock_db)
    params = insert_call.args[1]

    assert params["category_id"] == 1

def test_create_spend_entry_uses_subcategory_id(
    mock_db,
    payload_with_subcategory,
    successful_subcategory_insert,
):
    response = client.post(
        "/spend/",
        json=payload_with_subcategory,
    )

    assert response.status_code == 200

    insert_call = get_insert_call(mock_db)
    params = insert_call.args[1]

    # The subcategory ID is stored, not its parent category ID.
    assert params["category_id"] == 7
    assert params["category_id"] != 1

def test_create_spend_entry_uses_correct_amount(
    mock_db,
    valid_payload,
    successful_insert,
):
    client.post("/spend/", json=valid_payload)

    insert_call = get_insert_call(mock_db)
    params = insert_call.args[1]

    assert params["amount_gbp"] == 125.50

def test_create_spend_entry_uses_correct_month(
    mock_db,
    valid_payload,
    successful_insert,
):
    client.post("/spend/", json=valid_payload)

    insert_call = get_insert_call(mock_db)
    params = insert_call.args[1]

    assert params["spend_month"] == date(2026, 11, 1)

def test_create_spend_entry_uses_correct_week(
    mock_db,
    valid_payload,
    successful_insert,
):
    client.post("/spend/", json=valid_payload)

    insert_call = get_insert_call(mock_db)
    params = insert_call.args[1]

    assert params["week_number"] == 3

def test_create_spend_entry_passes_all_sql_parameters(
    mock_db,
    valid_payload,
    customer_id,
    successful_insert,
):
    client.post("/spend/", json=valid_payload)

    insert_call = get_insert_call(mock_db)
    params = insert_call.args[1]

    assert params == {
        "customer_id": customer_id,
        "category_id": 1,
        "spend_month": date(2026, 11, 1),
        "week_number": 3,
        "amount_gbp": 125.50,
    }

def test_subcategory_insert_passes_subcategory_id(
    mock_db,
    payload_with_subcategory,
    successful_subcategory_insert,
):
    client.post(
        "/spend/",
        json=payload_with_subcategory,
    )

    insert_call = get_insert_call(mock_db)
    params = insert_call.args[1]

    assert params["category_id"] == 7

# SQL query tests

def test_create_spend_entry_checks_parent_category(
    mock_db,
    valid_payload,
    successful_insert,
):
    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 200

    first_query = str(mock_db.execute.call_args_list[0].args[0])

    assert "dbo.Categories" in first_query
    assert "CategoryId" in first_query

def test_create_spend_entry_executes_insert(
    mock_db,
    valid_payload,
    successful_insert,
):
    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 200

    insert_call = get_insert_call(mock_db)
    query = str(insert_call.args[0])

    assert "INSERT INTO dbo.Spending" in query
    assert "OUTPUT INSERTED.SpendingId" in query

def test_subcategory_request_executes_subcategory_lookup(
    mock_db,
    payload_with_subcategory,
    successful_subcategory_insert,
):
    response = client.post(
        "/spend/",
        json=payload_with_subcategory,
    )

    assert response.status_code == 200

    subcategory_query = str(
        mock_db.execute.call_args_list[1].args[0]
    )

    assert "dbo.Categories" in subcategory_query
    assert "ParentCategoryId" in subcategory_query

def test_subcategory_lookup_uses_parent_category_id(
    mock_db,
    payload_with_subcategory,
    successful_subcategory_insert,
):
    client.post(
        "/spend/",
        json=payload_with_subcategory,
    )

    subcategory_params = mock_db.execute.call_args_list[1].args[1]

    assert subcategory_params["parent_category_id"] == 1
    assert subcategory_params["subcategoryID"] == 5

def test_create_spend_entry_commits_transaction(
    mock_db,
    valid_payload,
    successful_insert,
):
    client.post("/spend/", json=valid_payload)

    mock_db.commit.assert_called_once()

# Category lookup validation tests

def test_parent_category_not_found(
    mock_db,
    valid_payload,
):
    mock_db.execute.side_effect = [
        make_first_result(None),
    ]

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Invalid category ID"

    # No INSERT should be executed.
    assert mock_db.execute.call_count == 1
    mock_db.commit.assert_not_called()
    mock_db.rollback.assert_called_once()

def test_subcategory_not_found(
    mock_db,
    payload_with_subcategory,
):
    mock_db.execute.side_effect = [
        make_first_result((1,)),
        make_first_result(None),
    ]

    response = client.post(
        "/spend/",
        json=payload_with_subcategory,
    )

    assert response.status_code == 422

    assert response.json()["detail"] == (
        "Subcategory does not belong to the selected category"
    )

    # Parent and subcategory lookups occur, but no INSERT.
    assert mock_db.execute.call_count == 2
    mock_db.commit.assert_not_called()
    mock_db.rollback.assert_called_once()

def test_subcategory_must_belong_to_selected_parent(
    mock_db,
    payload_with_subcategory,
):
    # The lookup returns no matching child for the supplied parent.
    mock_db.execute.side_effect = [
        make_first_result((1,)),
        make_first_result(None),
    ]

    response = client.post(
        "/spend/",
        json=payload_with_subcategory,
    )

    assert response.status_code == 422
    mock_db.commit.assert_not_called()

# Database execution error tests

def test_database_execution_error(
    mock_db,
    valid_payload,
):
    mock_db.execute.side_effect = SQLAlchemyError(
        "Database connection failed"
    )

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 500

    assert response.json() == {
        "detail": "Failed to create spend entry",
    }

    mock_db.rollback.assert_called_once()
    mock_db.commit.assert_not_called()

def test_database_error_during_subcategory_lookup(
    mock_db,
    payload_with_subcategory,
):
    mock_db.execute.side_effect = [
        make_first_result((1,)),
        SQLAlchemyError("Subcategory lookup failed"),
    ]

    response = client.post(
        "/spend/",
        json=payload_with_subcategory,
    )

    assert response.status_code == 500
    mock_db.rollback.assert_called_once()
    mock_db.commit.assert_not_called()

def test_database_commit_error(
    mock_db,
    valid_payload,
    successful_insert,
):
    mock_db.commit.side_effect = SQLAlchemyError(
        "Commit failed"
    )

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 500

    assert response.json() == {
        "detail": "Failed to create spend entry",
    }

    mock_db.commit.assert_called_once()
    mock_db.rollback.assert_called_once()

def test_database_scalar_error(
    mock_db,
    valid_payload,
):
    insert_result = make_insert_result()

    insert_result.scalar_one.side_effect = SQLAlchemyError(
        "Failed to retrieve SpendingId"
    )

    mock_db.execute.side_effect = [
        make_first_result((1,)),
        insert_result,
    ]

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 500
    mock_db.rollback.assert_called_once()
    mock_db.commit.assert_not_called()

# Payload validation tests

def test_missing_customer_id(
    mock_db,
    valid_payload,
):
    del valid_payload["customerID"]

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_invalid_customer_id(
    mock_db,
    valid_payload,
):
    valid_payload["CustomerID"] = "not-a-uuid"

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_missing_category(
    mock_db,
    valid_payload,
):
    del valid_payload["categoryID"]

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_category_must_be_an_integer(
    mock_db,
    valid_payload,
):
    valid_payload["category"] = "not-a-category-id"

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_categoryID_must_be_positive(
    mock_db,
    valid_payload,
):
    valid_payload["categoryID"] = -1

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_none_subcategory_is_accepted(
    valid_payload,
):
    valid_payload["subcategoryID"] = None

    item = SpendingItem(**valid_payload)

    assert item.subcategoryID is None

def test_negative_amount_is_rejected(
    mock_db,
    valid_payload,
):
    valid_payload["amount"] = -10

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_zero_amount_is_accepted(
    valid_payload,
):
    valid_payload["amount"] = 0

    item = SpendingItem(**valid_payload)

    assert item.amount == 0

def test_amount_at_limit_is_accepted(valid_payload):
    valid_payload["amount"] = 100_000
    Item = SpendingItem(**valid_payload)
    assert Item.amount == 100_000

def test_amount_exceeding_limit_is_rejected(valid_payload, mock_db):
    valid_payload["amount"] = 100_000.01
    response = client.post("/spend/", json=valid_payload)
    assert response.status_code == 422
    mock_db.execute.assert_not_called()



def test_missing_amount(
    mock_db,
    valid_payload,
):
    del valid_payload["amount"]

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_invalid_month(
    mock_db,
    valid_payload,
):
    valid_payload["month"] = "not-a-date"

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_week_zero_is_rejected(
    mock_db,
    valid_payload,
):
    valid_payload["week"] = 0

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_week_six_is_rejected(
    mock_db,
    valid_payload,
):
    valid_payload["week"] = 6

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_week_one_is_accepted(
    valid_payload,
):
    valid_payload["week"] = 1

    item = SpendingItem(**valid_payload)

    assert item.week == 1

def test_week_five_is_accepted(
    valid_payload,
):
    valid_payload["week"] = 5

    item = SpendingItem(**valid_payload)

    assert item.week == 5

# Unexpected fields and empty payload tests

def test_extra_fields_are_rejected(
    mock_db,
    valid_payload,
):
    valid_payload["unexpected_field"] = "invalid"

    response = client.post(
        "/spend/",
        json=valid_payload,
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_empty_payload_is_rejected(mock_db):
    response = client.post(
        "/spend/",
        json={},
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()

def test_invalid_json_is_rejected(mock_db):
    response = client.post(
        "/spend/",
        content="{invalid json",
        headers={
            "Content-Type": "application/json",
        },
    )

    assert response.status_code == 422
    mock_db.execute.assert_not_called()
