
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
import structlog

from database.database import get_db
from ..schemas.SpendingItem import SpendingItem
from ..Core.auth import get_current_user

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/spend")
logger.info("Spend router initialized with prefix /spend")

@router.post(
    "/",
    summary="Create a new spend entry",
    description="Creates a new spend entry in the database.",
    responses={
        200: {
            "description": "Spend entry created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Spend entry created successfully",
                        "spendingId": 123
                    }
                }
            }
        },
        422: {
            "description": "Invalid category or subcategory",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid category ID"}
                }
            }
        },
        500: {
            "description": "Failed to create spend entry",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to create spend entry"}
                }
            }
        },
    }
)
def create_spend_entry(
    spend_data: SpendingItem,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    customer_id = user["user_id"]
    parent_category_id = spend_data.categoryID
    logger.info("Creating spend entry", customer_id=customer_id, category_id=parent_category_id, subcategory_id=spend_data.subcategoryID)
    
    if spend_data.CustomerID != customer_id:
        logger.error("ERROR: Customer ID does not match authenticated user", customer_id=spend_data.CustomerID, authenticated_user_id=customer_id)
        raise HTTPException(
            status_code=403,
            detail="Customer ID does not match authenticated user"
        )

    try:
        # Confirm that the parent category exists
        category_query = text("""
            SELECT CategoryId
            FROM dbo.Categories
            WHERE CategoryId = :category_id
        """)

        category_result = db.execute(
            category_query,
            {"category_id": parent_category_id}
        ).first()

        if category_result is None:
            logger.error("ERROR: Invalid category ID", category_id=parent_category_id)
            raise HTTPException(
                status_code=422,
                detail="Invalid category ID"
            )

        # Default to the parent category if no subcategory was supplied
        spending_category_id = parent_category_id

        if spend_data.subcategoryID is not None:
            # Resolve the subcategory to its own CategoryId
            subcategory_query = text("""
                SELECT CategoryId
                FROM dbo.Categories
                WHERE ParentCategoryId = :parent_category_id
                  AND LOWER(Name) = :subcategory
            """)

            subcategory_result = db.execute(
                subcategory_query,
                {
                    "parent_category_id": parent_category_id,
                    "subcategory": spend_data.subcategoryID,
                }
            ).first()

            if subcategory_result is None:
                logger.error("ERROR: Subcategory does not belong to the selected category", category_id=parent_category_id, subcategory=spend_data.subcategoryID)
                raise HTTPException(
                    status_code=422,
                    detail="Subcategory does not belong to the selected category"
                )

            spending_category_id = subcategory_result[0]

        # Insert using the resolved category or subcategory ID
        insert_query = text("""
            INSERT INTO dbo.Spending (
                CustomerId,
                CategoryId,
                SpendMonth,
                WeekNumber,
                AmountGBP,
                CreatedAt
            )
            OUTPUT INSERTED.SpendingId
            VALUES (
                :customer_id,
                :category_id,
                :spend_month,
                :week_number,
                :amount_gbp,
                SYSDATETIME()
            )
        """)

        result = db.execute(
            insert_query,
            {
                "customer_id": customer_id,
                "category_id": spending_category_id,
                "spend_month": spend_data.month,
                "week_number": spend_data.week,
                "amount_gbp": spend_data.amount,
            }
        )

        spending_id = result.scalar_one()
        db.commit()
        logger.info("Spend entry created successfully", spending_id=spending_id, customer_id=customer_id)

    except HTTPException:
        db.rollback()
        logger.error("ERROR: HTTPException raised during spend entry creation", customer_id=customer_id, category_id=parent_category_id, subcategory_id=spend_data.subcategoryID)
        raise

    except SQLAlchemyError as e:
        db.rollback()
        logger.error("ERROR: Database error occurred while creating spend entry", error=str(e), customer_id=customer_id, category_id=parent_category_id, subcategory_id=spend_data.subcategoryID)
        raise HTTPException(
            status_code=500,
            detail="Failed to create spend entry"
        )

    return {
        "message": "Spend entry created successfully",
        "spendingId": spending_id
    }
