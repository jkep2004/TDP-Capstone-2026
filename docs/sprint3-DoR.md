# Sprint 3: Definition of Ready (DoR)

**Customer insights and recommendations**

- Sprint 2 DoR and DoD reviewed, backlog and Jira board up to date
- Insights to show: total carbon, carbon by main category (Travel, Food, Utilities, Shopping, Housing, Other), top categories, change month to month
- Recommendation rules in `RecommendationRules`: one per main category with a threshold, advice text and reduction % (Travel £300 / 14%, Food £250 / 14%, Utilities £150 / 19%, Shopping £250 / 16%)
- How savings are worked out: monthly spend × reduction %, and the same for carbon
- Sub-category spend rolled up to its main category before checking thresholds
- Test data covering at least three months for each test customer, so trends can be shown
- API contract for the new endpoints (summary, trends, recommendations, savings), reading from the SQL views
- Test cases for summaries, trends, recommendations and incomplete data, with expected results
