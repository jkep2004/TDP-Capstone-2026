from pydantic import BaseModel, Field
from ..schemas.Category import Itemtype



class BreakdownItem(BaseModel):
    category: Itemtype
    subcategory: str | None = Field(default=None, description="The subcategory of the spending category")
    week: int = Field(gt=1, le = 5, description="The week number of the month")
    amount: float = Field(ge=0)
    carbonKg: float = Field(ge=0, description = "the amount of cabrbonkg such as kg CO2e")




