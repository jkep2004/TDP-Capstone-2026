from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = Field(..., description="Current API status")
    version: str = Field(..., description="Current API version")
