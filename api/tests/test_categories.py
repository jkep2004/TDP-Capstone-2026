
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from uuid import uuid4

from src.main import app
from src.schemas.Category import Category
from database.database import get_db

# Fixtures

@pytest.fixture
def mock_categories():
    return [
        (1, "Food", "Food and dining expenses", None, True),
        (2, "Groceries", "Grocery expenses", 1, True),
        (3, "Travel", "Travel expenses", None, True),
        (4, "Flights", "Flight expenses", 3, True),
        (5, "Utilities", "Household utilities", None, False),
        (6, "Public Transport", "Public transport expenses", 3, True),
        (7, "Other", "Other expenses", None, False),
    ]


@pytest.fixture
def mock_db(mock_categories):
    db = MagicMock()
    db.execute.return_value.fetchall.return_value = mock_categories
    return db

@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()

# Spending input validation

CUSTOMER_ID_1 = str(uuid4())
CUSTOMER_ID_2 = str(uuid4())
CUSTOMER_ID_3 = str(uuid4())
MONTH = "2026-11-01"

test_rows = [
    pytest.param(
        {
            "spending": [{
                "customerID": CUSTOMER_ID_1,
                "categoryID": 3,
                "subcategoryID": 4,
                "amount": 12,
                "month": MONTH,
                "week": 3,
            }]
        },
        200,
        id="Travel-Flights",
    ),
    pytest.param(
        {
            "spending": [{
                "customerID": CUSTOMER_ID_2,
                "categoryID": 7,
                "subcategoryID": None,
                "amount": 2132,
                "month": MONTH,
                "week": 3,
            }]
        },
        200,
        id="Other-None",
    ),
    pytest.param(
        {
            "spending": [{
                "customerID": CUSTOMER_ID_3,
                "categoryID": 3,
                "subcategoryID": None,
                "amount": 2132,
                "month": MONTH,
                "week": 3,
            }]
        },
        200,
        id="Travel-None",
    ),
    pytest.param(
        {
            "spending": [{
                "customerID": CUSTOMER_ID_3,
                "categoryID": 3,
                "subcategoryID": 6,
                "amount": 2132,
                "month": MONTH,
                "week": 3,
            }]
        },
        200,
        id="Travel-Public-Transport",
    ),
]

@pytest.mark.parametrize("payload, expected_status", test_rows)
def test_input_validation(client, monkeypatch, payload, expected_status):
    # This test is about input validation, not factors: the shared mock returns
    # category rows for every query, so stub the factor lookup out.
    monkeypatch.setattr("src.Services.carbon.load_factors", lambda db: {})
    response = client.post("/api/v1/calculate", json=payload)
    
    print(response.status_code)
    print(response.json())

    assert response.status_code == expected_status

# Category model tests

def test_category_model():
    category = Category(
        id=1,
        name="food",
        description="Food and dining expenses",
        parent_id=None,
        is_carbon_tracked=True
    )

    assert category.id == 1
    assert category.name == "food"
    assert category.description == "Food and dining expenses"
    assert category.parent_id is None
    assert category.is_carbon_tracked is True

def test_category_ids_are_unique(mock_categories):
    category_ids = [category[0] for category in mock_categories]

    assert len(category_ids) == len(set(category_ids))

def test_category_names_are_unique(mock_categories):
    category_names = [category[1] for category in mock_categories]

    assert len(category_names) == len(set(category_names))


def test_category_attributes(mock_categories):
    for category in mock_categories:
        assert isinstance(category[0], int)
        assert isinstance(category[1], str)
        assert isinstance(category[2], str)
        assert category[3] is None or isinstance(category[3], int)
        assert isinstance(category[4], bool)

# Categories endpoint tests

def test_category_endpoint_validation(client, mock_categories):
    response = client.get("/api/v1/categories/")

    assert response.status_code == 200

    response_data = response.json()

    assert isinstance(response_data, list)
    assert len(response_data) == len(mock_categories)

    for category in response_data:
        assert "id" in category
        assert "name" in category
        assert "description" in category
        assert "parent_id" in category
        assert "is_carbon_tracked" in category

def test_category_endpoint_returns_expected_categories(client, mock_categories):
    response = client.get("/api/v1/categories/")

    assert response.status_code == 200

    expected_categories = [
        {
            "id": category[0],
            "name": category[1],
            "description": category[2],
            "parent_id": category[3],
            "is_carbon_tracked": category[4]
        }
        for category in mock_categories
    ]

    assert response.json() == expected_categories

# Individual category endpoint tests

@pytest.mark.parametrize(
    "category",
    [
        (1, "Food", "Food and dining expenses", None, True),
        (2, "Groceries", "Grocery expenses", 1, True),
        (3, "Travel", "Travel expenses", None, True),
        (4, "Flights", "Flight expenses", 3, True),
        (5, "Utilities", "Household utilities", None, False)
    ],
    ids=["Food", "Groceries", "Travel", "Flights", "Utilities"]
)
def test_get_category_by_id(client, category):
    response = client.get(f"/api/v1/categories/{category[0]}")

    assert response.status_code == 200

    response_data = response.json()

    assert response_data == {
        "id": category[0],
        "name": category[1],
        "description": category[2],
        "parent_id": category[3],
        "is_carbon_tracked": category[4]
    }


def test_get_category_not_found(client):
    response = client.get("/api/v1/categories/999999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Category not found"}

# Subcategory endpoint tests

@pytest.mark.parametrize(
    "category_id, expected_subcategories",
    [
        (1, [2]),
        (3, [4, 6]),
        (5, [])
    ],
    ids=["Food-Subcategories", "Travel-Subcategories", "Utilities-No-Subcategories"]
)
def test_get_subcategories(client, category_id, expected_subcategories):
    response = client.get(
        f"/api/v1/categories/{category_id}/subcategories"
    )

    assert response.status_code == 200

    returned_ids = [
        category["id"]
        for category in response.json()
    ]

    assert returned_ids == expected_subcategories

def test_get_subcategories_for_nonexistent_category(client):
    response = client.get("/api/v1/categories/999999/subcategories")

    assert response.status_code == 404
    assert response.json() == {"detail": "Category not found"}