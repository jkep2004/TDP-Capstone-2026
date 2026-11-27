# Security Findings, Controls & Remediation Evidence

## 1. Remediated Security Findings (Evidence Log)

| ID | Category | Finding | Remediation Applied | Verification / Gate |
| :--- | :--- | :--- | :--- | :--- |
| SEC-01 | SAST / Secure Coding | Bandit flagged `B608` (potential SQL injection via string formatting) in `api/src/Routers/auth.py`. | Refactored query construction to parameterized queries. | Bandit SAST job passes cleanly in GitHub Actions. |
| SEC-02 | SCA / Dependencies | `pip-audit` detected known CVEs in `starlette` and `pytest`. | Upgraded `starlette` to `0.41.3` and `pytest` to `8.3.4`. | `pip-audit` SCA gate passes with zero unresolved findings. |
| SEC-03 | Transport Security | ODBC Driver 18 certificate validation needed differentiation between local Docker SQL Server (self-signed cert) and Azure SQL. | Made `TrustServerCertificate` configurable via `DB_TRUST_SERVER_CERTIFICATE` in `database.py`, defaulting strictly to `"no"` for Azure SQL and only enabling `"yes"` in local `docker-compose.yml`. | Verified local Docker connection and strict TLS enforcement on Azure SQL. |
| SEC-04 | Access Control / CORS | Missing comma in `allow_origins` (`main.py`) caused implicit string concatenation, breaking explicit origin allowlisting. | Fixed explicit origin allowlist without falling back to wildcard `*`. | Verified cross-origin requests from Azure Container Apps frontend. |
| SEC-05 | Secrets Management | Risk of committing local credentials or hardcoding DB/JWT secrets. | Excluded `.env` / `.env.local` via `.gitignore`, added Secrets Gate in CI, and stored cloud secrets in Azure Key Vault with RBAC enabled. | Secrets check passes in CI; Key Vault provisioned via Terraform. |
| SEC-06 | Automated Testing Gate | Playwright E2E test failed due to non-exact locator matching two status messages. | Tightened assertion to `{ exact: true }` in `frontend/e2e/spending-insights.e2e.ts`. | Browser E2E job passes end-to-end against seeded temporary SQL Server. |

## 2. Active DevSecOps Pipeline Controls

- **Build & Secrets Gate**: Validates repository hygiene and prevents credential leakage before downstream jobs run.
- **Test & Quality Gates**: Runs backend `pytest` unit tests and Playwright browser E2E tests against an isolated temporary SQL Server instance.
- **SAST**: `Bandit` static analysis on Python backend source code.
- **SCA & Continuous Governance**: `pip-audit` (Python) and `npm audit` (Frontend), paired with weekly `.github/dependabot.yml` automated dependency PRs.
- **DAST**: Dynamic endpoint validation against the running API with `pipefail` enabled so failures enforce the security gate.
- **Deploy & Smoke Tests**: Builds immutable container images to GHCR, deploys to Azure Container Apps, and executes a post-deployment database health smoke test (`/api/v1/health/database`).

## 3. Tracked Backlog & Staged Hardening (`feat/security-hardening`)

The following items have been audited and drafted on a separate branch to avoid introducing breaking infrastructure changes immediately prior to release:
- **Frontend Moderate CVEs**: 9 moderate `npm audit` advisories identified; scheduled for lockfile upgrade before raising the CI failure threshold to `moderate`.
- **Database Least-Privilege Account**: Migrate runtime API from Azure SQL admin user to a scoped application user (`db_datareader` / `db_datawriter`) backed by Key Vault secret rotation.
- **Infrastructure Hardening**: Transition Terraform state to remote Azure Storage backend, adopt GitHub OIDC federated credentials for Azure login, and enforce non-root container users.