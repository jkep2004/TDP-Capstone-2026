from datetime import date
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field
from pydantic import field_validator, model_validator

class SpendingItem(BaseModel, extra="forbid"):
    CustomerID: UUID = Field(description="The unique identifier of the customer")
    categoryID: int = Field(ge=0, description="The spending category ID")
    subcategoryID: int | None = Field(
        default=None,
        ge=0,
        description="The subcategory id of the spending category"
    )
    amount: float = Field(ge=0)
    month: date = Field(description="First day of the month of the spending entry")
    week: int = Field(gt=0, le=5, description="The week number of the month")