
from fastapi import HTTPException
from sqlalchemy import text

from ..schemas.SpendingItem import SpendingItem

# TODO: read WeeksPerMonth from dbo.Assumptions once and cache it (seed value 4.3333).
WEEKS_PER_MONTH = 4.3333


def resolve_category_id(db, category: int, subcategory: str | None) -> int:
    """Return the CategoryId to price: the subcategory's own id if given, else the main category's."""
    category_result = db.execute(
        text("""
            SELECT CategoryId
            FROM dbo.Categories
            WHERE CategoryId = :category_id
              AND ParentCategoryId IS NULL
        """),
        {"category_id": category},
    ).first()

    if category_result is None:
        raise HTTPException(status_code=422, detail="Invalid category ID")

    if subcategory is None:
        return category

    subcategory_result = db.execute(
        text("""
            SELECT CategoryId
            FROM dbo.Categories
            WHERE ParentCategoryId = :parent_category_id
              AND LOWER(Name) = :subcategory
        """),
        {"parent_category_id": category, "subcategory": subcategory},
    ).first()

    if subcategory_result is None:
        raise HTTPException(
            status_code=422,
            detail="Subcategory does not belong to the selected category",
        )

    return subcategory_result[0]


def load_factors(db) -> dict[int, float | None]:
    rows = db.execute(
        text("SELECT CategoryId, KgCO2ePerGBP FROM dbo.vw_EffectiveEmissionsFactors")
    ).fetchall()

   
    return {
        row[0]: (float(row[1]) if row[1] is not None else None)
        for row in rows
    }


def monthly_spend(weekly_amounts: list[float]) -> float:
    if not weekly_amounts:
        raise ValueError("monthly_spend needs at least one weekly amount")
    return (sum(weekly_amounts) / len(weekly_amounts)) * WEEKS_PER_MONTH


def carbon_for(monthly: float, factor: float | None) -> float:
    
    if factor is None:
        return 0.0
    return monthly * factor


def calculate_impact(items: list[SpendingItem], db) -> dict:
    factors = load_factors(db)

    item_category_ids: list[int] = []
    weekly_by_category: dict[int, list[float]] = {}

    for item in items:
        category_id = resolve_category_id(db, item.category, item.subcategory)
        item_category_ids.append(category_id)
        weekly_by_category.setdefault(category_id, []).append(item.amount)

    category_carbon = {
        category_id: carbon_for(monthly_spend(amounts), factors.get(category_id))
        for category_id, amounts in weekly_by_category.items()
    }

   
    breakdown = [
        {
            "category": item.category,
            "subcategory": item.subcategory,
            "amount": item.amount,
            "week": item.week,
            "carbonKg": round(
                category_carbon[category_id] / len(weekly_by_category[category_id]), 2
            ),
        }
        for item, category_id in zip(items, item_category_ids)
    ]

    return {
        "status": "success",
        "totalCarbonKg": round(sum(category_carbon.values()), 2),
        "breakdown": breakdown,
        "recommendations": [],
    }
