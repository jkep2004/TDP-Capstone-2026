# DevSecOps CI/CD Pipeline Documentation

## 1. Overview

This document describes the automated DevSecOps CI/CD pipeline for **TDP-Capstone-2026**, implemented in `.github/workflows/devsecops.yml` and supported by `.github/dependabot.yml`.

The pipeline enforces **shift-left security**, automated functional and browser verification, and gated cloud deployment to **Azure Container Apps**. Every code change must pass secrets checks, unit/E2E tests, SAST, SCA, and DAST gates before container images are built or released.

### Triggers & Access Control
- **Automated triggers**: `push` and `pull_request` targeting `main`, `dev`, and `fix/azure_workflow_fix`.
- **Manual trigger**: `workflow_dispatch` for controlled re-runs and verification.
- **Least-privilege token permissions**: Top-level `GITHUB_TOKEN` is restricted to `contents: read`. Only the `publish-docker` job elevates to `packages: write` to push images to GitHub Container Registry (GHCR).
- **PR isolation**: Pull requests execute all quality, security, and Docker build validations without pushing images or modifying Azure environments (`push` and `deploy` steps are gated by `github.event_name == 'push'`).

---

## 2. Pipeline Architecture & Execution Flow

To balance fast developer feedback with strict release gating, testing and security analysis jobs run **in parallel** immediately after `build`, and all gates converge before image publication and Azure deployment.

```text
                      ┌──► 2. Unit & Functional Tests (pytest + Azure SQL) ──┐
                      ├──► 2b. Browser E2E Tests (Playwright + Docker SQL) ──┼──► 6. Build & Publish Docker Images (GHCR)
1. Build & Secrets ───┤                                                      │              │
   (Syntax + Vitest)  ├──► 3. SAST (Bandit) ─────────────────────────────────┼──► 5. DAST ──┘
                      └──► 4. SCA (pip-audit + npm audit) ───────────────────┘     (API Runtime Checks)
                                                                                            │
                                                                                            ▼
                                                                           7. Deploy to Azure Container Apps
                                                                              + Post-Deploy Smoke Test
```

---

## 3. Stage-by-Stage Breakdown

| Stage / Job ID | Trigger Condition | Purpose & Key Actions | Failure / Gate Policy |
| :--- | :--- | :--- | :--- |
| **1. Build & Secrets Gate** (`build`) | All triggers | Checks out full Git history (`fetch-depth: 0`); blocks tracked `.env*` or `.tfstate*` files; compiles Python backend (`py_compile`); builds Vite frontend (`npm run build`) and runs frontend unit tests (`npm test` / Vitest). | Fails immediately on tracked secret/state files, syntax/build errors, or failed Vitest specs. |
| **2. Unit & Functional Tests** (`test`) | `needs: build` | Installs ODBC Driver 18 and Python dev dependencies; logs into Azure and creates a scoped, run-specific Azure SQL firewall rule for the runner IP; runs `pytest` with JUnit XML reporting; removes the temporary firewall rule (`if: always()`). | Blocks downstream DAST and publishing if backend tests fail. Firewall cleanup always executes. |
| **2b. Browser End-to-End Tests** (`e2e`) | `needs: build` | Runs on `ubuntu-24.04` (15 min timeout). Spins up an isolated local SQL Server 2022 container (`CapstoneE2E`) with an ephemeral, masked random SA password; seeds schema/test data via `infra/database/init_db.py --with-test-data`; installs frontend with `npm ci` and Playwright Chromium; executes `npm run test:e2e`. | Blocks image publishing if end-to-end user flows (spending submission & carbon insights rendering) fail. |
| **3. SAST (Bandit)** (`sast`) | `needs: build` | Runs Bandit static analysis across `api` (excluding `api/tests`), generating a full JSON evidence report before enforcing severity thresholds. | Blocks pipeline on **Medium and High** severity findings (`-ll`). |
| **4. SCA (Dependency Audit)** (`sca`) | `needs: build` | Audits Python runtime and dev dependencies (`pip-audit` on `api/requirements.txt` and `api/requirements-dev.txt`) and frontend packages (`npm audit --audit-level=high`). | Blocks pipeline on unresolved Python CVEs or **High/Critical** npm vulnerabilities. |
| **5. DAST (API Dynamic Security)** (`dast`) | `needs: [test, sast, sca]` | Starts the FastAPI application locally (`uvicorn` on `127.0.0.1:8000`) and executes automated `httpx` security probes against `POST /api/v1/calculate` (malformed fields, SQL injection payloads, empty payloads). Enforces `set -o pipefail` so `tee` cannot mask test failures. | Blocks pipeline if endpoints return unexpected status codes (outside `400/401/403/422`) or leak stack traces (`Traceback`) or database driver internals (`pyodbc`). |
| **6. Build & Publish Docker Images** (`publish-docker`) | `needs: [build, test, e2e, sast, sca, dast]` | Builds `Dockerfile.api` and `frontend/Dockerfile` using Docker Buildx with GitHub Actions layer caching. Tags images with immutable commit SHA (`:<github.sha>`) plus branch environment tag (`:latest` on `main`, `:unstable` on other branches). Injects `VITE_*` frontend build args. | Only pushes to GHCR on `push` events after all six preceding quality and security gates pass. |
| **7. Deploy to Azure Container Apps** (`deploy`) | `needs: publish-docker` (`push` only) | Authenticates with Azure and updates `ca-tdp2026-carbon-team3-api-dev` and `ca-tdp2026-carbon-team3-web-dev` using the exact immutable SHA image digests produced in Stage 6. Runs a post-deployment smoke test with retries against `/api/v1/health/database`. | Fails deployment job if Container App revision update or live database health check fails. |

