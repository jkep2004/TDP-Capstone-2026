"""Run the real API with local SQL Server and a Playwright signing key."""

import os
from types import SimpleNamespace

import uvicorn
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.database import engine, get_db
from src.Core import auth
from src.main import app


def main():
    if engine.url.host != "127.0.0.1" or engine.url.database != "CapstoneE2E":
        raise RuntimeError("The Playwright API requires the local CapstoneE2E database.")

    key = load_pem_public_key(os.environ["E2E_ENTRA_PUBLIC_KEY"].encode())
    auth.jwks_client = SimpleNamespace(
        get_signing_key_from_jwt=lambda _token: SimpleNamespace(key=key),
    )

    # The temporary SQL Server container uses a self-signed certificate.
    test_engine = create_engine(engine.url.update_query_dict({"TrustServerCertificate": "yes"}))
    sessions = sessionmaker(bind=test_engine)

    def get_test_db():
        with sessions() as session:
            yield session

    app.dependency_overrides[get_db] = get_test_db
    uvicorn.run(app, host="127.0.0.1", port=8003)


if __name__ == "__main__":
    main()
