from pydantic import BaseModel, Field

from .SpendingItem import SpendingItem

class calculateRequest(BaseModel, extra="forbid"):
    spending: list[SpendingItem] = Field(min_length=1)

