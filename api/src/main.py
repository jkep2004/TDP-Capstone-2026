# NW TDP 2026 v2
from fastapi import Depends, FastAPI, APIRouter
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import structlog

from .Core.logging import configure_logging
configure_logging("ERROR") # TODO: Change to INFO or DEBUG in dev for more detailed logs

from .Routers import auth, calculate, categories, health, recommendations, savings, spend, summary, trends
from .Core.auth import get_current_user
from .Core.config import check_env_variables
from .Middleware.logging import RequestLoggingMiddleware

BASE_DIR = Path(__file__).resolve().parent.parent

STATIC_DIR = BASE_DIR / "static"

logger = structlog.get_logger(__name__)
logger.info("Starting API application", base_dir=str(BASE_DIR), static_dir=str(STATIC_DIR))

logger.info("Checking required environment variables")

try:
    check_env_variables()  # Check that all required environment variables are set
except ValueError as e:
    logger.error(f"ERROR: {str(e)}")
    raise SystemExit(1)  # Exit the application if environment variables are missing
else:
    logger.info("All required environment variables are set.")

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
        "name": "Trends",
        "description": """
        Provides month-by-month spend and carbon trends for the signed-in customer.
        """,
    },
    {
        "name": "Summary",
        "description": """
        Provides the monthly carbon summary for the signed-in customer.
        """,
    },
    {
        "name": "Recommendations",
        "description": """
        Provides spending recommendations for the signed-in customer.
        """,
    },
    {
        "name": "Savings",
        "description": """
        Provides projected money and carbon savings for the signed-in customer.
        """,
    },
    {
        "name": "Categories",
        "description": """
        Provides spending categories and subcategories.
        """,
    },
    {
        "name": "Authentication",
        "description": """
        Provides authentication and authorization services.
        """,
    },
    {
        "name": "Spending",
        "description": """
        Provides spending data management services.
        """,
    }
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
        "http://localhost:5173", # Frontend dev server
        "http://localhost:8000", # Backend dev server
        "https://ca-tdp2026-carbon-team3-web-dev.blackground-28a725c3.uksouth.azurecontainerapps.io", # TODO: Add to AZURE Entra app registration
        "https://ca-tdp2026-carbon-team3-api-dev.blackground-28a725c3.uksouth.azurecontainerapps.io" # TODO: Add to AZURE Entra app registration
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
logger.info("CORS middleware configured with allowed origins")
app.add_middleware(RequestLoggingMiddleware)

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)
logger.info("Static files mounted at /static")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(STATIC_DIR / "img" / "favicon.ico")

api_version = "v1"
prefix = f"/api/{api_version}"
logger.info(f"API version set to {api_version} with prefix {prefix}")

router = APIRouter()
app.include_router(auth.router, prefix=prefix, tags=["Authentication"])
app.include_router(calculate.router, prefix=prefix, tags=["Calculate"])
app.include_router(categories.router, prefix=prefix, tags=["Categories"])
app.include_router(health.router, prefix=prefix, tags=["Health"])
app.include_router(spend.router, prefix=prefix, tags=["Spending"])
app.include_router(recommendations.router, prefix=prefix, tags=["Recommendations"])
app.include_router(savings.router, prefix=prefix, tags=["Savings"])
app.include_router(summary.router, prefix=prefix, tags=["Summary"])
app.include_router(trends.router, prefix=prefix, tags=["Trends"])

@app.get("/api/user") # DEBUG
def user_endpoint(
    user=Depends(get_current_user)
):
    return {
        "message": "Authenticated API endpoint",
        "user": user
    }