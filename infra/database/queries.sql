/* =====================================================================
   infra/database/queries.sql   (T-SQL) - checks and core calculations
   ===================================================================== */

-- 1. Seeded data
SELECT * FROM dbo.vw_CategoryHierarchy ORDER BY TopCategoryId, CategoryLevel, Name;
SELECT * FROM dbo.vw_EffectiveEmissionsFactors ORDER BY CategoryId;   -- which factor each category uses
SELECT * FROM dbo.Assumptions;
SELECT COUNT(*) AS SpendingRows FROM dbo.Spending;   -- 0 until spending is uploaded; 27 after test_spending.sql (v1), +476 after sample_spending.sql

-- 2. Weekly carbon impact (any category level; NULL carbon = not tracked)
SELECT s.CustomerId, s.SpendMonth, s.WeekNumber, h.TopCategoryName AS MainCategory, h.Name AS Category,
       s.AmountGBP, ef.FactorBasis,
       CAST(s.AmountGBP * ef.KgCO2ePerGBP AS DECIMAL(10,2)) AS CarbonKg
FROM dbo.Spending s
JOIN dbo.vw_CategoryHierarchy h          ON h.CategoryId  = s.CategoryId
JOIN dbo.vw_EffectiveEmissionsFactors ef ON ef.CategoryId = s.CategoryId
ORDER BY s.CustomerId, s.SpendMonth, s.WeekNumber, h.TopCategoryName, h.Name;

-- 3. Monthly spend + carbon per MAIN category + recommendation flag
SELECT m.CustomerId, m.SpendMonth, m.Category, m.EstMonthlyGBP, m.EstMonthlyCarbonKg,
       r.MonthlyThresholdGBP,
       CASE WHEN m.EstMonthlyGBP > r.MonthlyThresholdGBP THEN r.RecommendationText END AS Recommendation,
       CASE WHEN m.EstMonthlyGBP > r.MonthlyThresholdGBP
            THEN CAST(m.EstMonthlyGBP * r.ReductionPercentage AS DECIMAL(10,2)) END AS ProjectedSavingsGBP,
       CASE WHEN m.EstMonthlyGBP > r.MonthlyThresholdGBP
            THEN CAST(m.EstMonthlyCarbonKg * r.ReductionPercentage AS DECIMAL(10,2)) END AS ProjectedCarbonReductionKg
FROM dbo.vw_MonthlyByMainCategory m
LEFT JOIN dbo.RecommendationRules r ON r.CategoryId = m.CategoryId   -- Housing/Other have no rule
ORDER BY m.CustomerId, m.SpendMonth, m.Category;

-- 3b. Drill-down: monthly spend + carbon per sub-category
SELECT m.CustomerId, m.SpendMonth, h.TopCategoryName AS MainCategory, h.Name AS Category,
       m.Method, m.WeeksOfData, m.EstMonthlyGBP, ef.FactorBasis,
       CAST(m.EstMonthlyGBP * ef.KgCO2ePerGBP AS DECIMAL(10,2)) AS EstMonthlyCarbonKg
FROM dbo.vw_EstimatedMonthlySpend m
JOIN dbo.vw_CategoryHierarchy h          ON h.CategoryId  = m.CategoryId
JOIN dbo.vw_EffectiveEmissionsFactors ef ON ef.CategoryId = m.CategoryId
ORDER BY m.CustomerId, m.SpendMonth, h.TopCategoryName, h.CategoryLevel, h.Name;

