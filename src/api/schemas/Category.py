from enum import StrEnum, Enum


class Itemtype(Enum):
    Travel    = 'travel'
    Food      = 'food'
    Utilities = 'utilities'
    Shopping  = 'shopping'
    Housing   = 'housing'
    Other     = 'other'

   # TODO: implementation for subcategories are being done via relational database parent and foreign key relationships. 
   # This is a placeholder for future implementation if it is neccessary to have a subcategory enum.



# TODO: Implement a route to get all categories
# @route.get("/category")
# def get_categories(category: Itemtype):
#      return [c for c in Itemtype if c.value.lower() == category.value.lower()]