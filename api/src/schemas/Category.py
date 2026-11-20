from enum import Enum
from types import MappingProxyType
from fastapi import Depends
from sqlalchemy import text, exc as SQLAlchemyError

from database.database import get_db

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
        
    def get_category_id(self, db=Depends(get_db)):
        try:
            SQL_QUERY = f"SELECT CategoryId FROM dbo.Category WHERE CategoryName = '{self.value}'"
            result = db.execute(text(SQL_QUERY)).fetchone()
            if result is None:
                raise ValueError(f"Category '{self.value}' not found in the database")
            return result[0]
        except SQLAlchemyError as e:
            raise ValueError(f"Database error occurred while retrieving category ID: {e}")
        except Exception as e:
            raise ValueError(f"Error retrieving category ID: {e}")

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
