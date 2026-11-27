# Carbon & Savings Advisor frontend development log

## Sprint 4 · Customer experience

The React and TypeScript frontend uses Vite and groups related screens, styles, and tests by feature. The [application shell](src/app/App.tsx) provides **Overview** and **Add spending**. Shared colours, gradients, typography, and controls live in [the global stylesheet](src/styles/index.css). The final forest-green theme draws attention to the footprint and main actions. The responsive layouts support keyboard navigation and honour reduced-motion settings.

- **First visit.** Customers with no saved spending see **Start with one month**. They can open the spending form or skip to the empty Overview. Returning customers see their saved insights.
- **Manual entry.** The form loads categories and subcategories from the API. Customers choose a **Spending month** and enter at least one category or subcategory amount. Blank fields count as £0, and an explicitly entered £0 counts as an entry. The form checks the £0–£100,000 limit and two-decimal precision. It preserves draft amounts after a failed save.
- **CSV upload.** The customer can download the [weekly spending template](public/spending-template.csv), upload or drop a file, choose a group if the file contains several, and preview its rows and totals. The [parser](src/features/spending/parseSpendingCsv.ts) uses Papa Parse and validates headers, amounts, and duplicate weeks. [The upload screen](src/features/spending/CsvUpload.tsx) checks weeks 1–5 before estimating or saving. The selected month and authenticated customer determine where the rows are saved.
- **Replace a saved month.** Both entry methods ask for confirmation when that customer already has spending for the month. Choosing **Keep saved spending** keeps their draft and existing data. Choosing **Replace spending** replaces all entries for that customer and month in one transaction.
- **Overview.** A successful save opens Insights for the saved month. The Overview shows monthly spending, estimated carbon, the category breakdown, and potential savings. Customers can switch the history chart between **Carbon** and **Spend**, pick a month, and see progress towards the 3-, 6-, and 12-month milestones.
- **Guide, recap, and recommendations.** **Show me around** offers optional shortcuts. **View monthly recap** reuses the loaded summary, trends, and recommendations. It compares with the previous calendar month when both estimates exist and shows the recommendation with the highest estimated money saving when available. Recommendation flip cards reveal the advice and estimated money and carbon savings by click or keyboard.

## Current API integration

The [frontend API client](src/services/api.ts) exchanges a Microsoft Entra access token for an application token and attaches it to protected requests. The application token is held for the request flow. MSAL uses tab-scoped session storage and disables personally identifiable information in its logger. Configure the browser with public Entra application IDs and API origins. Keep database credentials and the application signing secret on the server.

| Customer action | API behaviour |
|---|---|
| Sign in | `POST /api/v1/auth/` exchanges the Entra token for an application token and returns the customer ID. |
| Load spending categories | `GET /api/v1/categories/` returns the categories and parent IDs used to build the form and map CSV columns. |
| Preview CSV carbon | `POST /api/v1/calculate/` estimates carbon for the selected weekly rows. |
| Save a month | `POST /api/v1/spend/month` creates the month. A `409` with `spending_month_exists` opens the confirmation. The app sends `PUT /api/v1/spend/month` only after confirmation. Both requests use the signed-in customer and a single selected month. |
| Load Overview and recap | `GET /api/v1/trends/?months=12` loads available history. For the selected month, the client requests `/api/v1/summary/`, `/api/v1/recommendations/`, and `/api/v1/savings/` with the month parameter. The recap uses those results. |
| Track sustainability challenges | `GET /api/v1/challenges/?month=YYYY-MM-01` returns challenges for categories above their spending thresholds. `PATCH /api/v1/challenges/{category_id}?month=YYYY-MM-01` starts or completes a challenge. `GET /api/v1/challenges/medal` returns the signed-in customer's total across months. Bronze, Silver, and Gold are awarded at one, two, and three completions. |

Carbon figures are spend-based estimates using the backend's seeded emissions factors. Recommendation rules apply when spending is strictly above a category threshold. The backend calculates potential savings from the full category total and the rule's reduction percentage. For example, £300 in Groceries with no other spending gives **152.7 kg CO₂e** and **£42 in potential savings** using the seeded figures. See the [data documentation](../docs/data.md) for the assumptions and the [seed script](../infra/database/seed.sql) for the factors and rules.

## Sprint 4 · Testing and CI evidence

