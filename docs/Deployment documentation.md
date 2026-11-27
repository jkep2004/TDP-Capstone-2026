# Infrastructure & Deployment Documentation

## 1. Overview

This document provides the end-to-end deployment guide for **TDP-Capstone-2026**, covering local containerized orchestration with **Docker Compose**, cloud infrastructure provisioning with **Terraform**, automated container delivery via **GitHub Actions & GHCR**, and runtime hosting on **Azure Container Apps**.

### Environment Architecture Comparison

| Component | Local Environment (Docker Compose) | Cloud Environment (Azure `dev`) |
| :--- | :--- | :--- |
| **Orchestration** | Docker Compose (`infra/docker/docker-compose.yml`) | Azure Container Apps (`cae-tdp2026-carbon-team3-dev`) |
| **Frontend Hosting** | Nginx container (`tdp_frontend`, `http://localhost:5173`) | Azure Container App (`ca-tdp2026-carbon-team3-web-dev`) |
| **Backend API** | FastAPI + Uvicorn container (`tdp_backend`, `http://localhost:8000`) | Azure Container App (`ca-tdp2026-carbon-team3-api-dev`) |
| **Database** | SQL Server 2022 container (`tdp_sql_server`, port `1433`) | Azure SQL Database (`sql-tdp2026-carbon-team3-dev` / `CarbonFootprintDB`) |
| **Secrets Storage** | Local `.env` files (excluded via `.gitignore`) | Azure Key Vault (`kv-tdp2026-carbon-t3-dev`, RBAC-enabled) & GitHub Secrets |
| **ODBC TLS Policy** | `DB_TRUST_SERVER_CERTIFICATE=yes` (self-signed container cert) | `DB_TRUST_SERVER_CERTIFICATE=no` (strict TLS verification default) |
| **Identity Provider** | Microsoft Entra ID (OAuth2 / JWT) | Microsoft Entra ID (OAuth2 / JWT) |

```text
[ Local Development ]
  Browser (:5173) ──► tdp_frontend (Nginx) ──► tdp_backend (FastAPI :8000) ──► tdp_sql_server (SQL 2022 :1433)

[ Azure Cloud Deployment ]
  GitHub Push ──► DevSecOps Pipeline ──► GHCR (Immutable SHA Images)
                                                │
                                                ▼
  Browser (HTTPS) ──► ca-...-web-dev ──► ca-...-api-dev ──► Azure SQL (CarbonFootprintDB)
                                                │
                                                └──► Azure Key Vault (kv-tdp2026-carbon-t3-dev)
```

---

## 2. Containerization Specification

### 2.1 Backend Container (`Dockerfile.api`)
- **Base Image**: `python:3.14-slim`
- **System Dependencies**: Installs `curl`, `ca-certificates`, `gnupg`, `unixodbc-dev`, and Microsoft's Debian package repository for **ODBC Driver 18 for SQL Server (`msodbcsql18`)** with `ACCEPT_EULA=Y`.
- **Application Build**: Installs runtime Python packages from `api/requirements.txt` (`--no-cache-dir`), copies `api/` into `/app`, and prepares `/app/static`.
- **Runtime**: Exposes port `8000` and launches FastAPI via `python -m uvicorn src.main:app --host 0.0.0.0 --port 8000`.

