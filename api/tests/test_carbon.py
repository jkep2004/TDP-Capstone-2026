import uuid
from datetime import date

import pytest

from src.Services import carbon
from src.Services.carbon import calculate_impact, carbon_for, monthly_spend
from src.schemas.SpendingItem import SpendingItem

TRAVEL_FACTOR = 2.7747


def make_item(category=3, subcategory=None, amount=100.0, week=1):
    return SpendingItem(
        customerID=uuid.uuid4(),
        categoryID=category,
        subcategoryID=subcategory,
        amount=amount,
        month=date(2026, 11, 1),
        week=week,
    )


# Pure functions

def test_monthly_spend_averages_weeks_then_scales():
    # (100 + 200) / 2 = 150 per week, x 4.3333 = 649.995
    assert monthly_spend([100.0, 200.0]) == pytest.approx(649.995)


def test_monthly_spend_single_week_is_not_summed():
    assert monthly_spend([100.0]) == pytest.approx(433.33)


def test_monthly_spend_rejects_empty_list():
    with pytest.raises(ValueError):
        monthly_spend([])


def test_carbon_for_multiplies_by_factor():
    assert carbon_for(649.995, TRAVEL_FACTOR) == pytest.approx(1803.54, abs=0.01)


def test_carbon_for_without_factor_is_none_not_zero():
    # None = "not measured" (e.g. Mortgage); 0.0 would wrongly claim zero emissions.
    assert carbon_for(500.0, None) is None


# Orchestration (DB helpers replaced, so no database is needed)

@pytest.fixture
def stub_lookups(monkeypatch):
    monkeypatch.setattr(carbon, "load_factors", lambda db: {3: TRAVEL_FACTOR, 7: None})
    monkeypatch.setattr(carbon, "resolve_category_id", lambda db, category, subcategory: category)


def test_calculate_impact_known_value(stub_lookups):
    items = [make_item(amount=100.0, week=1), make_item(amount=200.0, week=2)]

    result = calculate_impact(items, db=None)

    assert result["status"] == "success"
    assert result["totalCarbonKg"] == pytest.approx(1803.54, abs=0.01)
    assert len(result["breakdown"]) == 2
    assert sum(row["carbonKg"] for row in result["breakdown"]) == pytest.approx(1803.54, abs=0.02)


def test_calculate_impact_untracked_category_is_null(stub_lookups):
    result = calculate_impact([make_item(category=7, amount=500.0)], db=None)

    assert result["totalCarbonKg"] == 0.0
    assert result["breakdown"][0]["carbonKg"] is None


def test_calculate_impact_untracked_category_left_out_of_total(stub_lookups):
    items = [
        make_item(category=3, amount=100.0, week=1),
        make_item(category=3, amount=200.0, week=2),
        make_item(category=7, amount=500.0, week=1),
    ]

    result = calculate_impact(items, db=None)

    # Total is Travel alone; the unmeasured row neither adds 0 nor breaks the sum.
    assert result["totalCarbonKg"] == pytest.approx(1803.54, abs=0.01)
    assert result["breakdown"][2]["carbonKg"] is None


def test_calculate_impact_same_input_same_result(stub_lookups):
    items = [make_item(amount=100.0, week=1), make_item(amount=200.0, week=2)]

    assert calculate_impact(items, db=None) == calculate_impact(items, db=None)
