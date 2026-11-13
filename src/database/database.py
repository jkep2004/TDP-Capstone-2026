import os
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker

load_dotenv()

# SQLAlchemy rejects None in the query dict, so only include the driver when
# DB_DRIVER is set. Without it the app can still start (e.g. in CI) and the
# failure shows up when a connection is actually attempted.
query = {
    "Encrypt": "yes",
    "TrustServerCertificate": "no",
}
driver = os.getenv("DB_DRIVER")
if driver:
    query["driver"] = driver

connection_url = URL.create(
    "mssql+pyodbc",
    username=os.getenv("DB_ADMIN_USER"),
    password=os.getenv("DB_ADMIN_PASSWORD"),
    host=os.getenv("DB_SERVER"),
    port=1433,
    database=os.getenv("DB_NAME"),
    query=query,
)

engine = create_engine(
    connection_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
