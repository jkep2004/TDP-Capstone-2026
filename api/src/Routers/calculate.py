from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import structlog

from database.database import get_db
from ..schemas.CalculateRequest import CalculateRequest
from ..schemas.CalculateResponse import CalculateResponse
from ..Services.carbon import calculate_impact

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/calculate")
logger.info("Calculate router initialized with prefix /calculate")

@router.post(
    "/",
    summary="Calculate carbon footprint",
    description="Calculates the carbon footprint based on the provided spending data.",
    response_model=CalculateResponse,
)
def calculate(
    request: CalculateRequest,
    db: Session = Depends(get_db),
):
    result = calculate_impact(request.spending, db)

    logger.info(
        "Carbon footprint calculated",
        total_carbon_kg=result["totalCarbonKg"],
        items=len(result["breakdown"]),
    )

    return result
