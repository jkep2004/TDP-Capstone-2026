from fastapi import Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database.database import get_db

class Category (BaseModel):
    id: int
    name: str
    description: str
    parent_id: int | None
    is_carbon_tracked: bool
    
def create_categories_from_db(db: Session):
    try:
        SQL_GET = "SELECT CategoryId, Name, Description, ParentCategoryId, IsCarbonTracked FROM dbo.Categories"
        result = db.execute(text(SQL_GET)).fetchall()
        categories = []
        
        for row in result: # Create Category instances from the database rows
            category = Category(
                id=row[0],
                name=row[1],
                description=row[2],
                parent_id=row[3],
                is_carbon_tracked=row[4]
            )
            categories.append(category)
    
        return categories
    except SQLAlchemyError as e:
        raise ValueError(f"Database error occurred while creating categories: {e}")
    except Exception as e:
        raise ValueError(f"Error creating categories: {e}")