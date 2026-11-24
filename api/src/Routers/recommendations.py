from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.database import get_db
from ..Core.auth import get_current_user
from ..schemas.RecommendationsResponse import RecommendationsResponse
from ..Services.recommendations import build_recommendations

router = APIRouter(prefix="/recommendations")


@router.get(
    "/",
    summary="Get recommendations for the signed-in customer",
    description="Returns advice for each main category where the customer's monthly spend is above the threshold.",
    response_model=RecommendationsResponse,
)
def get_recommendations(
    month: date = Query(description="First day of the month, e.g. 2026-11-01"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if month.day != 1:
        raise HTTPException(status_code=422, detail="Month must be the first day of a month")

    # The customer always comes from the token, never from a query parameter.
    return build_recommendations(db, user["user_id"], month)
