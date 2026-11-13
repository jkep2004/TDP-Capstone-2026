from pydantic import BaseModel, Field

class SpendingItem(BaseModel):
    CustomerID: int = Field(gt=0)
    category: str = Field(min_length=1)
    amount: float = Field(ge=0)
