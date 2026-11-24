
from fastapi import APIRouter, Depends, HTTPException
import jwt
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..Core.auth import (
    validate_entra_token,
    create_access_token
)
from ..schemas.AuthRequest import AuthRequest
from ..schemas.AuthResponse import AuthResponse
from database.database import get_db

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
                        "access_token": "<JWT>", # nosec B105
                        "token_type": "bearer", # nosec B105
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
def authenticate(
    request: AuthRequest,
    db: Session = Depends(get_db)
):

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
    
    try:
        SQL_EXISTS = f"SELECT COUNT(*) FROM Customers WHERE CustomerId = '{user['user_id']}'"
        result = db.execute(text(SQL_EXISTS)).fetchone()
        if result[0] == 0:
            dataSource = "ENTRA"
            SQL_INSERT = f"INSERT INTO Customers (CustomerId, DataSource) VALUES ('{user['user_id']}', '{dataSource}')"
            db.execute(text(SQL_INSERT))
            db.commit()
            
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=500,
            detail="Database error: {}".format(str(e))
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Database connection error: {}".format(str(e))
        )

    return {
        "access_token": access_token,
        "token_type": "bearer", # nosec B105
        "expires_in": expires_in,
        "user": {
            "id": user["user_id"],
            "email": user["username"],
            "name": user["name"],
            "roles": user["roles"]
        }
    }
