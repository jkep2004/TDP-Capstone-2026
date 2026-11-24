from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.database import get_db
from ..Core.auth import get_current_user
from ..schemas.SummaryResponse import SummaryResponse
from ..Services.summary import build_summary

router = APIRouter(prefix="/summary")


@router.get(
    "/",
    summary="Get the monthly carbon summary for the signed-in customer",
    description="Returns total spend and carbon for the month, and each main category's carbon and share, highest first.",
    response_model=SummaryResponse,
)
def get_summary(
    month: date = Query(description="First day of the month, e.g. 2026-11-01"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if month.day != 1:
        raise HTTPException(status_code=422, detail="Month must be the first day of a month")

    # The customer always comes from the token, never from a query parameter.
    return build_summary(db, user["user_id"], month)
