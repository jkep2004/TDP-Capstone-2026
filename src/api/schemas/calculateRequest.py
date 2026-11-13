from pydantic import BaseModel, Field

from .SpendingItem import SpendingItem

class CalculateRequest(BaseModel):
    spending: list[SpendingItem] = Field(min_length=1)

