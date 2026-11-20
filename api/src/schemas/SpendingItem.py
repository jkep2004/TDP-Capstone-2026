from pydantic import BaseModel, Field
from ..schemas.Category import Itemtype
from pydantic import field_validator, model_validator

class SpendingItem(BaseModel, extra="forbid"):
    CustomerID: int = Field(gt=0)
    category: Itemtype
    subcategory: str | None = Field(default=None, description="The subcategory of the spending category")
    amount: float = Field(ge=0)
    week: int = Field(gt=0, le = 5, description="The week number of the month")

    
    
    @field_validator("category", mode="before")
    @classmethod
    def validate_lowercase(cls, RawInput: Itemtype):
        if isinstance(RawInput, str):
            RawInput = RawInput.lower()
            return RawInput
        raise ValueError("Category must be a text string")


    @field_validator("subcategory", mode="before")
    @classmethod
    def validate_subcategory(cls, RawInput: str):
        if RawInput is None:
            return None
        if isinstance(RawInput, str):
            raw_input = RawInput.strip()
            raw_input = raw_input.lower()
            if raw_input == "":
                return None
            return raw_input
        raise ValueError("Subcategory must be a text string")
    
    @model_validator(mode = 'after')
    def category_to_subcategory(self):
        if self.subcategory is None:
            return self
        if self.category.allowed_subcategory(self.subcategory) == False:
            raise ValueError("Subcategory must be one of the valid subcategories for this category")
        return self
