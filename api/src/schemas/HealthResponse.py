from pydantic import BaseModel, Field

# TODO: Does this need version included?

class HealthResponse(BaseModel):
    status: str = Field(..., description="Current API status")
    version: str = Field(..., description="Current API version")
