from datetime import date

from pydantic import BaseModel, Field


class TrendCategory(BaseModel, extra="forbid"):
    category_id: int
    category: str
    monthly_spend_gbp: float = Field(ge=0)
    carbon_kg: float = Field(ge=0)


class MonthTrend(BaseModel, extra="forbid"):
    month: date
    total_spend_gbp: float = Field(ge=0)
    total_carbon_kg: float = Field(ge=0)
    carbon_change_kg: float | None = Field(description="Change in total carbon since the previous month, null for the first month")
    carbon_change_pct: float | None = Field(description="Percentage change since the previous month, null for the first month or when it was 0")
    categories: list[TrendCategory]


class TrendsResponse(BaseModel, extra="forbid"):
    months: list[MonthTrend] = Field(description="Oldest first")