---

## 4. Security Controls Mapping

| DevSecOps Focus Area | Implementation in Pipeline & Infrastructure |
| :--- | :--- |
| **Secrets Management** | `.env` / `.tfstate` commit blocker in Stage 1; sensitive values stored in GitHub Actions Secrets and Azure Key Vault (RBAC-enabled); ephemeral E2E SQL passwords generated via `openssl rand` and masked with `::add-mask::`. |
| **Secure Coding & SAST** | Automated `Bandit` scanning on every commit blocking Medium/High issues (e.g., parameterized SQL queries enforced after resolving B608). |
| **Dependency Security & SCA** | Automated `pip-audit` and `npm audit` gates on every pipeline run, complemented by weekly `.github/dependabot.yml` update PRs across `pip`, `npm`, and `github-actions`. |
| **Security Testing (DAST & E2E)** | Runtime injection/malformed-input probing and error-leakage assertions against live FastAPI (`dast`), plus isolated Chromium browser verification against a seeded database (`e2e`). |
| **Access Control** | Scoped `GITHUB_TOKEN` permissions; Microsoft Entra ID OAuth2/JWT authentication; explicit CORS origin allowlisting (`main.py`); dynamic, short-lived Azure SQL runner firewall rules with guaranteed cleanup; strict ODBC TLS (`TrustServerCertificate=no` default for Azure SQL). |
| **Automated Quality & Security Gates** | Hard job-dependency graph (`needs`) ensures neither GHCR publishing nor Azure deployment can execute if any test, SAST, SCA, or DAST check fails. |
| **Evidence & Traceability** | All test and security jobs upload versioned artifacts (`if: always()`) for auditing, and deployments pin immutable `${{ github.sha }}` container tags. |

---

## 5. Evidence Artifacts & Audit Trail

Every pipeline execution retains downloadable artifacts under the GitHub Actions run summary (uploaded with `if: always()` so failures remain auditable):

| Artifact Name | Produced By | Contents |
| :--- | :--- | :--- |
| `2-unit-test-report` | `test` | `pytest-report.xml` (JUnit test results) |
| `3-sast-bandit-report` | `sast` | `bandit-report.json` (Full static analysis report) |
| `4-sca-dependency-reports` | `sca` | `pip-audit-app.json`, `pip-audit-dev.json`, `npm-audit-report.json` |
| `5-dast-security-report` | `dast` | `dast-report.txt` (probe results) and `api-server.log` (runtime logs) |

