from fastapi import APIRouter

from ..schemas.calculateRequest import CalculateRequest

router = APIRouter()


@router.post("")
def calculate(request: CalculateRequest):
    # Placeholder only: replace with database-backed emissions factors in Sprint 2.
    breakdown = [
        {"category": item.category, "amount": item.amount, "carbonKg": 0}
        for item in request.spending
    ]
    total_carbon_kg = sum(item["carbonKg"] for item in breakdown)

    return {
        "status": "success",
        "totalCarbonKg": total_carbon_kg,
        "breakdown": breakdown,
        "recommendations": [],
    }
