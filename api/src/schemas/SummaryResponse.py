from datetime import date

from pydantic import BaseModel, Field


class CategorySummary(BaseModel, extra="forbid"):
    category_id: int
    category: str
    monthly_spend_gbp: float = Field(ge=0)
    carbon_kg: float | None = Field(ge=0, description="null when the category is not measured (e.g. Mortgage)")
    share_pct: float | None = Field(ge=0, le=100, description="Share of the month's total carbon, null when carbon_kg is null")


class SummaryResponse(BaseModel, extra="forbid"):
    month: date
    total_spend_gbp: float = Field(ge=0)
    total_carbon_kg: float = Field(ge=0)
    top_category: str | None = Field(description="Category with the highest carbon, null when there is none")
    categories: list[CategorySummary] = Field(description="Sorted by carbon, highest first")
