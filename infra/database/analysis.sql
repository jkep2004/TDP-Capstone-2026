/* =====================================================================
   infra/database/analysis.sql   (T-SQL) - SCRUM-124 data analysis
   Six questions about the Sprint 3 sample data (8 made-up customers,
   Sep-Nov 2026), each answered with one query on the insight views.
   Read-only: SELECT only. Findings are written under each question.
   Run after sample_spending.sql.
   ===================================================================== */

-- Only the 8 sample customers
DECLARE @Sample TABLE (CustomerId UNIQUEIDENTIFIER PRIMARY KEY, Persona NVARCHAR(50));
INSERT INTO @Sample
SELECT CustomerId, PersonaType FROM dbo.Customers
WHERE DataSource = N'synthetic sample data (Sprint 3)';

/* Q1. Who has the biggest footprint, and how do they compare with the UK average?
   Finding: the long-distance commuter is highest (about 2,390 kg a month, nearly 4x the
   UK average of 631 kg); the student is lowest (about 640 kg, close to the average). */
SELECT s.Persona,
       CAST(AVG(f.TotalCarbonKg) AS DECIMAL(10,0)) AS AvgMonthlyCarbonKg,
       CAST(AVG(f.VsUkAvgPct)    AS DECIMAL(10,0)) AS AvgVsUkAvgPct
FROM dbo.vw_CustomerMonthlyFootprint f
JOIN @Sample s ON s.CustomerId = f.CustomerId
GROUP BY s.Persona
ORDER BY AvgMonthlyCarbonKg DESC;

/* Q2. Which categories cause the most carbon overall?
   Finding: Travel is 43% of all carbon and Utilities 25%, so most savings will come from
   driving and heating. Housing is a big spend but only 3% of carbon. */
SELECT c.Category,
       SUM(c.SpendGBP) AS SpendGBP,
       SUM(c.CarbonKg) AS CarbonKg,
       CAST(100.0 * SUM(c.CarbonKg) / SUM(SUM(c.CarbonKg)) OVER () AS DECIMAL(5,1)) AS CarbonSharePct
FROM dbo.vw_CategoryInsights c
JOIN @Sample s ON s.CustomerId = c.CustomerId
GROUP BY c.Category
ORDER BY CarbonKg DESC;

/* Q3. What drives it, one level down?
   Finding: Fuel and Gas are the top two sub-categories: the same two things the
   recommendations target (car share / public transport, turn the heating down). */
SELECT t.Category AS SubCategory, t.MainCategory,
       SUM(t.CarbonKg) AS CarbonKg
FROM dbo.vw_TopSubCategories t
JOIN @Sample s ON s.CustomerId = t.CustomerId
GROUP BY t.Category, t.MainCategory
ORDER BY CarbonKg DESC;

/* Q4. Who is getting better or worse from September to November?
   Finding: the green switcher cut carbon by 44% by swapping the car for the train;
   the family went up 137% because of one Black Friday electronics purchase;
   the retired homeowner rose 26% as the heating came on. */
SELECT s.Persona,
       MAX(CASE WHEN f.SpendMonth = '2026-09-01' THEN f.TotalCarbonKg END) AS SepKg,
       MAX(CASE WHEN f.SpendMonth = '2026-10-01' THEN f.TotalCarbonKg END) AS OctKg,
       MAX(CASE WHEN f.SpendMonth = '2026-11-01' THEN f.TotalCarbonKg END) AS NovKg,
       CAST(100.0 * (MAX(CASE WHEN f.SpendMonth = '2026-11-01' THEN f.TotalCarbonKg END)
                   - MAX(CASE WHEN f.SpendMonth = '2026-09-01' THEN f.TotalCarbonKg END))
            / MAX(CASE WHEN f.SpendMonth = '2026-09-01' THEN f.TotalCarbonKg END) AS DECIMAL(6,1)) AS SepToNovPct
FROM dbo.vw_CustomerMonthlyFootprint f
JOIN @Sample s ON s.CustomerId = f.CustomerId
GROUP BY s.Persona
ORDER BY SepToNovPct;

/* Q5. Is every pound equally "dirty"?
   Finding: no. The retired homeowner spends the least but has the most carbon per pound
   (about 1.3 kg per GBP) because most of it is gas; the student is about 0.5. */
SELECT s.Persona,
       CAST(AVG(f.TotalSpendGBP) AS DECIMAL(10,0)) AS AvgMonthlySpendGBP,
       CAST(AVG(f.KgCO2ePerGBP)  AS DECIMAL(6,2))  AS AvgKgPerGBP
FROM dbo.vw_CustomerMonthlyFootprint f
JOIN @Sample s ON s.CustomerId = f.CustomerId
GROUP BY s.Persona
ORDER BY AvgKgPerGBP DESC;

/* Q6. What would the recommendations achieve?
   Finding: 57 recommendations over 3 months. Following them would save about
   GBP 3,283 and 4,363 kg CO2e in total; Food is the most common, but Travel saves
   the most carbon per recommendation. */
SELECT r.Category,
       COUNT(*)              AS Recommendations,
       SUM(r.SavingGBP)      AS SavingGBP,
       SUM(r.CarbonSavedKg)  AS CarbonSavedKg,
       CAST(AVG(r.CarbonSavedKg) AS DECIMAL(10,1)) AS AvgCarbonSavedKg
FROM dbo.vw_Recommendations r
JOIN @Sample s ON s.CustomerId = r.CustomerId
GROUP BY r.Category
ORDER BY CarbonSavedKg DESC;
GO