-- 4. Data-quality checks (each should return 0 / no rows)
SELECT COUNT(*) AS NegativeOrNullAmounts FROM dbo.Spending WHERE AmountGBP IS NULL OR AmountGBP < 0;
SELECT CustomerId, CategoryId, SpendMonth, WeekNumber, COUNT(*) AS Dupes
FROM dbo.Spending GROUP BY CustomerId, CategoryId, SpendMonth, WeekNumber HAVING COUNT(*) > 1;
-- Carbon-tracked categories with no factor at all (not even from the main category)
SELECT CategoryId, Name AS CategoryWithoutFactor
FROM dbo.vw_EffectiveEmissionsFactors WHERE FactorBasis = N'Missing';
-- Only two levels allowed: a sub-category's parent must be a main category
SELECT c.CategoryId, c.Name AS TooDeep
FROM dbo.Categories c JOIN dbo.Categories p ON p.CategoryId = c.ParentCategoryId
WHERE p.ParentCategoryId IS NOT NULL;
-- Recommendation rules must be on main categories
SELECT r.RuleId, c.Name AS RuleOnSubCategory
FROM dbo.RecommendationRules r JOIN dbo.Categories c ON c.CategoryId = r.CategoryId
WHERE c.ParentCategoryId IS NOT NULL;
-- Sub-category tracked while its main category is not (inconsistent)
SELECT c.Name AS TrackedChildOfUntrackedParent
FROM dbo.Categories c JOIN dbo.Categories p ON p.CategoryId = c.ParentCategoryId
WHERE c.IsCarbonTracked = 1 AND p.IsCarbonTracked = 0;
-- Months with weekly rows but fewer than 3 weeks (estimate less reliable)
SELECT CustomerId, CategoryId, SpendMonth, COUNT(WeekNumber) AS Weeks
FROM dbo.Spending GROUP BY CustomerId, CategoryId, SpendMonth
HAVING COUNT(WeekNumber) BETWEEN 1 AND 2;
-- Months with BOTH a manual total and weekly rows (manual total wins in the view)
SELECT CustomerId, CategoryId, SpendMonth
FROM dbo.Spending GROUP BY CustomerId, CategoryId, SpendMonth
HAVING COUNT(WeekNumber) > 0 AND COUNT(*) > COUNT(WeekNumber);
-- Same month has spend on a main category AND on its sub-categories (possible double counting)
SELECT DISTINCT s.CustomerId, s.SpendMonth, p.Name AS MainCategory
FROM dbo.Spending s
JOIN dbo.Categories c  ON c.CategoryId = s.CategoryId AND c.ParentCategoryId IS NOT NULL
JOIN dbo.Categories p  ON p.CategoryId = c.ParentCategoryId
JOIN dbo.Spending s2   ON s2.CustomerId = s.CustomerId AND s2.SpendMonth = s.SpendMonth
                      AND s2.CategoryId = p.CategoryId;

-- 5. Info: sub-categories using their main category's factor (add their own when available)
SELECT CategoryId, Name, KgCO2ePerGBP
FROM dbo.vw_EffectiveEmissionsFactors WHERE FactorBasis = N'Main category factor';

-- 6. Outlier check: weekly spend more than 2x the category average
SELECT s.CustomerId, c.Name, s.SpendMonth, s.WeekNumber, s.AmountGBP
FROM dbo.Spending s JOIN dbo.Categories c ON c.CategoryId = s.CategoryId
WHERE s.WeekNumber IS NOT NULL
  AND s.AmountGBP > 2 * (SELECT AVG(AmountGBP) FROM dbo.Spending s2
                         WHERE s2.CategoryId = s.CategoryId AND s2.WeekNumber IS NOT NULL);

-- 7. Sprint 3 insights: examples and checks (each check should return no rows)
SELECT * FROM dbo.vw_CustomerMonthlyFootprint ORDER BY CustomerId, SpendMonth;
SELECT * FROM dbo.vw_CategoryInsights ORDER BY CustomerId, SpendMonth, CarbonRank;
SELECT * FROM dbo.vw_TopSubCategories WHERE CarbonRank <= 3 ORDER BY CustomerId, SpendMonth, CarbonRank;

