# Sprint 2: Definition of Done (DoD)

**Carbon impact and data processing**

**Database**
- Spending categories and sub-categories in Azure SQL
- Emission factors for every carbon-tracked category, with source, version and effective date
- Customer spending table with synthetic data
- Data validation and quality checks in T-SQL pass (no negative or missing amounts, no duplicates, no missing factors)
- Units and calculation rules documented in `data.md` (weekly × 4.3333 to monthly, carbon = monthly spend × factor)

**API**
- `GET /health`, `GET /categories`, `POST /spend` and `POST /carbon-impact` work as documented
- Carbon calculated from the factors in the database, same input always gives the same result
- Inputs validated, errors don't expose technical details

**Front end**
- Customer can enter spending and see their carbon-impact result

**Testing**
- Tests cover valid and invalid spending, category validation, factor lookup, carbon calculations, API responses and database integration
- Tests run in CI/CD and pass

**DevSecOps**
- Secure input validation and parameterised queries (no SQL injection)
- Database access limited and credentials kept in GitHub Secrets
- Dependencies scanned, security findings reviewed and fixed
- SAST and SCA done, DAST done where practical

**Agile**
- DoR, DoD and team roles reviewed
- Backlog, Jira board and dev log up to date
- Test data for valid and invalid spending, with expected results
