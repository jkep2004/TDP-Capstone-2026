from fastapi import APIRouter

from ..schemas.CalculateRequest import CalculateRequest

router = APIRouter()

@router.post(
    "/",
    summary="Calculate carbon footprint",
    description="""
    Calculates the carbon footprint based on the provided spending data.
    """,
    # response_model=CalculateResponse,
    responses={
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "totalCarbonKg": 0,
                        "breakdown": [
                            {"category": "food", "amount": 100, "carbonKg": 0},
                            {"category": "travel", "amount": 200, "carbonKg": 0}
                        ],
                        "recommendations": []
                    },
                }
            }
        },
    },
)
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
