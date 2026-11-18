
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..Core.auth import (
    validate_entra_token,
    create_access_token
)
from ..schemas.AuthRequest import AuthRequest
from ..schemas.AuthResponse import AuthResponse

router = APIRouter(
    prefix="/auth"
)


@router.post(
    "/",
    summary="Authenticate user",
    description="""
    Authenticates a user using Microsoft Entra access token and returns an application JWT.
    """, 
    response_model=AuthResponse,
    responses={
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "<JWT>",
                        "token_type": "bearer",
                        "expires_in": 3600,
                        "user": {
                            "id": "<user_id>",
                            "email": "<user_email>",
                            "name": "<user_name>",
                            "roles": ["<role1>", "<role2>"]
                        }
                    },
                }
            }
        },
        401: {
            "description": "Invalid Microsoft Entra access token",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Invalid Microsoft Entra access token"
                    },
                }
            }
        },
    },
)
def authenticate(request: AuthRequest):

    entra_user = validate_entra_token(
        request.token
    )

    user = {
        "user_id": entra_user["oid"],
        "username": entra_user.get(
            "preferred_username"
        ),
        "name": entra_user.get("name"),
        "tenant_id": entra_user["tid"],
        "roles": entra_user.get("roles", [])
    }

    access_token, expires_in = create_access_token(
        user
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "user": {
            "id": user["user_id"],
            "email": user["username"],
            "name": user["name"],
            "roles": user["roles"]
        }
    }
