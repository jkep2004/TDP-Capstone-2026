from datetime import date

from pydantic import BaseModel, Field


class RecommendationItem(BaseModel, extra="forbid"):
    category_id: int
    category: str
    advice: str
    monthly_spend_gbp: float = Field(ge=0)
    threshold_gbp: float = Field(ge=0)
    projected_savings_gbp: float = Field(ge=0, description="Monthly spend x reduction %")
    projected_carbon_reduction_kg: float = Field(ge=0, description="Monthly carbon x reduction %")


class RecommendationsResponse(BaseModel, extra="forbid"):
    month: date
    recommendations: list[RecommendationItem]