-- The monthly total must equal the sum of its categories
SELECT f.CustomerId, f.SpendMonth, f.TotalCarbonKg, SUM(c.CarbonKg) AS SumOfCategories
FROM dbo.vw_CustomerMonthlyFootprint f
JOIN dbo.vw_CategoryInsights c ON c.CustomerId = f.CustomerId AND c.SpendMonth = f.SpendMonth
GROUP BY f.CustomerId, f.SpendMonth, f.TotalCarbonKg
HAVING ABS(f.TotalCarbonKg - SUM(c.CarbonKg)) > 0.01;

-- Category shares must add up to about 100% (rounding allowed)
SELECT CustomerId, SpendMonth, SUM(SpendSharePct) AS SpendShareTotal, SUM(CarbonSharePct) AS CarbonShareTotal
FROM dbo.vw_CategoryInsights
GROUP BY CustomerId, SpendMonth
HAVING ABS(SUM(SpendSharePct) - 100) > 0.5 OR ABS(SUM(CarbonSharePct) - 100) > 0.5;

-- Every customer-month must have a category ranked 1
SELECT CustomerId, SpendMonth
FROM dbo.vw_CategoryInsights
GROUP BY CustomerId, SpendMonth
HAVING MIN(CarbonRank) <> 1;

-- The UK average must be set, otherwise VsUkAvgPct is empty
SELECT N'UkAvgMonthlyKgPerPerson missing' AS Problem
WHERE NOT EXISTS (SELECT 1 FROM dbo.Assumptions WHERE Name = N'UkAvgMonthlyKgPerPerson');

-- 8. Sprint 3 recommendations: example and checks (each check should return no rows)
SELECT * FROM dbo.vw_Recommendations ORDER BY CustomerId, SpendMonth, Priority;

-- Actions must be on sub-categories (the main-category rule handles the rest)
SELECT a.ActionId, c.Name AS ActionOnMainCategory
FROM dbo.RecommendationActions a JOIN dbo.Categories c ON c.CategoryId = a.CategoryId
WHERE c.ParentCategoryId IS NULL;

-- Every carbon-tracked sub-category under a main category with a rule needs an action
SELECT c.CategoryId, c.Name AS SubCategoryWithoutAction
FROM dbo.Categories c
JOIN dbo.RecommendationRules r ON r.CategoryId = c.ParentCategoryId
LEFT JOIN dbo.RecommendationActions a ON a.CategoryId = c.CategoryId
WHERE c.IsCarbonTracked = 1 AND a.ActionId IS NULL;

-- Nobody under a threshold gets a recommendation
SELECT CustomerId, SpendMonth, Category
FROM dbo.vw_Recommendations
WHERE SpendGBP <= ThresholdGBP;

-- 9. Savings summary: example and checks (each check should return no rows)
SELECT * FROM dbo.vw_MonthlySavingsSummary ORDER BY CustomerId, SpendMonth;

-- One summary row for every customer-month in the footprint
SELECT f.CustomerId, f.SpendMonth AS MonthMissingFromSummary
FROM dbo.vw_CustomerMonthlyFootprint f
LEFT JOIN dbo.vw_MonthlySavingsSummary s ON s.CustomerId = f.CustomerId AND s.SpendMonth = f.SpendMonth
WHERE s.CustomerId IS NULL;

-- Totals must equal the sum of the recommendation rows
SELECT s.CustomerId, s.SpendMonth, s.TotalSavingGBP, r.SumSavingGBP
FROM dbo.vw_MonthlySavingsSummary s
JOIN (SELECT CustomerId, SpendMonth, SUM(SavingGBP) AS SumSavingGBP, SUM(CarbonSavedKg) AS SumCarbonKg
      FROM dbo.vw_Recommendations GROUP BY CustomerId, SpendMonth) r
  ON r.CustomerId = s.CustomerId AND r.SpendMonth = s.SpendMonth
WHERE s.TotalSavingGBP <> r.SumSavingGBP OR s.TotalCarbonSavedKg <> r.SumCarbonKg;
