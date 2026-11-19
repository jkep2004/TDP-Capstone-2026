from pydantic import BaseModel, Field

class AuthRequest(BaseModel):

    token: str = Field(
        min_length=20
    )
