# Sprint 4: Definition of Done (DoD)

**Final MVP, security and presentation**

**MVP**
- A customer can log in with SSO, enter spending, and see carbon by category, trends, recommendations and savings on the deployed app
- Same numbers in the front end, the API and the SQL views for the test customers
- Known bugs fixed, or listed in the limitations section of the README

**Database**
- `schema.sql`, `seed.sql` and test data build the database from scratch on Azure through `init_db.py`
- All 19 categories, factors, assumptions and recommendation rules seeded with sources
- Data quality checks in `queries.sql` return 0
- `data.md` final: sources, ER diagram, views, calculation rules, limitations (spend-based factors, unweighted averages, 2027 factor review)

**API**
- `/health`, `/categories`, `/spend`, `/carbon-impact` and the insight and recommendation endpoints documented in Swagger
- All reads go through the SQL views, parameterised queries only
- Errors return clear messages without stack traces

**Front end**
- Spending form uses categories from `GET /categories`, nothing hardcoded
- Shows carbon summary, trends, recommendations and savings
- Input checks match the API (£0 to £100,000)

**Infrastructure**
- Azure resources created by Terraform, no manual changes left
- Terraform state and credentials not in the repo

**Testing**
- Unit, integration, API and end-to-end tests pass in GitHub Actions
- End-to-end tests check the expected results for the test customers

**DevSecOps**
- Pipeline blocks on failed tests and high or critical findings
- SAST, SCA and DAST reports saved, with at least one finding and its fix
- No secrets in the repo, database access limited to the API and the team's IPs

**Documentation**
- Architecture diagram and key technical decisions (FastAPI, Azure SQL, Terraform, GitHub Actions)
- Testing approach, security controls and pipeline
- AI usage: what each person used it for and how it was checked
- Known limitations and future improvements

**Agile**
- DoR, DoD and team responsibilities reviewed
- Jira board, backlog and dev log final, all Sprint 4 items Done
- `dev` merged into `main` through a reviewed PR
- Final showcase rehearsed, including the customer and commercial value for Nationwide
