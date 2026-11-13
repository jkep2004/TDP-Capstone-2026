from pydantic import BaseModel, Field
from ..Schemas.Category import Itemtype
from pydantic import field_validator


class SpendingItem(BaseModel, extra="forbid"):
    CustomerID: int = Field(gt=0)
    category: Itemtype
    amount: float = Field(ge=0)
    week: int = Field(gt=0)
    
    
    @field_validator("category", mode="before")
    @classmethod
    def validate_lowercase(cls, RawInput: Itemtype):
        if isinstance(RawInput, str):
            RawInput = RawInput.lower()
            return RawInput
        raise ValueError("Category must be a text string")

    
    