from enum import IntFlag, StrEnum, Enum

from fastapi import APIRouter

from pydantic import BaseModel, field_validator

route = APIRouter()

class Itemtype(Enum):
    Travel = 'Travel'
    Food = 'Food'
    Utilities = 'Utilities'


@field_validator("category")
def validate_lowercase(category):
    if not category.value.islower():
        category = Itemtype(category.value.lower())
    return category


@route.get("/categories")
def get_categories(category: Itemtype):
    return [c for c in Itemtype if c.value.lower() == category.lower()]