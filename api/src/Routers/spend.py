from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database.database import get_db
from ..schemas.SpendingItem import SpendingItem
from ..Core.auth import get_current_user

router = APIRouter(
    prefix="/spend"
)

@router.post(
    "/",
    summary="Create a new spend entry",
    description="Creates a new spend entry in the database."
)
def create_spend_entry(
    spend_data: SpendingItem,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # TODO: Validate spending item

    # Retrieve values
    customer_id = user["user_id"]
    category_id = spend_data.category.get_category_id(db)
    spend_month = spend_data.month
    week_number = spend_data.week
    amount_gbp = spend_data.amount
    
    print (f"Creating spend entry for customer_id: {customer_id}, category_id: {category_id}, spend_month: {spend_month}, week_number: {week_number}, amount_gbp: {amount_gbp}")

    # Insert into database
    query = text("""
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
            query,
            {
                "customer_id": customer_id,
                "category_id": category_id,
                "spend_month": spend_month,
                "week_number": week_number,
                "amount_gbp": amount_gbp,
            }
        )

        spending_id = result.scalar_one()

        db.commit()

    except SQLAlchemyError as e:
        db.rollback()
        print("ERROR: ", e)
        raise HTTPException(
            status_code=500,
            detail="Failed to create spend entry"
        )

    return {
        "message": "Spend entry created successfully",
        "spendingId": spending_id
    }