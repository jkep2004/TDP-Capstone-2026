from pydantic import BaseModel, Field, model_validator, field_validator

from .SpendingItem import SpendingItem

class CalculateRequest(BaseModel, extra="forbid"):
    spending: list[SpendingItem] = Field(min_length=1)







    @model_validator(mode = "after")
    def Duplicate_spending_item_check(self):
        Seen_keys = set()
        expected_month = self.spending[0].month
        expected_customerID = self.spending[0].customerID
        for item in self.spending:
            key = (item.categoryID, item.subcategoryID, item.week)
            if key in Seen_keys:
                 raise  ValueError("Duplicate Spending Item")   
            if item.month != expected_month:
                raise ValueError("The month must be the same for each entry")        
            if item.customerID != expected_customerID:
                raise ValueError("The customer IDs aren't the same")
            Seen_keys.add(key)
        return self
                

            



