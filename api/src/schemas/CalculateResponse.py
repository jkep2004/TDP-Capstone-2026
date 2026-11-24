from .BreakdownItem  import BreakdownItem
from .Recommendation import Recommendation
from  pydantic import BaseModel, Field
from typing import Literal


class CalculateResponse(BaseModel, extra = "forbid"):
    status: Literal["success"] = "success"
    totalCarbonKg: float = Field(ge=0)
    breakdown:      list[BreakdownItem]
    recommendations: list[Recommendation]