### 2.2 Frontend Container (`frontend/Dockerfile`)
- **Multi-Stage Build**:
  1. **Build Stage (`node:22-alpine`)**: Copies `package*.json`, installs dependencies (`npm install`), accepts Vite build-time variables (`VITE_API_URL`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_CLIENT_ID`) via `ARG`/`ENV`, and compiles static assets with `npm run build` into `/app/dist`.
  2. **Serve Stage (`nginx:alpine`)**: Clears default Nginx assets, copies compiled `/app/dist` to `/usr/share/nginx/html`, exposes port `80`, and runs `nginx -g "daemon off;"`.
- **Important Note on Vite Variables**: Because Vite injects `VITE_*` variables at **build time** rather than container startup, changing API URLs or Entra ID client IDs requires rebuilding the frontend image with updated `--build-arg` values.

### 2.3 Local Stack Orchestration (`infra/docker/docker-compose.yml`)
Defines three services sharing an isolated Docker bridge network and one named volume (`mssql_data`):
- **`sqlserver` (`tdp_sql_server`)**: Runs `mcr.microsoft.com/mssql/server:2022-latest` on `1433:1433`, persists data to `mssql_data:/var/opt/mssql`, and executes a `sqlcmd` health check every 10 seconds (`start_period: 20s`, `retries: 10`).
- **`backend` (`tdp_backend`)**: Builds `Dockerfile.api` from repository root (`context: ../..`), maps `8000:8000`, and waits for `sqlserver` to reach `condition: service_healthy`. Overrides `DB_SERVER: "sqlserver"`, `DB_ADMIN_USER: "sa"`, and defaults `DB_TRUST_SERVER_CERTIFICATE` to `yes`.
- **`frontend` (`tdp_frontend`)**: Builds `../../frontend` with `VITE_*` build arguments, maps `5173:80`, and starts after `backend`.

---

## 3. Prerequisites & Identity Setup

### Local Tools
- **Docker Desktop** (with Docker Compose v2)
- **Python 3.11+** (with `pyodbc` and ODBC Driver 18 if running `init_db.py` from the host)
- **Node.js 22+** (optional, for running the Vite dev server locally outside Docker)
- **Azure CLI (`az`)** & **Terraform** (required for cloud infrastructure provisioning)

### Microsoft Entra ID App Registrations (One-Time Setup)
Authentication requires two Entra ID configurations (or a unified app registration with exposed API scopes):
1. **Frontend (SPA)**:
   - Platform: Single-page application (SPA)
   - Redirect URIs: `http://localhost:5173` (local) and `https://ca-tdp2026-carbon-team3-web-dev.<env-domain>` (Azure)
   - Supported Account Types: Configured according to team tenant access requirements
2. **Backend (API)**:
   - Expose an API with Application ID URI (`api://<ENTRA_API_CLIENT_ID>`) and define the delegated scope required by the frontend
   - Grant frontend API permission to call the backend scope

---

## 4. Local Deployment Guide (Docker Compose)

### Step 1: Configure Local Environment Variables
Create `infra/docker/.env` (never commit this file to Git):

```env
# SQL Server Container & Backend DB Credentials
MSSQL_SA_PASSWORD=<StrongLocalPassword!>
DB_NAME=CarbonFootprintDB
DB_ADMIN_USER=sa
DB_ADMIN_PASSWORD=<StrongLocalPassword!>
DB_TRUST_SERVER_CERTIFICATE=yes

# Microsoft Entra ID & App JWT
ENTRA_TENANT_ID=<your-entra-tenant-id>
ENTRA_API_CLIENT_ID=<your-backend-client-id>
APP_JWT_SECRET=<your-local-jwt-secret>

# Frontend Build Arguments
VITE_API_URL=http://localhost:8000
VITE_ENTRA_CLIENT_ID=<your-frontend-client-id>
VITE_ENTRA_API_CLIENT_ID=<your-backend-client-id>
```

> **Note**: `MSSQL_SA_PASSWORD` and `DB_ADMIN_PASSWORD` must match identically so `tdp_backend` can authenticate to `tdp_sql_server` as `sa`.

### Step 2: Build and Start the Local Stack
From the `infra/docker` directory:

```bash
cd infra/docker
docker compose up -d --build
```

Verify that all containers are running and SQL Server is healthy:

```bash
docker ps
```

Expected state: `tdp_sql_server` (`healthy`), `tdp_backend` (`Up`), and `tdp_frontend` (`Up`).

### Step 3: Initialize and Seed the Local Database
When starting with a fresh `mssql_data` volume, initialize the schema and seed categories/test records from the repository root:

```bash
cd ../..
# Ensure root .env (or shell env vars) points to 127.0.0.1, user 'sa', and DB_TRUST_SERVER_CERTIFICATE=yes
python infra/database/init_db.py --with-test-data
```

### Step 4: Verify Local Endpoints
- **Frontend UI**: `http://localhost:5173`
- **Backend Swagger Docs**: `http://127.0.0.1:8000/docs`
- **Database Health Check**: `http://127.0.0.1:8000/api/v1/health/database`
- **Categories API**: `http://127.0.0.1:8000/api/v1/categories/`

> **Hybrid Local Development (Optional)**: If actively editing frontend code with hot reload, run only SQL Server and Backend in Docker (`docker compose up -d sqlserver backend`), configure `frontend/.env.local`, and run `npm run dev` inside `frontend/`. Do not run `tdp_frontend` simultaneously as both bind to port `5173`.

---

## 5. Cloud Deployment Guide (Azure)

### 5.1 Provision Cloud Infrastructure with Terraform
Cloud infrastructure is defined in `infra/terraform` and deployed to Azure (`uksouth`):
- Resource Group (`rg-tdp26-carbon-team3-dev`)
- Azure SQL Logical Server (`sql-tdp2026-carbon-team3-dev`) & Database (`CarbonFootprintDB`)
- Azure Key Vault (`kv-tdp2026-carbon-t3-dev`, RBAC authorization enabled)
- Azure Container Apps Environment (`cae-tdp2026-carbon-team3-dev`)
- Backend & Frontend Container Apps (`ca-tdp2026-carbon-team3-api-dev`, `ca-tdp2026-carbon-team3-web-dev`)

To provision or update infrastructure:

```bash
az login
cd infra/terraform

# Copy example variable file and populate non-secret values (never commit terraform.tfvars)
cp terraform.tfvars.example terraform.tfvars

# Supply sensitive variables via environment variables (TF_VAR_*)
terraform init
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

### 5.2 Bootstrap Azure SQL Database
1. Temporarily allow your operator IP in the Azure SQL Server firewall (or run from an authorized network).
2. Point database environment variables to Azure SQL (`DB_SERVER=<server>.database.windows.net`, `DB_ADMIN_USER=sqladminuser`, `DB_TRUST_SERVER_CERTIFICATE=no`).
3. Run the initialization script:

```bash
python infra/database/init_db.py --with-test-data
```

### 5.3 Automated Application Deployment (CI/CD)
Production/dev application releases are fully automated via `.github/workflows/devsecops.yml` on pushes to `main`, `dev`, or `fix/azure_workflow_fix`:
1. **Quality & Security Gates**: Executes Secrets Gate, Vitest, Pytest (with ephemeral Azure SQL firewall rule), Playwright E2E (against a temporary SQL Server container), Bandit SAST, `pip-audit`/`npm audit` SCA, and FastAPI DAST (`set -o pipefail`).
2. **Image Build & Publish**: Builds `Dockerfile.api` and `frontend/Dockerfile` via Docker Buildx and pushes immutable commit-SHA images (`ghcr.io/<owner>/tdp-capstone-2026-<backend|frontend>:<github.sha>`) plus branch tags (`:latest` / `:unstable`) to GHCR.
3. **Azure Container Apps Rollout**: Updates `ca-tdp2026-carbon-team3-api-dev` and `ca-tdp2026-carbon-team3-web-dev` to the new immutable SHA image tags via `az containerapp update`.
4. **Post-Deploy Smoke Test**: Verifies live connectivity by polling `https://ca-tdp2026-carbon-team3-api-dev.blackground-28a725c3.uksouth.azurecontainerapps.io/api/v1/health/database` with retries.

For full pipeline stage details and required GitHub Secrets, refer to [`docs/devsecops-pipeline.md`](./devsecops-pipeline.md).

---

## 6. Automated Dependency Maintenance (Dependabot)

`.github/dependabot.yml` automates weekly security and version update pull requests (capped at 10 open PRs per ecosystem) across the entire infrastructure and application stack:

| Package Ecosystem | Target Directory | Scope Covered |
| :--- | :--- | :--- |
| `github-actions` | `/` | CI/CD workflow actions in `.github/workflows/` |
| `npm` | `/frontend` | React, Vite, MSAL, Vitest, Playwright dependencies |
| `pip` | `/api` | FastAPI, SQLAlchemy, PyODBC, Uvicorn, Pytest dependencies |
| `docker` | `/` | Backend base image (`python:3.14-slim` in `Dockerfile.api`) |
| `docker` | `/frontend` | Frontend base images (`node:22-alpine`, `nginx:alpine`) |
| `terraform` | `/infra/terraform` | Terraform AzureRM providers and modules |

---

## 7. Rollback, Teardown & Troubleshooting

### Rollback Procedure (Azure Container Apps)
Every cloud release is pinned to an immutable Git commit SHA tag in GHCR. To roll back to a previous verified commit:

```bash
az containerapp update \
  --name ca-tdp2026-carbon-team3-api-dev \
  --resource-group <AZURE_RESOURCE_GROUP> \
  --image ghcr.io/<owner>/tdp-capstone-2026-backend:<previous-good-sha>

az containerapp update \
  --name ca-tdp2026-carbon-team3-web-dev \
  --resource-group <AZURE_RESOURCE_GROUP> \
  --image ghcr.io/<owner>/tdp-capstone-2026-frontend:<previous-good-sha>
```

Alternatively, reactivate the previous healthy revision directly under **Azure Portal → Container App → Revision management**.

### Local Teardown

```bash
cd infra/docker
# Stop and remove containers (preserves SQL data volume)
docker compose down

# Stop containers AND wipe local SQL Server volume (full reset)
docker compose down -v
```

### Common Troubleshooting

| Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| `Login failed for user 'sqladminuser'` locally | Backend container using Azure SQL username instead of local SQL Server `sa` account. | Ensure `DB_ADMIN_USER: "sa"` in `docker-compose.yml` and align `DB_ADMIN_PASSWORD` with `MSSQL_SA_PASSWORD`. |
| `certificate verify failed: self-signed certificate` locally | ODBC Driver 18 rejects self-signed SQL container certs when `TrustServerCertificate=no`. | Verify `DB_TRUST_SERVER_CERTIFICATE=yes` is active inside `tdp_backend` (`docker exec tdp_backend printenv DB_TRUST_SERVER_CERTIFICATE`). Keep `"no"` for Azure SQL. |
| `Login failed for user 'sa'` after changing password | Existing `mssql_data` Docker volume retains the previous SA password. | Run `docker compose down -v` in `infra/docker`, restart containers, and re-run `init_db.py --with-test-data`. |
| `AADSTS900144` / `client_id=undefined` on login | Frontend image built without `VITE_ENTRA_CLIENT_ID` build argument. | Pass `VITE_*` build args in `docker-compose.yml` or GitHub Actions `build-args`, then rebuild the frontend image (`--build`). |
| `400 Disallowed CORS origin` in browser | Frontend origin missing or malformed in FastAPI `allow_origins`. | Verify exact frontend scheme and hostname in `api/src/main.py` CORS middleware. |
| Port `5173` already allocated | Both local Vite (`npm run dev`) and `tdp_frontend` container trying to bind port `5173`. | Stop one of the two before starting the other. |