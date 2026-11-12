# NW TDP 2026 v2
from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel, Field
from .Routers import calculate, health


app = FastAPI(title="Nationwide TDP Carbon API", version="0.1.0")
router = APIRouter()


@app.get('/api/docs', include_in_schema=False)
def custom_swagger_ui_html():
    from fastapi.openapi.docs import get_swagger_ui_html
    return get_swagger_ui_html(openapi_url=app.openapi_url, title="API Docs")


app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(calculate.router, prefix="/api/calculate", tags=["calculate"])
