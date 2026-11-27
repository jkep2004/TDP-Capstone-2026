from pydantic import BaseModel, Field

# TODO: Refactor to use this in API responses for errors

class ErrorResponse(BaseModel):
    status_code: int = Field(..., description="HTTP status code of the error")
    detail: str = Field(..., description="Detailed error message")
