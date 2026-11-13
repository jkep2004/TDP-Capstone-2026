import os
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker

load_dotenv()

connection_url = URL.create(
    "mssql+pyodbc",
    username=os.getenv("DB_ADMIN_USER"),
    password=os.getenv("DB_ADMIN_PASSWORD"),
    host=os.getenv("DB_SERVER"),
    port=1433,
    database=os.getenv("DB_NAME"),
    query={
        "driver": os.getenv("DB_DRIVER"),
        "Encrypt": "yes",
        "TrustServerCertificate": "no",
    },
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
