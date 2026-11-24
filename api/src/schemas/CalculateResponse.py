from pydantic import BaseModel, Field

from .SpendingItem import SpendingItem

class CalculateResponse(BaseModel, extra="forbid"):
    status: str = Field(description="The status of the calculation, e.g., 'success' or 'error'")
    totalCarbonKg: float
    breakdown: list[SpendingItem]
    recommendations: list[str]
