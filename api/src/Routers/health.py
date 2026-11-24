from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..schemas.HealthResponse import HealthResponse
from ..schemas.ErrorResponse import ErrorResponse
from database.database import get_db

router = APIRouter(
    prefix="/health"
)

@router.get(
    "/",
    summary="Check all API services health",
    description="""
    Checks whether the API and all its services are running correctly.
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
            },
        },
        503: { # TODO: Add ErrorResponse model to OpenAPI spec
            "description": "Database connection failed",
            "model": ErrorResponse,
            "content": {
                "application/json": {
                    "example": {
                        "status_code": "503",
                        "detail": "Database connection failed"
                    },
                }
            },
        },
    }
)
def database_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1")) # Execute SQL query to verify connectivity

        return HealthResponse(
            status="healthy",
            version="1"
        )

    except Exception as e: # TODO: Add ErrorResponse model to OpenAPI spec
        print(f"Database connection failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Database connection failed"
        )