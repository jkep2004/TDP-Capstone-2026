from fastapi import APIRouter
from ..schemas.HealthResponse import HealthResponse

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