# Sprint 4: Definition of Ready (DoR)

**Final MVP, security and presentation**

**Backlog**
- Sprint 3 DoR and DoD reviewed, Jira board for Sprint 4 final
- Open bugs, blockers and tech debt from Sprint 1-3 listed in Jira with an owner (e.g. `node_modules` committed to the repo, unfinished DAST/SCA items)

**End-to-end flow**
- Customer journey to test: front end → `POST /spend` → validate → store in Azure SQL → factor from `vw_EffectiveEmissionsFactors` → carbon → insights → recommendations from `RecommendationRules`
- End-to-end test data in the database (`init_db.py --with-test-data`), with expected carbon, savings and recommendations for each test customer
- SSO login with Microsoft Entra ID mapped to a customer in the `Customers` table

**Deployment**
- Where the API, front end and database run on Azure, created by Terraform
- Deployment steps in GitHub Actions, using `Dockerfile.api`, with secrets in GitHub Secrets
- Firewall rules for the pipeline and the showcase network

**Docs and showcase**
- Docs to finish (README, architecture, API, database and `data.md`, front end, infrastructure, DevSecOps, AI usage), each with an owner
- Showcase running order and who presents each part
