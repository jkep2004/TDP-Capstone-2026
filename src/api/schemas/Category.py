from enum import Enum
from types import MappingProxyType

class Itemtype(Enum):
    Travel    = 'travel'
    Food      = 'food'
    Utilities = 'utilities'
    Shopping  = 'shopping'
    Housing   = 'housing'
    Other     = 'other'

    def allowed_subcategory(self, subcategory):
        if subcategory in Subcategories_by_type[self]:
                return True
        else:
            return False

Subcategories_by_type = MappingProxyType({  
    Itemtype.Food:      ("groceries", "eating out"),
    Itemtype.Travel:    ("fuel", "public transport", "flights"),
    Itemtype.Utilities: ("electricity","gas", "water"),
    Itemtype.Shopping:  ("clothing", "electronics", "furniture and appliances"),
    Itemtype.Housing:   ("rent", "mortgage"),
    Itemtype.Other:     ()}
    )




# TODO: Implement a route to get all categories
# @route.get("/category")
# def get_categories(category: Itemtype):
#      return [c for c in Itemtype if c.value.lower() == category.value.lower()]








