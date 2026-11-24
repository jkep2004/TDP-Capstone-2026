from datetime import date
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field
from pydantic import field_validator, model_validator

class SpendingItem(BaseModel, extra="forbid"):
    CustomerID: UUID = Field(description="The unique identifier of the customer")
    category: int = Field(gt=0, description="The spending category ID")
    subcategory: str | None = Field(
        default=None,
        description="The subcategory of the spending category"
    )
    amount: float = Field(ge=0)
    month: date = Field(description="First day of the month of the spending entry")
    week: int = Field(gt=0, le=5, description="The week number of the month")

    @field_validator("subcategory", mode="before")
    @classmethod
    def validate_subcategory(cls, raw_input: Any):
        if raw_input is None:
            return None

        if isinstance(raw_input, str):
            value = raw_input.strip().lower()
            return value or None

        raise ValueError("Subcategory must be a text string")