from fastapi import APIRouter

from ..schemas.Category import Itemtype, get_subcategory

router = APIRouter("/categories", tags=["Categories"])

@router.get(
    ""
)
def get_categories():
    return [c for c in Itemtype]

@router.get(
    "/{category}",
)
def get_subcategories(category: Itemtype):
    subcategories = get_subcategory(category)
    return subcategories