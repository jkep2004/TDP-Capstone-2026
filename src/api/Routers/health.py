from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..schemas.HealthResponse import HealthResponse
from database.database import get_db

router = APIRouter()

@router.get(
    "/",
    summary="Check API health",
    description="""
    Checks whether the API is running correctly.
    """,
    response_model=HealthResponse,
    responses={
        200: {
            "description": "API is healthy",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "version": "1"
                    },
                }
            }
        },
    }
)
def health():
    return HealthResponse(
        status="healthy",
        version="1"
    )
    
@router.get(
    "/database",
    summary="Check database connection",
    description="""
    Checks whether the API can connect to the database.
    """,
    response_model=HealthResponse,
    responses={
        200: {
            "description": "Database connection is healthy",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "version": "1"
                    },
                }
            }
        },
        500: {
            "description": "Database connection failed",
            "content": {
                "application/json": {
                    "example": {
                        "status": "unhealthy",
                        "version": "1"
                    },
                }
            }
        },
    }
)
def database_health(db: Session = Depends(get_db)):
    try:
        # Execute a lightweight SQL query to verify connectivity
        db.execute(text("SELECT 1"))

        return HealthResponse(
            status="healthy",
            version="1"
        )

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed"
        )