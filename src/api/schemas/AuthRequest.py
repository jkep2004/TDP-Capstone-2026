from pydantic import BaseModel, Field

class AuthRequest(BaseModel):

    entra_access_token: str = Field(
        min_length=20,
        repr=False
    )
