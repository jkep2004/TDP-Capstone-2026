
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.database import get_db
from ..schemas.CalculateRequest import CalculateRequest
from ..schemas.CalculateResponse import CalculateResponse
from ..Services.carbon import calculate_impact

router = APIRouter(prefix="/calculate")

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
    return calculate_impact(request.spending, db)
