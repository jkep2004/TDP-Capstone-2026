# Data Documentation

Owner: Data Engineer (Yihong Wang)
Related tickets: SCRUM-12, SCRUM-13, SCRUM-14

## 1. Data sources

| Data | Source | Notes |
|---|---|---|
| Customer spending (test data) | QA starter repo `qatrainer/Nationwide-TDP-2026-v2/test-data`, copied to `src/test-data` | **v1** (`sample_customer_spending.csv`, customers 1-3 x 3 weeks) is loaded for testing by `test_spending.sql`. **v2** and **v3** (adds customer 4, Heathrow commuter) are kept out of the database to test the upload endpoints |
| Spending thresholds | Appendix A - Recommended UK Spending Personas | Monthly: Travel £300, Food £250, Utilities £150 |
| Recommendation logic and examples | Appendix B - Recommendation Engine Examples | Rule-based; savings and carbon formulas |
| Emission factors | **UK Government (Defra / University of Leeds), "UK and England's carbon footprint to 2023" - Spend-based emissions multipliers**, sheet `COICOP_multipliers_2023` (published 30 June 2026, Open Government Licence 3.0) | kgCO2e per £, **including VAT**. COICOP is the household-spending classification, so it fits customer spending |

No real customer data is used. All data is synthetic or test data.

## 2. Tables (`database/schema.sql`)

| Table | Purpose |
|---|---|
| `Categories` | Spending categories: Travel, Food, Utilities |
| `EmissionsFactors` | kgCO2e per £ for each category, with **Source, Version, EffectiveDate** |
| `Assumptions` | Documented calculation rules (thresholds, weeks per month, reduction %) |
| `Customers` | Test customers (IDs 1-4) |
| `Spending` | One row per customer, category, month and week. `SpendMonth` = month the user selects; `WeekNumber` = week 1-5 for CSV uploads, empty (NULL) for a manual whole-month total |
| `RecommendationRules` | Monthly threshold, recommendation text and reduction % per category |
| `vw_EstimatedMonthlySpend` (view) | Monthly spend per customer, category and month: the manual total if entered, otherwise weekly average x 4.33 |

## 3. How the data is used (SCRUM-13)

**Spending data** = how much a customer spends in each category per week.

**Emission factor** = how many kg of CO2e are produced for each £1 spent in a category.

Core formulas (Appendix B):

```
CarbonImpact     = SpendAmount x EmissionFactor
ProjectedSavings = SpendAmount x ReductionPercentage
Recommendation   = IF MonthlySpend > Threshold THEN show advice
```

Example: customer 4 travel, estimated £3,140/month x 2.7747 = about 8,713 kgCO2e.

### Emission factors and category mapping

Our app has 3 broad categories, but the official data is more detailed, so each category is mapped to official COICOP rows:

| Category | Official row(s) used | kgCO2e per £ |
|---|---|---|
| Travel | 7.2.2 Fuels and lubricants for personal transport equipment | 2.7747 |
| Food | 11.1.1 Restaurants, cafes and the like | 0.6797 |
| Utilities | Average of 4.5.1 Electricity (1.0317) and 4.5.2 Gas (3.0773) | 2.0545 |

Why: travel recommendations focus on car journeys (fuel); food recommendations focus on takeaways and eating out; utilities recommendations focus on heating and electricity use.

Limitations: spend-based multipliers are national averages, so results are estimates. A category that mixes items (e.g. food = groceries + takeaways) is simplified to one row. The official file lists alternatives if the team wants a different mapping (e.g. 7.3.1_2 Passenger transport by railway and road = 1.9424; grocery rows 1.1.1-1.1.9 = 0.12-2.36).

### Savings percentages

`ProjectedSavings = SpendAmount x ReductionPercentage`. The brief gives the formula but not the percentage, so each category's % is the average of its two Appendix B examples: Travel 14%, Food 14%, Utilities 19%. Stored in `Assumptions` and `RecommendationRules`, so they can be changed.

### Weekly vs monthly (team decision, 13 Nov)

- The test data is **weekly** (week 1-3, no dates), but the thresholds and the brief ("submit monthly spending") are **monthly**.
- In the app the user first **selects a month** (defaults to the current month, can be changed), then either:
  - **enters a monthly total manually** -> one row per category, `WeekNumber` empty (NULL), or
  - **uploads a CSV of weekly spending** -> one row per week and category, `WeekNumber` 1-5.
- Both are saved against the selected month (`SpendMonth`, stored as the 1st of the month), so no start date has to be assumed.
- The view works out the monthly figure:

```
MonthlySpend = manual monthly total, if the user entered one
             = average weekly spend x 4.33 otherwise   (52 weeks / 12 months)
```

- Adding up 3 weeks would undercount a month (e.g. £295 instead of about £426), so the weekly average x 4.33 is used instead.
- 4.33 is stored in the `Assumptions` table as `WeeksPerMonth`, so the rule is documented and can be changed.
- The month is required: spending without a month cannot be compared to the monthly thresholds or shown on the progress page.

## 4. Data quality (SCRUM-14)

| Dimension | Check | How it is enforced |
|---|---|---|
| **Completeness** | No missing amounts or months; flags months with fewer than 3 weeks | `NOT NULL` constraints; check query in `queries.sql` |
| **Uniqueness** | No duplicate customer + category + month + week (only one manual total per month) | `UNIQUE` constraint on `Spending` |
| **Validity** | Amounts are not negative; week is 1-5; month is the 1st of a month; every category has an emission factor | `CHECK` constraints; foreign keys; check queries |
| **Consistency** | Units match (weekly data vs monthly thresholds); a month should not have both a manual total and weekly rows | Conversion documented in `Assumptions`; check query in `queries.sql` |

### Issues found in the test data

1. **Header comment line** - the CSV starts with `# NW TDP 2026 v2`, so it must be skipped when loading (e.g. `pd.read_csv(path, comment='#')`).
2. **Version label mismatch** - the file is named v3 but the comment says v2.
3. **Unit mismatch** - spending is weekly, thresholds are monthly (handled above).
4. **Outlier** - customer 4 travel is £675-780 per week, far above other customers. Kept, not deleted: it is the intended high-travel test case (Heathrow). Flagged by the outlier query in `queries.sql`.
5. **Small sample** - only 3 weeks per customer, so monthly figures are estimates.
6. **No dates** - the CSV only has week numbers. In the app the user selects the month; for testing, `test_spending.sql` lets you choose the month.

### Security

- Synthetic/test data only; no real customer information.
- Database connection string stored in `.env` (not committed); `.env` is in `.gitignore`.
- The API must use **parameterised queries** (SQLAlchemy) to prevent SQL injection.

## 5. How to run

Connection details go in your local `.env` (never commit it). Then run, in order, from `infra/database/`:

1. `schema.sql` - creates the tables and the view (drops existing tables first, so tell the team before running).
2. `seed.sql` - reference data (categories, emission factors, assumptions, customers, rules). No spending.
3. `test_spending.sql` - optional, for testing: loads v1 of the test data for the month set in `@SpendMonth` (27 rows).
4. `queries.sql` - checks the data and data quality.
