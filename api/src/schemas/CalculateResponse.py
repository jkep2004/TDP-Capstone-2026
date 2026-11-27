from pydantic import BaseModel, Field

class CalculateBreakdownItem(BaseModel, extra="forbid"):
    category: int
    subcategory: int | None = None
    amount: float
    week: int
    carbonKg: float | None = Field(description="null when the category has no emission factor (not measured)")

class CalculateResponse(BaseModel, extra="forbid"):
    status: str = Field(
        description="The status of the calculation, e.g., 'success' or 'error'"
    )
    totalCarbonKg: float
    breakdown: list[CalculateBreakdownItem]
    recommendations: list[str]
