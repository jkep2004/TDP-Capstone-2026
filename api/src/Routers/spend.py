
from typing import Literal

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
import structlog
from pydantic import Field

from database.database import get_db
from ..schemas.SpendingItem import SpendingItem
from ..Core.auth import get_current_user

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/spend")
logger.info("Spend router initialized with prefix /spend")

class SaveSpendingItem(SpendingItem):
    week: int | None = Field(gt=0, le=5, description="Week of month, or null for a monthly total")

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
    spending_id, = save_entries([spend_data], db, user)
    return {"message": "Spend entry created successfully", "spendingId": spending_id}


@router.post(
    "/batch",
    summary="Save spending entries in one transaction",
    responses={409: {"description": "A spending entry already exists for the selected period"}},
)
def create_spend_batch(
    spending: list[SaveSpendingItem],
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not spending:
        raise HTTPException(status_code=422, detail="Provide at least one spending entry")
    return {"spendingIds": save_entries(spending, db, user)}


@router.post(
    "/month",
    summary="Save spending for a new month",
    responses={409: {"description": "Spending already exists for this month"}},
)
def create_spending_month(
    spending: list[SaveSpendingItem] = Body(min_length=1),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return {"spendingIds": save_entries(spending, db, user, "create-month")}


@router.put("/month", summary="Replace all spending for one month")
def replace_spending_month(
    spending: list[SaveSpendingItem] = Body(min_length=1),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return {"spendingIds": save_entries(spending, db, user, "replace-month")}


def save_entries(spending, db, user, mode: Literal["append", "create-month", "replace-month"] = "append"):
    try:
        customer_id = user["user_id"]
        if any(str(item.customerID) != str(customer_id).lower() for item in spending):
            raise HTTPException(status_code=403, detail="Customer ID does not match authenticated user")
        if mode != "append":
            month = spending[0].month
            if month.day != 1 or any(item.month != month for item in spending):
                raise HTTPException(status_code=422, detail="Provide entries for one spending month")

            params = {"customer_id": customer_id, "month": month}
            # Keep the customer's spending key range locked through the commit,
            # including when the month has no rows yet.
            existing = db.execute(text("""
                SELECT COUNT_BIG(*)
                FROM dbo.Spending WITH (UPDLOCK, HOLDLOCK, INDEX(UQ_Spending_Customer_Category_Month_Week))
                WHERE CustomerId = :customer_id AND SpendMonth = :month
            """), params).scalar_one()
            if existing and mode == "create-month":
                raise HTTPException(status_code=409, detail={"code": "spending_month_exists"})
            if existing:
                db.execute(text("""
                    DELETE FROM dbo.Spending
                    WHERE CustomerId = :customer_id AND SpendMonth = :month
                """), params)

        ids = [insert_spending_entry(item, db, user) for item in spending]
        db.commit()
        return ids
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        logger.error("Database error while saving spending", error=str(error))
        raise HTTPException(status_code=500, detail="Failed to create spend entry") from error


def insert_spending_entry(spend_data, db, user):
    customer_id = user["user_id"]
    parent_category_id = spend_data.categoryID
    logger.info("Creating spend entry", customer_id=customer_id, category_id=parent_category_id, subcategory_id=spend_data.subcategoryID)
    
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
              AND CategoryId = :subcategoryID
        """)

        subcategory_result = db.execute(
            subcategory_query,
            {
                "parent_category_id": parent_category_id,
                "subcategoryID": spend_data.subcategoryID,
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

    try:
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
    except IntegrityError as error:
        if "UQ_Spending_Customer_Category_Month_Week" not in str(error.orig):
            raise
        period = f"{spend_data.month:%Y-%m}"
        if spend_data.week is not None:
            period = f"{period}, week {spend_data.week}"
        raise HTTPException(
            status_code=409,
            detail=f"Spending already exists for {period} (category ID {spending_category_id}). No entries were saved.",
        ) from error

    spending_id = result.scalar_one()
    return spending_id
