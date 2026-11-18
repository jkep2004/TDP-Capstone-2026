# Sprint 1: Definition of Ready (DoR)

**Foundations, data model, API skeleton and DevSecOps**

A backlog item is **ready** when the team can pick it up and finish it within the sprint without waiting on anyone. If an item doesn't meet these, it stays in the backlog until it does.

Reviewed at the start of the sprint and updated if something didn't work.

- [ ] Tech stack is agreed: Python 3.14 with FastAPI for the API, Azure SQL (T-SQL) for the database, Terraform for Azure infrastructure, GitHub Actions for the pipeline.
- [ ] The Azure resources Terraform needs to create are listed (resource group, SQL server, database, firewall rules).
- [ ] GitHub repo exists, with `main`, `dev` and `feature/*` branches, and `main`/`dev` protected.
- [ ] Minimum database entities are agreed: Categories, EmissionsFactors, Assumptions.
- [ ] The source for emission factors is agreed (with source, version and effective date).
- [ ] The request and response for `POST /calculate` are agreed, even if the response is mocked.
- [ ] Pipeline stages are agreed: build, unit tests, SAST, SCA, DAST.
- [ ] Each person has access to what they need (GitHub, Azure SQL, firewall rules for their IP).
