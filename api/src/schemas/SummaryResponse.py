from datetime import date

from pydantic import BaseModel, Field


class CategorySummary(BaseModel, extra="forbid"):
    category_id: int
    category: str
    monthly_spend_gbp: float = Field(ge=0)
    carbon_kg: float = Field(ge=0)
    share_pct: float = Field(ge=0, le=100, description="Share of the month's total carbon")


class SummaryResponse(BaseModel, extra="forbid"):
    month: date
    total_spend_gbp: float = Field(ge=0)
    total_carbon_kg: float = Field(ge=0)
    top_category: str | None = Field(description="Category with the highest carbon, null when there is none")
    categories: list[CategorySummary] = Field(description="Sorted by carbon, highest first")
