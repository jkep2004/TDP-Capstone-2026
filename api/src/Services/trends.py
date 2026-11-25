"""Month-by-month spend and carbon trends for GET /trends (Python 3.11).

Reads dbo.vw_MonthlyByMainCategory (monthly spend and carbon per main category).
Keep the SQL in get_monthly_rows so it can be pointed at a different view in one place.
"""
from datetime import date

from sqlalchemy import text


def percent_change(previous: float, current: float) -> float | None:
    """Percentage change from previous to current, 2 dp. None when there is no baseline (previous is 0)."""
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 2)


def get_monthly_rows(db, customer_id: str) -> list[dict]:
    """One parameterised query: every month and main category for this customer, oldest first."""
    rows = db.execute(
        text("""
            SELECT SpendMonth,
                   CategoryId,
                   Category,
                   EstMonthlyGBP,
                   EstMonthlyCarbonKg
            FROM dbo.vw_MonthlyByMainCategory
            WHERE CustomerId = :customer_id
            ORDER BY SpendMonth, CategoryId
        """),
        {"customer_id": customer_id},
    ).fetchall()

    # DECIMAL columns come back as Decimal; convert once here.
    return [
        {
            "month": row[0],
            "category_id": row[1],
            "category": row[2],
            "monthly_spend_gbp": float(row[3]),
            "carbon_kg": float(row[4]) if row[4] is not None else 0.0,
        }
        for row in rows
    ]


def build_trends(db, customer_id: str, months: int) -> dict:
    """Payload for TrendsResponse: the latest `months` months that have data, oldest first.

    The change is measured against the previous month in the data. The first
    month has no change (None) because there is nothing to compare it to.
    """
    rows = get_monthly_rows(db, customer_id)

    by_month: dict[date, list[dict]] = {}
    for row in rows:
        by_month.setdefault(row["month"], []).append(row)

    # Only months that have data are counted, so a gap never pads the result with zeros.
    selected_months = sorted(by_month)[-months:]

    points = []
    previous_carbon: float | None = None

    for month in selected_months:
        categories = by_month[month]
        total_carbon = sum(c["carbon_kg"] for c in categories)
        total_spend = sum(c["monthly_spend_gbp"] for c in categories)

        points.append({
            "month": month,
            "total_spend_gbp": round(total_spend, 2),
            "total_carbon_kg": round(total_carbon, 2),
            "carbon_change_kg": (
                round(total_carbon - previous_carbon, 2) if previous_carbon is not None else None
            ),
            "carbon_change_pct": (
                percent_change(previous_carbon, total_carbon) if previous_carbon is not None else None
            ),
            "categories": [
                {
                    "category_id": c["category_id"],
                    "category": c["category"],
                    "monthly_spend_gbp": round(c["monthly_spend_gbp"], 2),
                    "carbon_kg": round(c["carbon_kg"], 2),
                }
                for c in categories
            ],
        })
        previous_carbon = total_carbon

    return {"months": points}
