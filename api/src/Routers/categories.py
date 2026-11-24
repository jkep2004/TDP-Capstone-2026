from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import structlog

from ..schemas.Category import Category, create_categories_from_db
from database.database import get_db

logger = structlog.get_logger(__name__)

router = APIRouter(
    prefix="/categories"
)
logger.info("Categories router initialized with prefix /categories")

@router.get(
    "/",
    summary="Get all categories",
    description="""
    Retrieves a list of all available spending categories.
    """,
    response_model=list[Category],
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
def get_categories(db: Session = Depends(get_db)):
    logger.info("Fetching all categories from the database")
    return create_categories_from_db(db)

@router.get(
    "/{categoryId}",
    summary="Get category by ID",
    description="""
    Retrieves a specific spending category by its ID.
    """,
    response_model=Category,
    responses={
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": {"id": 1, "name": "food", "description": "Food and dining expenses", "parent_id": None, "is_carbon_tracked": True, "subcategories": []}
                }
            }
        },
        404: {
            "description": "Category not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Category not found"}
                }
            }
        },
    },
)
def get_category(categoryId: int, db: Session = Depends(get_db)):
    categories = create_categories_from_db(db)
    category = next((c for c in categories if c.id == categoryId), None)
    logger.info("Fetching category by ID", category_id=categoryId)
    if category is None:
        logger.error("ERROR: Category not found", category_id=categoryId)
        raise HTTPException(status_code=404, detail="Category not found")
    
    logger.info("Category found", category_id=categoryId, category_name=category.name)
    return category


@router.get(
    "/{categoryId}/subcategories",
    summary="Get subcategories for a category",
    description="Retrieves a list of subcategories for the specified spending category.",
    response_model=list[Category],
)
def get_subcategories(
    categoryId: int,
    db: Session = Depends(get_db),
):
    categories = create_categories_from_db(db)

    category = next(
        (c for c in categories if c.id == categoryId),
        None,
    )
    logger.info("Fetching subcategories for category", category_id=categoryId)

    if category is None:
        logger.error("ERROR: Category not found for subcategories", category_id=categoryId)
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    return [
        c for c in categories
        if c.parent_id == category.id
    ]
