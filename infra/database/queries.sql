/* =====================================================================
   database/queries.sql   (T-SQL) - checks and core calculations
   ===================================================================== */

-- 1. Seeded data
SELECT * FROM dbo.Categories;
SELECT c.Name, ef.KgCO2ePerGBP, ef.Source, ef.Version, ef.EffectiveDate
FROM dbo.EmissionsFactors ef JOIN dbo.Categories c ON c.CategoryId = ef.CategoryId;
SELECT * FROM dbo.Assumptions;
SELECT COUNT(*) AS SpendingRows FROM dbo.Spending;   -- expect 36 (4 customers x 3 weeks x 3 categories)

-- 2. Weekly carbon impact
SELECT s.CustomerId, s.WeekNumber, c.Name AS Category, s.AmountGBP,
       CAST(s.AmountGBP * ef.KgCO2ePerGBP AS DECIMAL(10,2)) AS CarbonKg
FROM dbo.Spending s
JOIN dbo.Categories c        ON c.CategoryId  = s.CategoryId
JOIN dbo.EmissionsFactors ef ON ef.CategoryId = s.CategoryId AND ef.Version = N'2023'
ORDER BY s.CustomerId, s.WeekNumber, c.Name;

-- 3. Estimated monthly spend + carbon + recommendation flag
SELECT m.CustomerId, c.Name AS Category, m.WeeksOfData, m.AvgWeeklyGBP, m.EstMonthlyGBP,
       CAST(m.EstMonthlyGBP * ef.KgCO2ePerGBP AS DECIMAL(10,2)) AS EstMonthlyCarbonKg,
       r.MonthlyThresholdGBP,
       CASE WHEN m.EstMonthlyGBP > r.MonthlyThresholdGBP THEN r.RecommendationText END AS Recommendation,
       CASE WHEN m.EstMonthlyGBP > r.MonthlyThresholdGBP
            THEN CAST(m.EstMonthlyGBP * r.ReductionPercentage AS DECIMAL(10,2)) END AS ProjectedSavingsGBP,
       CASE WHEN m.EstMonthlyGBP > r.MonthlyThresholdGBP
            THEN CAST(m.EstMonthlyGBP * r.ReductionPercentage * ef.KgCO2ePerGBP AS DECIMAL(10,2)) END AS ProjectedCarbonReductionKg
FROM dbo.vw_EstimatedMonthlySpend m
JOIN dbo.Categories c          ON c.CategoryId  = m.CategoryId
JOIN dbo.EmissionsFactors ef   ON ef.CategoryId = m.CategoryId AND ef.Version = N'2023'
JOIN dbo.RecommendationRules r ON r.CategoryId  = m.CategoryId
ORDER BY m.CustomerId, c.Name;

-- 4. Data-quality checks (each should return 0 / no rows)
SELECT COUNT(*) AS NegativeOrNullAmounts FROM dbo.Spending WHERE AmountGBP IS NULL OR AmountGBP < 0;
SELECT CustomerId, CategoryId, WeekNumber, COUNT(*) AS Dupes
FROM dbo.Spending GROUP BY CustomerId, CategoryId, WeekNumber HAVING COUNT(*) > 1;
SELECT c.Name AS CategoryWithoutFactor
FROM dbo.Categories c LEFT JOIN dbo.EmissionsFactors e ON e.CategoryId = c.CategoryId
WHERE e.EmissionsFactorId IS NULL;
-- Customers with missing weeks (expect each customer/category to have the same number of weeks)
SELECT CustomerId, CategoryId, COUNT(*) AS Weeks
FROM dbo.Spending GROUP BY CustomerId, CategoryId HAVING COUNT(*) <> 3;

-- 5. Outlier check: weekly spend more than 2x the category average
SELECT s.CustomerId, c.Name, s.WeekNumber, s.AmountGBP
FROM dbo.Spending s JOIN dbo.Categories c ON c.CategoryId = s.CategoryId
WHERE s.AmountGBP > 2 * (SELECT AVG(AmountGBP) FROM dbo.Spending s2 WHERE s2.CategoryId = s.CategoryId);
