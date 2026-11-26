# Carbon & Savings Advisor frontend development log

## Sprint 4 · Customer experience and privacy review

- The browser uses the Microsoft Entra public application IDs and API origins. Keep database credentials and the application signing key on the server. MSAL uses tab-scoped session storage, and the application token is held only for the request flow. Frontend authentication logging excludes personally identifiable information.
- The frontend no longer reads the response containing saved record IDs. A production API follow-up is to return only the save outcome, derive the customer from the authenticated request, and remove the extra profile fields from the token exchange once callers are migrated.
- The backend debug endpoint `/api/user` still returns user metadata to authenticated callers. Review removal or restriction before a production release. Review backend identity logging and database error logging for data minimisation as part of that work.
- The summary API currently converts missing carbon factors to zero. Preserve missing estimates in the API contract so customers can distinguish unavailable estimates from a zero estimate in the category breakdown.
- Sustainability challenges were deferred by the team for Sprint 4.

## Sprint 2 · Sign-in and spending

- Microsoft sign-in uses MSAL. The frontend exchanges the Microsoft Entra access token at `POST /api/v1/auth/` for an application token, then verifies the session with `GET /api/user`.
- **Manual entry** saves whole-month category totals. **Upload CSV** previews weekly records before saving. Both flows use `POST /api/v1/spend/batch`. Each batch is saved together, and duplicate records produce a message identifying the conflicting period.
- The CSV preview can also request an estimate from `POST /api/v1/calculate/`.
- Both entry modes were verified against the local API with real saves. Spending ID `504` is evidence from the earlier single-entry test.

Relevant commit `e83ae56` · Save spending from manual entry and CSV upload.

## Sprint 3 · Spending insights

- **Insights** shows the signed-in customer's monthly carbon summary, category breakdown, trends, recommendations, and estimated money and carbon savings. The frontend calls the authenticated `/api/v1/summary/`, `/api/v1/trends/`, `/api/v1/recommendations/`, and `/api/v1/savings/` endpoints.
- The signed-in screen was verified with live data `feature/api-carbon-insights` backend. For sample customer `101`, the November backend summary matched the expected **1,691.42 kg CO₂e**, **£145.96** in estimated savings, and **243.89 kg CO₂e** in estimated carbon savings.

Relevant commits `d89ad6b` · Insights integration and `b047c33` · Health button removal.

## Local development

Run the frontend from this directory using `npm ci` and `npm run dev`. Open `http://localhost:5173`. Use your team's Microsoft Entra development settings and configure the API origins in a private `.env.local` file.

```dotenv
VITE_API_URL=http://127.0.0.1:8000
VITE_INSIGHTS_API_URL=http://127.0.0.1:8003
```

Frontend verification commands are `npm run lint`, `npm run build`, and `npm test`. All 16 tests passed on the restored branch.

