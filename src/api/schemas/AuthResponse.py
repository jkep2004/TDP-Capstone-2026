from pydantic import BaseModel

class AuthResponse(BaseModel):

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict