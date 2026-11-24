from pydantic import BaseModel, Field

class CalculateBreakdownItem(BaseModel, extra="forbid"):
    category: int
    subcategory: str | None = None
    amount: float
    week: int
    carbonKg: float

class CalculateResponse(BaseModel, extra="forbid"):
    status: str = Field(
        description="The status of the calculation, e.g., 'success' or 'error'"
    )
    totalCarbonKg: float
    breakdown: list[CalculateBreakdownItem]
    recommendations: list[str]
