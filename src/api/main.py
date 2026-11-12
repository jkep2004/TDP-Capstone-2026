# NW TDP 2026 v2
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="Nationwide TDP Carbon API", 
    description="API for calculating carbon emissions based on spending data",
    version="0.1.0"
)

class SpendingItem(BaseModel):
    category: str = Field(min_length=1)
    amount: float = Field(ge=0)

class CalculateRequest(BaseModel):
    spending: list[SpendingItem] = Field(min_length=1)

@app.get("/v1/health")
def health():
    return {"status": "healthy"}

@app.get("/v1/docs")
def docs():
    return {"message": "API documentation is available at /v1/docs"}

@app.post("/v1/calculate")
def calculate(request: CalculateRequest):
    # Placeholder only: replace with database-backed emissions factors in Sprint 2.
    breakdown = [
        {"category": item.category, "amount": item.amount, "carbonKg": 0}
        for item in request.spending
    ]
    return {
        "status": "success",
        "totalCarbonKg": 0,
        "breakdown": breakdown,
        "recommendations": [],
    }
