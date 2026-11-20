from fastapi import APIRouter

from ..schemas.calculateRequest import CalculateRequest

router = APIRouter(
    prefix="/calculate"
)

@router.post(
    "/",
    summary="Calculate carbon footprint",
    description="""
    Calculates the carbon footprint based on the provided spending data.
    """,
    response_model=calculateResponse,
    responses={
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "totalCarbonKg": 0,
                        "breakdown": [
                            {"category": "food",   "subcategory": "eating out", "amount": 100, "week": 1,   "carbonKg": 0},
                            {"category": "travel", "subcategory": "flights", "amount": 200, "week": 1, "carbonKg": 0}
                        ],
                        "recommendations": []
                    },
                }
            }
        },
    },
)

def calculate(request: CalculateRequest):
    # TODO: replace with database-backed emissions factors in Sprint 2.
    breakdown = [
        {"category": item.category, "subcategory": item.subcategory, "amount": item.amount, "week": item.week,"carbonKg": 0}
        for item in request.spending
    ]
    total_carbon_kg = sum(item["carbonKg"] for item in breakdown)

    return {
        "status": "success",
        "totalCarbonKg": total_carbon_kg,
        "breakdown": breakdown,
        "recommendations": [],
    }
