
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database.database import get_db
from ..schemas.SpendingItem import SpendingItem
from ..Core.auth import get_current_user


router = APIRouter(prefix="/spend")


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
    
    if spend_data.CustomerID != customer_id:
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

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError as e:
        db.rollback()
        print("ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="Failed to create spend entry"
        )

    return {
        "message": "Spend entry created successfully",
        "spendingId": spending_id
    }
