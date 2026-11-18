# Sprint 1: Definition of Ready (DoR)

**Foundations, data model, API skeleton and DevSecOps**


- Tech stack: Python 3.14 + FastAPI, Azure SQL (T-SQL), Terraform for Azure, GitHub Actions
- Azure resources for Terraform listed (resource group, SQL server, database, firewall rules)
- GitHub repo set up with `main`, `dev` and `feature/*` branches, `main` and `dev` protected
- Minimum database tables: Categories, EmissionsFactors, Assumptions
- Emission factor source picked, with version and effective date
- Request and response for `POST /calculate` defined (mock response is fine)
- Pipeline stages: build, unit tests, SAST, SCA, DAST
- Everyone has access to GitHub and Azure SQL, and their IP is on the firewall
