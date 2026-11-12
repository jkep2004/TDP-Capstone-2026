from fastapi import FastAPI, HTTPException, APIRouter
from ..schemas import calculateRequest
from pydantic import BaseModel, Field

router = APIRouter()

@router.post("")
def calculate():
    request = calculateRequest.calculateRequest(spending=[])
    result = calculateRequest.calculate(request)
    return result