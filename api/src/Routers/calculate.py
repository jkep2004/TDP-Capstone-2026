
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
import structlog

from database.database import get_db
from ..schemas.CalculateRequest import CalculateRequest
from ..schemas.CalculateResponse import CalculateResponse

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/calculate")
logger.info("Calculate router initialized with prefix /calculate")

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
            {"category_id": item.categoryID},
        ).first()

        if category_result is None:
            logger.error("ERROR: Invalid category ID", category_id=item.categoryID)
            raise HTTPException(
                status_code=422,
                detail="Invalid category ID",
            )

        # Check that a supplied subcategory belongs to the category.
        if item.subcategoryID is not None:
            subcategory_result = db.execute(
                text("""
                    SELECT CategoryId
                    FROM dbo.Categories
                    WHERE ParentCategoryId = :parent_category_id
                      AND CategoryId = :subcategory_ID
                """),
                {
                    "parent_category_id": item.categoryID,
                    "subcategory_ID": item.subcategoryID,
                },
            ).first()

            if subcategory_result is None:
                logger.error("ERROR: Subcategory does not belong to the selected category", category_id=item.categoryID, subcategory=item.subcategoryID)
                raise HTTPException(
                    status_code=422,
                    detail="Subcategory does not belong to the selected category",
                )

        breakdown.append({
            "category": item.categoryID,
            "subcategory": item.subcategoryID,
            "amount": item.amount,
            "week": item.week,
            "carbonKg": 0,
        })

    total_carbon_kg = sum(
        item["carbonKg"] for item in breakdown
    )
    
    logger.info("Carbon footprint calculated", total_carbon_kg=total_carbon_kg, breakdown=breakdown)

    return {
        "status": "success",
        "totalCarbonKg": total_carbon_kg,
        "breakdown": breakdown,
        "recommendations": [],
    }
