
import os
import jwt

from datetime import datetime, timedelta, timezone
from typing import Optional

from jwt import PyJWKClient

from fastapi import (
    Depends,
    HTTPException,
    APIRouter
)

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

TENANT_ID = os.environ["ENTRA_TENANT_ID"]

API_CLIENT_ID = os.environ["ENTRA_API_CLIENT_ID"]

APP_JWT_SECRET = os.environ["APP_JWT_SECRET"]

APP_JWT_ALGORITHM = os.getenv(
    "APP_JWT_ALGORITHM", "HS256"
)

APP_JWT_EXPIRE_MINUTES = int(
    os.getenv("APP_JWT_EXPIRE_MINUTES", "15")
)

ENTRA_ISSUER = (
    f"https://login.microsoftonline.com/"
    f"{TENANT_ID}/v2.0"
)

ENTRA_JWKS_URL = (
    f"https://login.microsoftonline.com/"
    f"{TENANT_ID}/discovery/v2.0/keys"
)

APP_JWT_ISSUER = "backend"

APP_JWT_AUDIENCE = "TDP-Carbon-API"

jwks_client = PyJWKClient(ENTRA_JWKS_URL)

security = HTTPBearer()

def validate_entra_token(token: str) -> dict:

    try:

        signing_key = jwks_client.get_signing_key_from_jwt(
            token
        )

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=API_CLIENT_ID,
            issuer=ENTRA_ISSUER,
            options={
                "require": [
                    "exp",
                    "iat",
                    "nbf",
                    "iss",
                    "aud",
                    "tid",
                    "oid"
                ]
            }
        )

        if "access_as_user" not in payload.get(
            "scp", ""
        ).split():
            raise ValueError("Missing required scope")

        return payload

    except (jwt.PyJWTError, ValueError, TypeError):

        raise HTTPException(
            status_code=401,
            detail="Invalid Microsoft Entra access token"
        )

def create_access_token(user: dict) -> tuple[str, int]:

    now = datetime.now(timezone.utc)

    expires_at = now + timedelta(
        minutes=APP_JWT_EXPIRE_MINUTES
    )

    payload = {
        "sub": user["user_id"],
        "tid": user["tenant_id"],
        "username": user.get("username"),
        "name": user.get("name"),
        "roles": user.get("roles", []),

        "iss": APP_JWT_ISSUER,
        "aud": APP_JWT_AUDIENCE,

        "iat": now,
        "nbf": now,
        "exp": expires_at,

        "type": "access"
    }

    token = jwt.encode(
        payload,
        APP_JWT_SECRET,
        algorithm=APP_JWT_ALGORITHM
    )

    return token, APP_JWT_EXPIRE_MINUTES * 60

def validate_app_token(
    credentials: HTTPAuthorizationCredentials =
        Depends(security)
):

    try:

        payload = jwt.decode(
            credentials.credentials,
            APP_JWT_SECRET,
            algorithms=[APP_JWT_ALGORITHM],
            audience=APP_JWT_AUDIENCE,
            issuer=APP_JWT_ISSUER,
            options={
                "require": [
                    "sub",
                    "tid",
                    "iat",
                    "nbf",
                    "exp",
                    "iss",
                    "aud",
                    "type"
                ]
            }
        )

        if payload.get("type") != "access":
            raise ValueError("Invalid token type")

        return payload

    except (jwt.PyJWTError, ValueError):

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired application token"
        )

def get_current_user(
    payload: dict = Depends(validate_app_token)
):

    return {
        "user_id": payload.get("sub"),
        "username": payload.get("username"),
        "name": payload.get("name"),
        "tenant_id": payload.get("tid"),
        "roles": payload.get("roles", [])
    }

def require_role(required_role: str):

    def role_checker(
        user: dict = Depends(get_current_user)
    ):

        if required_role not in user.get("roles", []):

            raise HTTPException(
                status_code=403,
                detail="Forbidden"
            )

        return user

    return role_checker
