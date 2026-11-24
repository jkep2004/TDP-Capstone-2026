"""Recommendations and projected savings for GET /recommendations and GET /savings (Python 3.11).

Rules live in dbo.RecommendationRules (not hard-coded here). Spend and carbon per
main category come from dbo.vw_MonthlyByMainCategory, which already rolls
sub-categories up and converts weekly data to a monthly figure.

    ProjectedSavings = MonthlySpend x ReductionPercentage
    CarbonReduction  = MonthlyCarbon x ReductionPercentage
"""
from datetime import date

from sqlalchemy import text


def projected_reduction(amount: float, reduction_percentage: float) -> float:
    """Amount x reduction %, rounded to 2 decimal places (used for both money and carbon)."""
    return round(amount * reduction_percentage, 2)


def get_over_threshold_categories(db, customer_id: str, month: date) -> list[dict]:
    """Main categories where this customer's monthly spend is above the rule's threshold.

    One parameterised query. INNER JOIN means categories with no rule (Housing, Other)
    never appear. Decimal values are converted to float once, here.
    """
    rows = db.execute(
        text("""
            SELECT m.CategoryId,
                   m.Category,
                   m.EstMonthlyGBP,
                   m.EstMonthlyCarbonKg,
                   r.MonthlyThresholdGBP,
                   r.RecommendationText,
                   r.ReductionPercentage
            FROM dbo.vw_MonthlyByMainCategory m
            JOIN dbo.RecommendationRules r ON r.CategoryId = m.CategoryId
            WHERE m.CustomerId = :customer_id
              AND m.SpendMonth = :month
              AND m.EstMonthlyGBP > r.MonthlyThresholdGBP
            ORDER BY m.CategoryId
        """),
        {"customer_id": customer_id, "month": month},
    ).fetchall()

    return [
        {
            "category_id": row[0],
            "category": row[1],
            "monthly_spend_gbp": float(row[2]),
            "monthly_carbon_kg": float(row[3]) if row[3] is not None else 0.0,
            "threshold_gbp": float(row[4]),
            "advice": row[5],
            "reduction_percentage": float(row[6]),
        }
        for row in rows
    ]


def build_recommendations(db, customer_id: str, month: date) -> dict:
    """Payload for RecommendationsResponse."""
    items = get_over_threshold_categories(db, customer_id, month)

    return {
        "month": month,
        "recommendations": [
            {
                "category_id": item["category_id"],
                "category": item["category"],
                "advice": item["advice"],
                "monthly_spend_gbp": item["monthly_spend_gbp"],
                "threshold_gbp": item["threshold_gbp"],
                "projected_savings_gbp": projected_reduction(
                    item["monthly_spend_gbp"], item["reduction_percentage"]
                ),
                "projected_carbon_reduction_kg": projected_reduction(
                    item["monthly_carbon_kg"], item["reduction_percentage"]
                ),
            }
            for item in items
        ],
    }


def build_savings(db, customer_id: str, month: date) -> dict:
    """Payload for SavingsResponse: the same rows as recommendations, plus totals."""
    items = get_over_threshold_categories(db, customer_id, month)

    breakdown = [
        {
            "category_id": item["category_id"],
            "category": item["category"],
            "savings_gbp": projected_reduction(
                item["monthly_spend_gbp"], item["reduction_percentage"]
            ),
            "carbon_reduction_kg": projected_reduction(
                item["monthly_carbon_kg"], item["reduction_percentage"]
            ),
        }
        for item in items
    ]

    return {
        "month": month,
        "total_savings_gbp": round(sum(row["savings_gbp"] for row in breakdown), 2),
        "total_carbon_reduction_kg": round(
            sum(row["carbon_reduction_kg"] for row in breakdown), 2
        ),
        "breakdown": breakdown,
    }
