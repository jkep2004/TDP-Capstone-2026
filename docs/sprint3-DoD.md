# Sprint 3: Definition of Done (DoD)

**Customer insights and recommendations**

**Database**
- Views for monthly carbon by category, top categories and month-on-month change
- Recommendation rules, thresholds and reduction % stored in the database with their sources
- Multi-month synthetic test data loaded, quality checks pass
- `data.md` updated with the new views and rules

**API**
- Endpoints return the carbon summary, carbon by category, trends, recommendations and savings
- Recommendations come from the rules in `RecommendationRules`, not hardcoded in the API
- Each recommendation shows both the money saved and the carbon saved
- Inputs validated, missing or incomplete data handled without errors

**Front end**
- Customer can see their summary, category breakdown, trends and recommendations

**Testing**
- Tests cover carbon summaries, category calculations, trends, recommendation logic, invalid or incomplete data, API responses and database integration
- Tests run in CI/CD and pass

**DevSecOps**
- Customer data handled securely, API only returns that customer's data
- Dependencies scanned, secrets kept in GitHub Secrets
- SAST and SCA done, DAST done where practical, findings fixed

**Agile**
- DoR, DoD and team roles reviewed
- Backlog, Jira board and dev log up to date
- Test data for each insight and recommendation, with expected results
