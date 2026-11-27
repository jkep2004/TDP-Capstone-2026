"""Monthly carbon summary for GET /summary (Python 3.11).

Reads dbo.vw_MonthlyByMainCategory (monthly spend and carbon per main category, with
sub-categories already rolled up). Keep the SQL in get_monthly_by_category so it can be
pointed at a different view (e.g. vw_CategoryInsights) in one place.
"""
from datetime import date

from sqlalchemy import text


def carbon_share(category_carbon: float, total_carbon: float) -> float:
    """Percentage of the total carbon, rounded to 2 decimal places. A zero total gives 0."""
    if total_carbon == 0:
        return 0.0
    return round(category_carbon / total_carbon * 100, 2)


def get_monthly_by_category(db, customer_id: str, month: date) -> list[dict]:
    """One parameterised query: every main category with spend or carbon for this customer and month."""
    rows = db.execute(
        text("""
            SELECT CategoryId,
                   Category,
                   EstMonthlyGBP,
                   EstMonthlyCarbonKg
            FROM dbo.vw_MonthlyByMainCategory
            WHERE CustomerId = :customer_id
              AND SpendMonth = :month
        """),
        {"customer_id": customer_id, "month": month},
    ).fetchall()

    # DECIMAL columns come back as Decimal; convert once here.
    return [
        {
            "category_id": row[0],
            "category": row[1],
            "monthly_spend_gbp": float(row[2]),
            "carbon_kg": float(row[3]) if row[3] is not None else None,
        }
        for row in rows
    ]


def build_summary(db, customer_id: str, month: date) -> dict:
    """Payload for SummaryResponse. Categories are sorted by carbon, highest first."""
    rows = get_monthly_by_category(db, customer_id, month)

    # Highest carbon first, unmeasured (None) last; category id breaks ties so the output is deterministic.
    rows.sort(key=lambda row: (
        row["carbon_kg"] is None,
        -(row["carbon_kg"] or 0.0),
        row["category_id"],
    ))

    total_carbon = sum(row["carbon_kg"] for row in rows if row["carbon_kg"] is not None)
    total_spend = sum(row["monthly_spend_gbp"] for row in rows)

    return {
        "month": month,
        "total_spend_gbp": round(total_spend, 2),
        "total_carbon_kg": round(total_carbon, 2),
        "top_category": rows[0]["category"] if rows and total_carbon > 0 else None,
        "categories": [
            {
                "category_id": row["category_id"],
                "category": row["category"],
                "monthly_spend_gbp": round(row["monthly_spend_gbp"], 2),
                "carbon_kg": round(row["carbon_kg"], 2) if row["carbon_kg"] is not None else None,
                "share_pct": (
                    carbon_share(row["carbon_kg"], total_carbon) if row["carbon_kg"] is not None else None
                ),
            }
            for row in rows
        ],
    }
