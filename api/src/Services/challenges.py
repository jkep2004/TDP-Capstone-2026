
from datetime import date

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from ..schemas.ChallengeResponse import ChallengeStatus


class ChallengeNotFoundError(LookupError):
    """No recommendation (so no challenge) for this customer, category and month."""


class InvalidTransitionError(ValueError):
    """The requested status change is not allowed, e.g. COMPLETED -> IN_PROGRESS."""


# except for COMPLETED, which is final.
ALLOWED_TRANSITIONS: dict[ChallengeStatus, frozenset[ChallengeStatus]] = {
    ChallengeStatus.NOT_STARTED: frozenset({ChallengeStatus.NOT_STARTED, ChallengeStatus.IN_PROGRESS}),
    ChallengeStatus.IN_PROGRESS: frozenset({ChallengeStatus.IN_PROGRESS, ChallengeStatus.COMPLETED}),
    ChallengeStatus.COMPLETED: frozenset(),
}


def can_transition(current: ChallengeStatus, new: ChallengeStatus) -> bool:
    return new in ALLOWED_TRANSITIONS[current]


# Fixed SQL with bind parameters only (no string building), so Bandit B608 stays clean.
_LIST_CHALLENGES = text("""
    SELECT CategoryId, Category, Recommendation, LowerCarbonAlternative, Action,
           SavingGBP, CarbonSavedKg, Priority, Status, StartedAt, CompletedAt
    FROM dbo.vw_CustomerChallenges
    WHERE CustomerId = :customer_id
      AND SpendMonth = :month
    ORDER BY Priority, CategoryId
""")

_ONE_CHALLENGE = text("""
    SELECT CategoryId, Category, Recommendation, LowerCarbonAlternative, Action,
           SavingGBP, CarbonSavedKg, Priority, Status, StartedAt, CompletedAt
    FROM dbo.vw_CustomerChallenges
    WHERE CustomerId = :customer_id
      AND SpendMonth = :month
      AND CategoryId = :category_id
""")


def _optional_float(value) -> float | None:
    return float(value) if value is not None else None


def _to_item(row) -> dict:
    """One view row -> one ChallengeItem payload."""
    return {
        "category_id": row[0],
        "category": row[1],
        "recommendation": row[2],
        "lower_carbon_alternative": row[3],
        "action": row[4],
        "projected_savings_gbp": _optional_float(row[5]),
        "projected_carbon_reduction_kg": _optional_float(row[6]),
        "priority": int(row[7]) if row[7] is not None else None,
        "status": ChallengeStatus(row[8]),
        "started_at": row[9],
        "completed_at": row[10],
    }


def get_customer_challenges(db, customer_id: str, month: date) -> list[dict]:
    """Every challenge for this customer and month, biggest carbon saving first."""
    rows = db.execute(
        _LIST_CHALLENGES,
        {"customer_id": customer_id, "month": month},
    ).fetchall()
    return [_to_item(row) for row in rows]


def get_customer_challenge(db, customer_id: str, category_id: int, month: date) -> dict | None:
    """One challenge, or None when the customer has no recommendation for that category and month."""
    row = db.execute(
        _ONE_CHALLENGE,
        {"customer_id": customer_id, "month": month, "category_id": category_id},
    ).first()
    return _to_item(row) if row is not None else None


def build_challenges(db, customer_id: str, month: date) -> dict:
    """Payload for ChallengeResponse."""
    return {"month": month, "challenges": get_customer_challenges(db, customer_id, month)}


def update_challenge_status(
    db, customer_id: str, category_id: int, month: date, new_status: ChallengeStatus
) -> dict:
    """Move one challenge to a new status and return it as it is now stored.

    Raises ChallengeNotFoundError (-> 404) and InvalidTransitionError (-> 409).
    """
    challenge = get_customer_challenge(db, customer_id, category_id, month)
    if challenge is None:
        raise ChallengeNotFoundError(f"No challenge for category {category_id} in {month:%Y-%m}")

    current = challenge["status"]
    if not can_transition(current, new_status):
        raise InvalidTransitionError(f"Cannot move a challenge from {current} to {new_status}")

    if new_status == current:
        return challenge  # nothing to change, so no write

    params = {"customer_id": customer_id, "category_id": category_id, "month": month}
    try:
        if current == ChallengeStatus.NOT_STARTED:
            # First time: the row is created. StartedAt defaults to SYSUTCDATETIME().
            db.execute(
                text("""
                    INSERT INTO dbo.CustomerChallenges (CustomerId, CategoryId, SpendMonth, Status)
                    VALUES (:customer_id, :category_id, :month, :status)
                """),
                {**params, "status": new_status.value},
            )
        else:
            db.execute(
                text("""
                    UPDATE dbo.CustomerChallenges
                    SET Status = :status, CompletedAt = SYSUTCDATETIME()
                    WHERE CustomerId = :customer_id
                      AND CategoryId = :category_id
                      AND SpendMonth = :month
                """),
                {**params, "status": new_status.value},
            )
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise InvalidTransitionError("This challenge was updated by another request; reload and try again") from error
    except Exception:
        db.rollback()
        raise

    return get_customer_challenge(db, customer_id, category_id, month)


def get_customer_medal(db, customer_id: str) -> dict:
    """Completed challenges and medal for this customer (all months)."""
    row = db.execute(
        text("""
            SELECT CompletedChallenges, Medal
            FROM dbo.vw_CustomerMedals
            WHERE CustomerId = :customer_id
        """),
        {"customer_id": customer_id},
    ).first()

    if row is None:
        return {"completed_challenges": 0, "medal": None}
    return {"completed_challenges": int(row[0] or 0), "medal": row[1]}
