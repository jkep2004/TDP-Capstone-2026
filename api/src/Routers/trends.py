from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database.database import get_db
from ..Core.auth import get_current_user
from ..schemas.TrendsResponse import TrendsResponse
from ..Services.trends import build_trends

router = APIRouter(prefix="/trends")


@router.get(
    "/",
    summary="Get month-by-month spend and carbon trends for the signed-in customer",
    description="Returns total spend and carbon per month, the change since the previous month, and each main category, oldest month first.",
    response_model=TrendsResponse,
)
def get_trends(
    months: int = Query(default=6, ge=1, le=24, description="How many of the latest months with data to return"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # The customer always comes from the token, never from a query parameter.
    return build_trends(db, user["user_id"], months)
