from pydantic import BaseModel, Field

class Itemtype(intFlag):
    Travel
    Food
    Utilities



class SpendingItem(BaseModel):
    CustomerID: int = field(examples=[1])
    Category: str = field(examples=["Travel", "Food", "Utilities"],
    descritpion = "The category of the expense",
    frozen = True,)
    Week: int = field(examples=[2], description="The week number of the month")
    ItemType: str = field(default = none , description="The type of the spending category")