- **Vitest and React Testing Library.** The frontend suite passes **56 tests across 8 files**. It covers sign-in behaviour, API-driven categories and subcategories, manual validation and retry, the CSV parser and upload preview, save confirmation, and the Overview and history chart. Frontend integration cases use controlled API responses to check requests and screen behaviour.
- **Local Vitest coverage, 27 November 2026.** The V8 report for frontend TypeScript and TSX source recorded **85.79% lines**, **84.95% statements**, **85.46% functions**, and **73.55% branches** using the coverage command below. The recap's behaviour is exercised in Playwright. Its component had no direct Vitest coverage in this run.
- **Playwright.** One Chromium journey verifies six stages against the real frontend, FastAPI, and a temporary SQL Server. It saves £100 of itemised spending and checks 50.9 kg CO₂e, opens the recap, reloads and explores a seeded recommendation, cancels a replacement, confirms a £300 replacement and verifies it after a reload, then replaces it from a CSV and verifies November's carbon figure stays the same. The test uses a synthetic Entra token and a test signing key. FastAPI still validates the token and reads and writes SQL Server. See the [browser test](e2e/spending-insights.e2e.ts) and [test configuration](playwright.config.ts).
- **GitHub Actions.** The [DevSecOps workflow](../.github/workflows/devsecops.yml) runs Vitest during **Build & Secrets Gate** and Playwright in **2b. Browser End-to-End Tests**. The E2E job starts SQL Server, seeds `CapstoneE2E`, then runs Chromium. The Sprint 4 PR's browser journey passed. Open **Checks → 2b. Browser End-to-End Tests → Test spending and insights in Chromium** for the result. The walkthrough covers the test identity and one customer's journey in Chromium. Live Entra sign-in and Azure deployment require separate verification.
- **AI use.** AI assisted with frontend refinements, test drafting, and troubleshooting. Validation included checking expected figures against the seeded rules and reviewing the passing Vitest and GitHub Actions results.

## Known limitations and follow-ups

- The backend debug endpoint `/api/user` still returns user metadata to authenticated callers. The current frontend uses the token exchange for its session. Review removal or restriction before a production release, along with backend identity logging and database error logging for data minimisation.
- The frontend uses the save outcome. The API still returns saved record IDs and checks the customer ID in the payload against the authenticated user. A production follow-up is to derive the customer solely from the authenticated request and narrow the save and token exchange responses to the fields customers' screens need.
- The summary API currently converts missing carbon estimates to zero. Preserve missing estimates in the API contract so customers can distinguish unavailable estimates from a zero estimate in the category breakdown.
- Sustainability challenges were added after Sprint 4. Frontend tests cover starting and completing challenges, switching months, and recovering after a lost save response. The existing Playwright spending and insights journey does not exercise challenges.

## Local development and verification

Start FastAPI from the repository root in a PowerShell terminal using the team's development backend settings. Swagger is available at `http://127.0.0.1:8000/docs`.

```powershell
python -m uvicorn src.main:app --app-dir api --host 127.0.0.1 --port 8000 --reload
```

In `frontend/.env.local`, use the team's development Entra application IDs and point the frontend at that API. Set `VITE_INSIGHTS_API_URL` when insights are served by a separate API. It defaults to `VITE_API_URL`.

```dotenv
VITE_API_URL=http://127.0.0.1:8000
VITE_ENTRA_CLIENT_ID=<frontend-application-id>
VITE_ENTRA_API_CLIENT_ID=<api-application-id>
```

In a second terminal, run the frontend from the repository root and open `http://localhost:5173`.

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

From `frontend/`, run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`. With the matching `@vitest/coverage-v8` provider installed, generate a local coverage report with the following command. The report is saved under `coverage/`, which Git ignores. CI currently reports pass counts in the test job logs.

```powershell
npm.cmd test -- --coverage --coverage.include="src/**/*.{ts,tsx}" --coverage.exclude="src/test/**" --coverage.exclude="src/**/*.d.ts"
```

Use the GitHub Actions E2E job for the standard database-backed run. Running `npm.cmd run test:e2e` locally also requires Chromium, the API and ODBC dependencies, and an isolated, seeded `CapstoneE2E` SQL Server with `E2E_SQL_PASSWORD` set.

## Earlier milestones

- **Sprint 2 · Sign-in and spending.** Integrated MSAL and the API token exchange. The original frontend verified the session with `GET /api/user`. Manual entry and CSV upload originally saved through `/spend/batch`, and both were verified against the local API. Relevant commit `e83ae56`.
- **Sprint 3 · Spending insights.** Integrated the signed-in customer's carbon summary, breakdown, trends, recommendations, and estimated savings. For sample customer `101`, the November backend summary matched **1,691.42 kg CO₂e**, **£145.96** in estimated savings, and **243.89 kg CO₂e** in estimated carbon savings. Relevant commits `d89ad6b` and `b047c33`.

