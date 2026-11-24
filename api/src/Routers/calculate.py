
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from database.database import get_db
from ..schemas.CalculateRequest import CalculateRequest
from ..schemas.CalculateResponse import CalculateResponse

router = APIRouter(prefix="/calculate")

@router.post(
    "/",
    summary="Calculate carbon footprint",
    description="Calculates the carbon footprint based on the provided spending data.",
    response_model=CalculateResponse,
)
def calculate(
    request: CalculateRequest,
    db: Session = Depends(get_db),
):
    breakdown = []

    for item in request.spending:
        # Check that the supplied category exists.
        category_result = db.execute(
            text("""
                SELECT CategoryId
                FROM dbo.Categories
                WHERE CategoryId = :category_id
                  AND ParentCategoryId IS NULL
            """),
            {"category_id": item.category},
        ).first()

        if category_result is None:
            raise HTTPException(
                status_code=422,
                detail="Invalid category ID",
            )

        # Check that a supplied subcategory belongs to the category.
        if item.subcategory is not None:
            subcategory_result = db.execute(
                text("""
                    SELECT CategoryId
                    FROM dbo.Categories
                    WHERE ParentCategoryId = :parent_category_id
                      AND LOWER(Name) = :subcategory
                """),
                {
                    "parent_category_id": item.category,
                    "subcategory": item.subcategory,
                },
            ).first()

            if subcategory_result is None:
                raise HTTPException(
                    status_code=422,
                    detail="Subcategory does not belong to the selected category",
                )

        breakdown.append({
            "category": item.category,
            "subcategory": item.subcategory,
            "amount": item.amount,
            "week": item.week,
            "carbonKg": 0,
        })

    total_carbon_kg = sum(
        item["carbonKg"] for item in breakdown
    )

    return {
        "status": "success",
        "totalCarbonKg": total_carbon_kg,
        "breakdown": breakdown,
        "recommendations": [],
    }
