# NW TDP 2026 v2
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from .Routers import calculate, health

tags_metadata = [
    {
        "name": "Health",
        "description": """
        Provides information about API availability,
        service status and system health.
        """,
    },
    {
        "name": "Calculate",
        "description": """
        Provides carbon footprint calculations.
        """,
    },
]

app = FastAPI(
    title="Nationwide TDP Carbon API", 
    version="1",
    description="""
    Customer sustainability product that analyses spending behaviour, calculates carbon impact, and provides practical recommendations to help customers reduce both carbon emissions and costs.
    """,
    contact={
        "name": "Nationwide TDP 2026"
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=tags_metadata,
)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get(
    "/favicon.ico",
    include_in_schema=False
)
async def favicon():
    raise FileResponse("static/img/favicon.ico")

router = APIRouter()
app.include_router(health.router, prefix="/v1/health", tags=["Health"])
app.include_router(calculate.router, prefix="/v1/calculate", tags=["Calculate"])
