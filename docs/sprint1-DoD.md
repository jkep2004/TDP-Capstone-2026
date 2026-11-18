# Sprint 1: Definition of Done (DoD)

**Foundations, data model, API skeleton and DevSecOps**

**Database**
- Categories, EmissionsFactors and Assumptions tables created on Azure SQL
- Emission factors include source, version and effective date
- Travel, Food and Utilities seeded with synthetic data
- T-SQL queries return the seeded data

**API**
- FastAPI app builds and starts
- `POST /calculate` accepts a valid request and returns HTTP 200 (mock response is fine)
- Basic input validation in place
- API contract documented in Swagger: request, response, status codes, validation

**Front end**
- Monthly spending screen sketched

**Infrastructure**
- Initial Terraform structure in `infra/terraform`
- No Terraform state or credentials committed

**DevSecOps**
- Build and unit tests run automatically in the pipeline
- SAST, SCA and DAST (against the running API) run
- Findings recorded, and it's clear which ones block the pipeline
- One security finding raised on purpose and fixed, as evidence
- Evidence kept: build, tests, SAST, SCA and DAST results

**Security**
- No secrets in the repo, config kept out of the code
- Synthetic data only
- Dependencies listed

**Agile**
- Backlog ready for Sprint 1, every item has an owner
- DoR and DoD written
- Work merged into `dev` through reviewed PRs, then `dev` merged into `main`
- Sprint reflection done, PO/Scrum Master sign-off recorded
- Showcase on 20 Nov
