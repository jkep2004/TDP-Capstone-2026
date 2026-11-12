class CalculateRequest(BaseModel):
    spending: list[SpendingItem] = Field(min_length=1)

@router.get("")
def health():
    return {"status": "healthy"}