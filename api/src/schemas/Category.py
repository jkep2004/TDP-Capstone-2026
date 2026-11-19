from enum import Enum
from types import MappingProxyType

class Itemtype(Enum):
    Travel    = 'travel'
    Food      = 'food'
    Utilities = 'utilities'
    Shopping  = 'shopping'
    Housing   = 'housing'
    Other     = 'other'

   # TODO: implementation for subcategories are being done via relational database parent and foreign key relationships. 
   # This is a placeholder for future implementation if it is neccessary to have a subcategory enum.


Subcategories_by_type = MappingProxyType({  
    Itemtype.Food:      ("groceries", "eating out"),
    Itemtype.Travel:    ("fuel", "public transport", "flights"),
    Itemtype.Utilities: ("electricity","gas", "water"),
    Itemtype.Shopping:  ("clothing", "electronics", "furniture and appliances"),
    Itemtype.Housing:   ("rent", "mortgage"),
    Itemtype.Other:     ()}
    )


def get_subcategory(key):
    return Subcategories_by_type.get(key)