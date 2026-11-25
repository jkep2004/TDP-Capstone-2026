from datetime import date

from pydantic import BaseModel, Field


class SavingsItem(BaseModel, extra="forbid"):
    category_id: int
    category: str
    savings_gbp: float = Field(ge=0)
    carbon_reduction_kg: float = Field(ge=0)


class SavingsResponse(BaseModel, extra="forbid"):
    month: date
    total_savings_gbp: float = Field(ge=0)
    total_carbon_reduction_kg: float = Field(ge=0)
    breakdown: list[SavingsItem]