For the complete log of discovered vulnerabilities and applied remediations (including Bandit `B608`, `starlette`/`pytest` CVE upgrades, CORS allowlist fix, and TLS enforcement), see [`docs/security-hardening.md`](./security-hardening.md).

---

## 6. Required GitHub Repository Secrets

| Category | Secret Name | Usage |
| :--- | :--- | :--- |
| **Azure Cloud** | `AZURE_CREDENTIAL` | Service Principal credentials for `azure/login@v2` |
| **Azure Cloud** | `AZURE_RESOURCE_GROUP` | Target resource group for Azure SQL firewall and Container Apps deployment |
| **Azure Cloud** | `AZURE_SQL_SERVER_NAME` | Azure SQL logical server name for temporary CI firewall rules |
| **Database** | `DB_SERVER`, `DB_NAME` | Target SQL Server hostname and database (`CarbonFootprintDB`) |
| **Database** | `DB_ADMIN_USER`, `DB_ADMIN_PASSWORD` | Database credentials used in CI tests and DAST |
| **Authentication** | `ENTRA_TENANT_ID`, `ENTRA_API_CLIENT_ID` | Microsoft Entra ID tenant and backend API application ID |
| **Authentication** | `APP_JWT_SECRET`, `APP_JWT_ALGORITHM`, `APP_JWT_EXPIRE_MINUTES` | Backend application JWT signing configuration |
| **Frontend Build** | `VITE_API_URL`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_CLIENT_ID` | Build-time Vite variables baked into the frontend container image |

> **Note**: `GITHUB_TOKEN` is automatically provisioned by GitHub Actions for GHCR authentication and does not need to be manually configured.

---

## 7. Operational Runbook & Troubleshooting

- **Re-running a failed deployment**: Trigger the pipeline manually via **Actions → DevSecOps CI/CD Pipeline → Run workflow**, or re-run failed jobs directly from the run view.
- **Rolling back an Azure Container App**: Because every deployment pushes an immutable `ghcr.io/<owner>/tdp-capstone-2026-<backend|frontend>:<commit-sha>` tag, roll back by pointing `az containerapp update --image` to the previous known-good SHA tag (or reactivating the prior revision in Azure Portal).
- **Common CI failure checks**:
  - *Unit Test (`test`) connection timeout*: Verify `AZURE_CREDENTIAL` validity and confirm `Close Azure SQL Firewall` cleaned up stale rules.
  - *E2E (`e2e`) failure*: Inspect Playwright locator output; ensure seeded test data in `init_db.py` aligns with `frontend/e2e/spending-insights.e2e.ts`.
  - *Smoke Test failure*: Confirm `ca-tdp2026-carbon-team3-api-dev` revision reached `Running` state and check Container App console logs for missing environment variables or Key Vault access issues.

---

## 8. Planned Hardening Roadmap (`feat/security-hardening`)

The following enhancements have been audited and staged on a separate branch for the next release cycle to avoid introducing breaking infrastructure changes during active release windows:
1. **Least-Privilege Database Identity**: Transition runtime API connectivity from SQL admin credentials to a dedicated application database user (`db_datareader` / `db_datawriter`) backed by Azure Key Vault rotation.
2. **Tightened Frontend SCA Threshold**: Remediate the 9 tracked `moderate` npm advisories and lower the `npm audit` blocking threshold from `high` to `moderate`.
3. **Expanded Supply-Chain & Container Scanning**: Add Gitleaks full-history secret scanning, Trivy container image scanning prior to GHCR push, and pinned GitHub Action commit SHAs.
4. **Cloud Auth & IaC Governance**: Migrate `azure/login` from static credentials to GitHub OIDC federated credentials, adopt a remote Azure Storage Terraform state backend, and enforce non-root container execution.