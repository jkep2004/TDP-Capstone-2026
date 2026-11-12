from pydantic import BaseModel, Field


class calculateRequest(BaseModel):
    spending: list[SpendingItem] = Field(..., min_items=1)
   