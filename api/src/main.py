# NW TDP 2026 v2
from fastapi import Depends, FastAPI, APIRouter
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from .Routers import auth, calculate, categories, health, spend
from .Core.auth import get_current_user

BASE_DIR = Path(__file__).resolve().parent.parent

STATIC_DIR = BASE_DIR / "static"

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
    {
        "name": "Categories",
        "description": """
        Provides spending categories and subcategories.
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8000",
        # "https://frontend-domain.com" # TODO: Replace with frontend domain in production (And add to AZURE Entra app registration)
        # "https://backend-domain.com" # TODO: Replace with backend domain in production (And add to AZURE Entra app registration)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(STATIC_DIR / "img" / "favicon.ico")

api_version = "v1"
prefix = f"/api/{api_version}"

router = APIRouter()
app.include_router(auth.router, prefix=prefix, tags=["Authentication"])
app.include_router(calculate.router, prefix=prefix, tags=["Calculate"])
app.include_router(categories.router, prefix=prefix, tags=["Categories"])
app.include_router(health.router, prefix=prefix, tags=["Health"])
app.include_router(spend.router, prefix=prefix, tags=["Spending"])

@app.get("/api/user") # DEBUG
def user_endpoint(
    user=Depends(get_current_user)
):
    return {
        "message": "Authenticated API endpoint",
        "user": user
    }