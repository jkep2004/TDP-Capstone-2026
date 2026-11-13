from enum import IntFlag, StrEnum, Enum

from fastapi import APIRouter

from pydantic import BaseModel, field_validator

route = APIRouter()

class Itemtype(Enum):
    Travel = 'travel'
    Food = 'food'
    Utilities = 'utilities'


# @route.get("/category")
# def get_categories(category: Itemtype):
#      return [c for c in Itemtype if c.value.lower() == category.value.lower()]