from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.database import get_db
from ..Core.auth import get_current_user
from ..schemas.SavingsResponse import SavingsResponse
from ..Services.recommendations import build_savings

router = APIRouter(prefix="/savings")


@router.get(
    "/",
    summary="Get projected savings for the signed-in customer",
    description="Returns projected money and carbon savings per category, with totals, for categories above their threshold.",
    response_model=SavingsResponse,
)
def get_savings(
    month: date = Query(description="First day of the month, e.g. 2026-11-01"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if month.day != 1:
        raise HTTPException(status_code=422, detail="Month must be the first day of a month")

    # The customer always comes from the token, never from a query parameter.
    return build_savings(db, user["user_id"], month)
