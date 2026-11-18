# Sprint 2: Definition of Ready (DoR)

**Carbon impact and data processing**

- Sprint 1 DoR and DoD reviewed, backlog and Jira board up to date
- Database tables: categories (with sub-categories), emission factors, customer spending
- Calculation rule: carbon = monthly spend × emission factor, weekly spend × 4.3333 for monthly
- API contract for `GET /health`, `GET /categories`, `POST /spend` and `POST /carbon-impact` (fields, types, status codes, error messages)
- Validation rules: amount £0 to £100,000, category must exist, month required
- API connection to Azure SQL, with secrets kept out of the code (GitHub Secrets)
- Customers linked to Microsoft Entra ID (SSO) users
- Test cases for valid and invalid spending, with expected results
