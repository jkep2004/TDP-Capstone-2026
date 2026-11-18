# Sprint 1: Definition of Done (DoD)

**Foundations, data model, API skeleton and DevSecOps**

**Database**
- Categories, EmissionsFactors and Assumptions tables created on Azure SQL
- Travel, Food and Utilities seeded with synthetic data
- T-SQL queries return the seeded data

**API**
- FastAPI app builds and starts
- `POST /calculate` accepts a valid request and returns HTTP 200 with the agreed response structure (mock is fine)
- Basic input validation in place
- Swagger docs available

**Front end**
- Monthly spending screen sketched

**Infrastructure**
- Initial Terraform structure in the repo
- No Terraform state or credentials committed

**DevSecOps**
- Pipeline runs build and unit tests
- SAST and SCA run, DAST runs against the API
- Findings recorded, and it's clear which ones block the pipeline

**Team**
- Work merged into `dev` through reviewed PRs, then `dev` merged into `main`
- No secrets in the repo, synthetic data only
- Sprint 1 items shown at the showcase on 20 Nov
