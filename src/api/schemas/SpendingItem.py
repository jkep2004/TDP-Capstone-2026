from pydantic import BaseModel, Field
from ..Schemas.Category import Itemtype
from enum import StrEnum, Enum


class SpendingItem(BaseModel):
    CustomerID: int = Field(gt=0)
    category: Itemtype
    amount: float = Field(ge=0)
