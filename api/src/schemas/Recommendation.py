from pydantic import BaseModel, Field

# TODO: Create a schema for the recommendation response

class Recommendation(BaseModel, extra ="forbid"):
     CustomerID: int = Field(gt=0)
     category: str = Field(min_length=1)
     subcategory: str = Field(min_length=1)
     week: int = Field(gt=0, le = 5, description="The week number of the month")
     amount: float = Field(ge=0)
