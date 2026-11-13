from pydantic import BaseModel, Field
from ..Schemas.Category import Itemtype
from enum import StrEnum, Enum


class SpendingItem(BaseModel):
    CustomerID: int = field(examples=[1])
    Category: Itemtype
    Week: int = field(examples=[2], description="The week number of the month")
    ItemType: str = field(default = none , description="The type of the spending category")



