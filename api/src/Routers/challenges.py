from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
import structlog

from database.database import get_db
from ..Core.auth import get_current_user
from ..schemas.ChallengeResponse import ChallengeItem, ChallengeResponse, ChallengeStatusUpdate, MedalResponse
from ..Services.challenges import (
    ChallengeNotFoundError,
    InvalidTransitionError,
    build_challenges,
    get_customer_medal,
    update_challenge_status,
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/challenges")


def first_of_month(month: date = Query(description="First day of the month, e.g. 2026-11-01")) -> date:
    if month.day != 1:
        raise HTTPException(status_code=422, detail="Month must be the first day of a month")
    return month


@router.get(
    "/",
    summary="Get challenges for the signed-in customer",
    description="One challenge per recommendation this month (categories over their spending threshold), "
                "with its status: NOT_STARTED, IN_PROGRESS or COMPLETED.",
    response_model=ChallengeResponse,
)
def get_challenges(
    month: date = Depends(first_of_month),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # The customer always comes from the token, never from a query parameter.
    return build_challenges(db, user["user_id"], month)


@router.get(
    "/medal",
    summary="Get the signed-in customer's medal",
    description="Completed challenges across all months and the medal they earn: 1+ Bronze, 2+ Silver, 3+ Gold.",
    response_model=MedalResponse,
)
def get_medal(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return get_customer_medal(db, user["user_id"])


@router.patch(
    "/{category_id}",
    summary="Start or complete a challenge",
    description="NOT_STARTED -> IN_PROGRESS -> COMPLETED. COMPLETED is final.",
    response_model=ChallengeItem,
    responses={
        404: {"description": "No challenge for this category and month"},
        409: {"description": "Status change not allowed, e.g. COMPLETED -> IN_PROGRESS"},
        500: {"description": "Failed to update the challenge"},
    },
)
def update_challenge(
    category_id: int,
    update: ChallengeStatusUpdate,
    month: date = Depends(first_of_month),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return update_challenge_status(
            db,
            customer_id=user["user_id"],
            category_id=category_id,
            month=month,
            new_status=update.status,
        )
    except ChallengeNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except InvalidTransitionError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except SQLAlchemyError as error:
        logger.error("Database error while updating a challenge", error=str(error))
        raise HTTPException(status_code=500, detail="Failed to update the challenge") from error
