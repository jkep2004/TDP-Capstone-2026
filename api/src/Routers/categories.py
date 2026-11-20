from fastapi import APIRouter, HTTPException

from ..schemas.Category import Itemtype, get_subcategory

router = APIRouter(
    prefix="/categories"
)

@router.get(
    "/",
    summary="Get all categories",
    description="""
    Retrieves a list of all available spending categories.
    """,
    response_model=list[Itemtype],
    responses={
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": ["food", "travel", "utilities",   "shopping","housing", "other"]
                }
            }
        },
    },
)
def get_categories():
    return [c for c in Itemtype]

@router.get(
    "/{category}", 
    summary="Get subcategories for a category",
    description="""
    Retrieves a list of subcategories for the specified spending category.
    """,
    response_model=list[str]
)
def get_subcategories(category: str):

    try:
        category_enum = Itemtype(category)
    except ValueError:
        raise HTTPException(status_code=404, detail="Category not found")

    subcategories = get_subcategory(category_enum)

    if subcategories is None:
        raise HTTPException(status_code=404, detail="Category not found")

    return list(subcategories)