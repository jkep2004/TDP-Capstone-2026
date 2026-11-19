# Sprint 3: Definition of Done (DoD)

**Customer insights and recommendations**

**Database**
- `vw_MonthlyByMainCategory` gives monthly spend and carbon per customer and main category
- New views for top categories and month-on-month change
- Thresholds and reduction % in `Assumptions` and `RecommendationRules`, with sources (Appendix A, Appendix B, ONS)
- Multi-month test data loaded through `init_db.py`, quality checks in `queries.sql` return 0
- `data.md` updated with the new views and rules

**API**
- Endpoints return the carbon summary, carbon by category, trends, recommendations and savings for one customer
- Recommendations come from `RecommendationRules`, not hardcoded in the API
- Each recommendation shows both the money saved and the carbon saved
- Categories that aren't carbon-tracked (Mortgage) are shown with no carbon, not 0 or an error
- Missing months or incomplete data handled without errors

**Front end**
- Customer can see their summary, category breakdown, trends and recommendations

**Testing**
- Tests check results against the expected values for the test customers (e.g. customer 1 Travel: £426.11, 1182.33 kg, £59.66 saved)
- Tests cover trends, recommendation logic, invalid or incomplete data, API responses and database integration
- Tests run in GitHub Actions and pass

**DevSecOps**
- API only returns the logged-in customer's data
- Dependencies scanned, secrets kept in GitHub Secrets
- SAST and SCA done, DAST done where practical, findings fixed

**Agile**
- DoR, DoD and team roles reviewed
- Backlog, Jira board and dev log up to date
- Test data for each insight and recommendation, with expected results
