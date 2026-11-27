/* =====================================================================
   Nationwide TDP 2026 Capstone - Carbon Footprint & Savings Advisor
   infra/database/schema.sql   (T-SQL, SQL Server 2016+ / Azure SQL)
   Spending is saved against the month the user selects:
   - CSV upload  -> weekly rows (WeekNumber 1-5)
   - manual entry -> one whole-month total (WeekNumber NULL)
   The view turns both into a MONTHLY figure for the monthly thresholds.
   Categories have two levels: main categories (ParentCategoryId NULL)
   and optional sub-categories (e.g. Fuel under Travel).
   Re-runnable: drops and recreates all tables.
   ===================================================================== */

DROP TABLE IF EXISTS dbo.CustomerChallenges;
DROP TABLE IF EXISTS dbo.RecommendationActions;
DROP TABLE IF EXISTS dbo.Spending;
DROP TABLE IF EXISTS dbo.RecommendationRules;
DROP TABLE IF EXISTS dbo.Assumptions;
DROP TABLE IF EXISTS dbo.EmissionsFactors;
DROP TABLE IF EXISTS dbo.Customers;
DROP TABLE IF EXISTS dbo.Categories;
GO

/* ParentCategoryId: NULL = main category, otherwise the main category it belongs to.
   IsCarbonTracked:  0 = spend is recorded but has no carbon (e.g. mortgage repayments). */
CREATE TABLE dbo.Categories (
    CategoryId        INT IDENTITY(1,1) PRIMARY KEY,
    Name              NVARCHAR(50)  NOT NULL CONSTRAINT UQ_Categories_Name UNIQUE,
    Description       NVARCHAR(200) NULL,
    ParentCategoryId  INT           NULL
        CONSTRAINT FK_Categories_Parent REFERENCES dbo.Categories(CategoryId),
    IsCarbonTracked   BIT           NOT NULL CONSTRAINT DF_Categories_IsCarbonTracked DEFAULT 1,
    CONSTRAINT CK_Categories_NotOwnParent CHECK (ParentCategoryId IS NULL OR ParentCategoryId <> CategoryId)
);
GO

CREATE TABLE dbo.EmissionsFactors (
    EmissionsFactorId INT IDENTITY(1,1) PRIMARY KEY,
    CategoryId        INT           NOT NULL
        CONSTRAINT FK_EF_Category REFERENCES dbo.Categories(CategoryId),
    KgCO2ePerGBP      DECIMAL(10,4) NOT NULL
        CONSTRAINT CK_EF_Positive CHECK (KgCO2ePerGBP > 0),
    Unit              NVARCHAR(30)  NOT NULL DEFAULT N'kgCO2e per GBP',
    Source            NVARCHAR(200) NOT NULL,
    Version           NVARCHAR(20)  NOT NULL,
    EffectiveDate     DATE          NOT NULL,
    CONSTRAINT UQ_EF_Category_Version UNIQUE (CategoryId, Version)
);
GO

CREATE TABLE dbo.Assumptions (
    AssumptionId  INT IDENTITY(1,1) PRIMARY KEY,
    Name          NVARCHAR(100) NOT NULL CONSTRAINT UQ_Assumptions_Name UNIQUE,
    CategoryId    INT           NULL
        CONSTRAINT FK_Assumptions_Category REFERENCES dbo.Categories(CategoryId),
    Value         DECIMAL(10,4) NOT NULL,
    Unit          NVARCHAR(30)  NOT NULL,
    Description   NVARCHAR(300) NOT NULL,
    Source        NVARCHAR(200) NOT NULL
);
GO

/* CustomerId = the Microsoft Entra user ID (uid) of the signed-in user. */
CREATE TABLE dbo.Customers (
    CustomerId   UNIQUEIDENTIFIER PRIMARY KEY,
    PersonaType  NVARCHAR(50)     NULL,
    DataSource   NVARCHAR(100)    NOT NULL
);
GO

/* One row per customer, category, month and week (long format).
   CategoryId can be a main category or a sub-category.
   SpendMonth = the month the user selects (stored as the 1st of that month).
   WeekNumber = week within that month (1-5) for CSV uploads,
                NULL for a manual whole-month total. */
CREATE TABLE dbo.Spending (
    SpendingId  INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId  UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT FK_Spending_Customer REFERENCES dbo.Customers(CustomerId),
    CategoryId  INT           NOT NULL
        CONSTRAINT FK_Spending_Category REFERENCES dbo.Categories(CategoryId),
    SpendMonth  DATE          NOT NULL
        CONSTRAINT CK_Spending_Month CHECK (DAY(SpendMonth) = 1),
    WeekNumber  INT           NULL
        CONSTRAINT CK_Spending_Week CHECK (WeekNumber BETWEEN 1 AND 5),
    AmountGBP   DECIMAL(10,2) NOT NULL
        CONSTRAINT CK_Spending_Amount CHECK (AmountGBP >= 0 AND AmountGBP <= 100000),
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    -- NULLs count as equal here, so only one manual monthly total per month
    CONSTRAINT UQ_Spending_Customer_Category_Month_Week
        UNIQUE (CustomerId, CategoryId, SpendMonth, WeekNumber)
);
GO

/* Thresholds apply to MAIN categories; sub-category spend is added up to its main category. */
CREATE TABLE dbo.RecommendationRules (
    RuleId               INT IDENTITY(1,1) PRIMARY KEY,
    CategoryId           INT           NOT NULL
        CONSTRAINT FK_Rules_Category REFERENCES dbo.Categories(CategoryId),
    MonthlyThresholdGBP  DECIMAL(10,2) NOT NULL,
    RecommendationText   NVARCHAR(300) NOT NULL,
    ReductionPercentage  DECIMAL(5,4)  NOT NULL
        CONSTRAINT CK_Rules_Reduction CHECK (ReductionPercentage > 0 AND ReductionPercentage < 1)
);
GO

/* Sprint 3: practical actions per SUB-category (e.g. Fuel -> public transport).
   The main-category rule decides IF a recommendation is shown (threshold) and the
   saving (reduction %); the action makes the advice specific to what the customer
   spends most carbon on inside that main category. */
CREATE TABLE dbo.RecommendationActions (
    ActionId               INT IDENTITY(1,1) PRIMARY KEY,
    CategoryId             INT           NOT NULL
        CONSTRAINT FK_Actions_Category REFERENCES dbo.Categories(CategoryId)
        CONSTRAINT UQ_Actions_Category UNIQUE,
    LowerCarbonAlternative NVARCHAR(200) NOT NULL,
    ActionText             NVARCHAR(300) NOT NULL,
    Source                 NVARCHAR(200) NOT NULL
);
GO

/* Each category with its main category.
   For a main category, TopCategoryId is itself. */
CREATE OR ALTER VIEW dbo.vw_CategoryHierarchy AS
SELECT c.CategoryId,
       c.Name,
       c.ParentCategoryId,
       COALESCE(p.CategoryId, c.CategoryId) AS TopCategoryId,
       COALESCE(p.Name, c.Name)             AS TopCategoryName,
       CASE WHEN c.ParentCategoryId IS NULL THEN 1 ELSE 2 END AS CategoryLevel,
       c.IsCarbonTracked
FROM dbo.Categories c
LEFT JOIN dbo.Categories p ON p.CategoryId = c.ParentCategoryId;
GO

/* The emission factor to use for each category:
   - its own latest factor, if it has one
   - otherwise its main category's latest factor (fallback)
   - NULL if the category is not carbon-tracked */
CREATE OR ALTER VIEW dbo.vw_EffectiveEmissionsFactors AS
SELECT c.CategoryId,
       c.Name,
       c.ParentCategoryId,
       c.IsCarbonTracked,
       CASE WHEN c.IsCarbonTracked = 1 THEN COALESCE(own.KgCO2ePerGBP, par.KgCO2ePerGBP) END AS KgCO2ePerGBP,
       CASE WHEN c.IsCarbonTracked = 1 THEN COALESCE(own.Source,  par.Source)  END AS Source,
       CASE WHEN c.IsCarbonTracked = 1 THEN COALESCE(own.Version, par.Version) END AS Version,
       CASE WHEN c.IsCarbonTracked = 0          THEN N'Not tracked'
            WHEN own.KgCO2ePerGBP IS NOT NULL   THEN N'Own factor'
            WHEN par.KgCO2ePerGBP IS NOT NULL   THEN N'Main category factor'
            ELSE N'Missing' END AS FactorBasis
FROM dbo.Categories c
OUTER APPLY (SELECT TOP 1 ef.KgCO2ePerGBP, ef.Source, ef.Version
             FROM dbo.EmissionsFactors ef
             WHERE ef.CategoryId = c.CategoryId
             ORDER BY ef.EffectiveDate DESC, ef.EmissionsFactorId DESC) own
OUTER APPLY (SELECT TOP 1 ef.KgCO2ePerGBP, ef.Source, ef.Version
             FROM dbo.EmissionsFactors ef
             WHERE ef.CategoryId = c.ParentCategoryId
             ORDER BY ef.EffectiveDate DESC, ef.EmissionsFactorId DESC) par;
GO

/* Monthly spend per customer, category and month:
   - manual whole-month total (WeekNumber IS NULL) if the user entered one
   - otherwise average weekly spend x WeeksPerMonth (Assumptions, 52/12) */
CREATE OR ALTER VIEW dbo.vw_EstimatedMonthlySpend AS
SELECT t.CustomerId,
       t.CategoryId,
       t.SpendMonth,
       t.WeeksOfData,
       CAST(t.AvgWeeklyGBP AS DECIMAL(10,2)) AS AvgWeeklyGBP,
       CAST(COALESCE(t.ManualMonthlyGBP, t.AvgWeeklyGBP * a.Value) AS DECIMAL(10,2)) AS EstMonthlyGBP,
       CASE WHEN t.ManualMonthlyGBP IS NOT NULL THEN N'Manual monthly total'
            ELSE N'Weekly average x 4.33' END AS Method
FROM (
    SELECT CustomerId, CategoryId, SpendMonth,
           COUNT(WeekNumber)                                        AS WeeksOfData,
           AVG(CASE WHEN WeekNumber IS NOT NULL THEN AmountGBP END) AS AvgWeeklyGBP,
           MAX(CASE WHEN WeekNumber IS NULL     THEN AmountGBP END) AS ManualMonthlyGBP
    FROM dbo.Spending
    GROUP BY CustomerId, CategoryId, SpendMonth
) t
CROSS JOIN (SELECT Value FROM dbo.Assumptions WHERE Name = N'WeeksPerMonth') a;
GO

/* Monthly spend and carbon per customer and MAIN category.
   Carbon is worked out per (sub-)category with its own factor, then added up.
   Used for thresholds, recommendations and the dashboard. */
CREATE OR ALTER VIEW dbo.vw_MonthlyByMainCategory AS
SELECT m.CustomerId,
       m.SpendMonth,
       h.TopCategoryId   AS CategoryId,
       h.TopCategoryName AS Category,
       CAST(SUM(m.EstMonthlyGBP) AS DECIMAL(10,2))                   AS EstMonthlyGBP,
       CAST(SUM(m.EstMonthlyGBP * ef.KgCO2ePerGBP) AS DECIMAL(12,2)) AS EstMonthlyCarbonKg
FROM dbo.vw_EstimatedMonthlySpend m
JOIN dbo.vw_CategoryHierarchy h          ON h.CategoryId  = m.CategoryId
JOIN dbo.vw_EffectiveEmissionsFactors ef ON ef.CategoryId = m.CategoryId
GROUP BY m.CustomerId, m.SpendMonth, h.TopCategoryId, h.TopCategoryName;
GO

/* =====================================================================
   Sprint 3 - carbon insights (like the NatWest Carbon Footprint Tracker
   and Starling Spending Insights). The API reads these views directly.
   "Previous month" = the customer's previous month with data.
   ===================================================================== */

/* Monthly footprint per customer: total spend and carbon, carbon per GBP,
   change from the previous month, and comparison with the UK average. */
CREATE OR ALTER VIEW dbo.vw_CustomerMonthlyFootprint AS
WITH t AS (
    SELECT CustomerId, SpendMonth,
           SUM(EstMonthlyGBP)      AS TotalSpendGBP,
           SUM(EstMonthlyCarbonKg) AS TotalCarbonKg
    FROM dbo.vw_MonthlyByMainCategory
    GROUP BY CustomerId, SpendMonth
), p AS (
    SELECT t.*,
           LAG(t.TotalCarbonKg) OVER (PARTITION BY t.CustomerId ORDER BY t.SpendMonth) AS PrevMonthCarbonKg
    FROM t
)
SELECT p.CustomerId,
       p.SpendMonth,
       CAST(p.TotalSpendGBP AS DECIMAL(12,2))                                     AS TotalSpendGBP,
       CAST(p.TotalCarbonKg AS DECIMAL(12,2))                                     AS TotalCarbonKg,
       CAST(p.TotalCarbonKg / NULLIF(p.TotalSpendGBP, 0) AS DECIMAL(10,4))        AS KgCO2ePerGBP,
       CAST(p.PrevMonthCarbonKg AS DECIMAL(12,2))                                 AS PrevMonthCarbonKg,
       CAST(p.TotalCarbonKg - p.PrevMonthCarbonKg AS DECIMAL(12,2))               AS ChangeKg,
       CAST(100.0 * (p.TotalCarbonKg - p.PrevMonthCarbonKg)
            / NULLIF(p.PrevMonthCarbonKg, 0) AS DECIMAL(7,1))                     AS ChangePct,
       CAST(a.Value AS DECIMAL(12,2))                                             AS UkAvgMonthlyKg,
       CAST(100.0 * (p.TotalCarbonKg - a.Value) / NULLIF(a.Value, 0) AS DECIMAL(7,1)) AS VsUkAvgPct
FROM p
LEFT JOIN (SELECT Value FROM dbo.Assumptions WHERE Name = N'UkAvgMonthlyKgPerPerson') a ON 1 = 1;
GO

/* Each main category's share of the month, its rank by carbon, and the
   change from the previous month. Rank 1 = highest carbon that month. */
CREATE OR ALTER VIEW dbo.vw_CategoryInsights AS
WITH c AS (
    SELECT m.CustomerId, m.SpendMonth, m.CategoryId, m.Category,
           m.EstMonthlyGBP, m.EstMonthlyCarbonKg,
           SUM(m.EstMonthlyGBP)      OVER (PARTITION BY m.CustomerId, m.SpendMonth) AS MonthSpendGBP,
           SUM(m.EstMonthlyCarbonKg) OVER (PARTITION BY m.CustomerId, m.SpendMonth) AS MonthCarbonKg,
           LAG(m.EstMonthlyCarbonKg) OVER (PARTITION BY m.CustomerId, m.CategoryId ORDER BY m.SpendMonth) AS PrevMonthCarbonKg
    FROM dbo.vw_MonthlyByMainCategory m
)
SELECT c.CustomerId,
       c.SpendMonth,
       c.CategoryId,
       c.Category,
       c.EstMonthlyGBP                                                            AS SpendGBP,
       c.EstMonthlyCarbonKg                                                       AS CarbonKg,
       CAST(100.0 * c.EstMonthlyGBP      / NULLIF(c.MonthSpendGBP, 0) AS DECIMAL(5,1)) AS SpendSharePct,
       CAST(100.0 * c.EstMonthlyCarbonKg / NULLIF(c.MonthCarbonKg, 0) AS DECIMAL(5,1)) AS CarbonSharePct,
       RANK() OVER (PARTITION BY c.CustomerId, c.SpendMonth ORDER BY c.EstMonthlyCarbonKg DESC) AS CarbonRank,
       c.PrevMonthCarbonKg,
       CAST(c.EstMonthlyCarbonKg - c.PrevMonthCarbonKg AS DECIMAL(12,2))          AS ChangeKg,
       CAST(100.0 * (c.EstMonthlyCarbonKg - c.PrevMonthCarbonKg)
            / NULLIF(c.PrevMonthCarbonKg, 0) AS DECIMAL(7,1))                     AS ChangePct
FROM c;
GO

/* Carbon per (sub-)category, ranked within the month: shows what drives
   the footprint, e.g. Fuel or Gas rather than just Travel or Utilities. */
CREATE OR ALTER VIEW dbo.vw_TopSubCategories AS
SELECT m.CustomerId,
       m.SpendMonth,
       h.TopCategoryName                                                          AS MainCategory,
       h.Name                                                                     AS Category,
       m.EstMonthlyGBP                                                            AS SpendGBP,
       CAST(m.EstMonthlyGBP * ef.KgCO2ePerGBP AS DECIMAL(12,2))                   AS CarbonKg,
       RANK() OVER (PARTITION BY m.CustomerId, m.SpendMonth
                    ORDER BY m.EstMonthlyGBP * ef.KgCO2ePerGBP DESC)              AS CarbonRank
FROM dbo.vw_EstimatedMonthlySpend m
JOIN dbo.vw_CategoryHierarchy h          ON h.CategoryId  = m.CategoryId
JOIN dbo.vw_EffectiveEmissionsFactors ef ON ef.CategoryId = m.CategoryId;
GO

/* Sprint 3 - recommendations. One row per customer, month and main category
   that is over its monthly threshold:
   - the general advice and the saving come from RecommendationRules
     (saving = monthly spend x reduction %, carbon saved = monthly carbon x reduction %)
   - FocusSubCategory = the sub-category with the most carbon in that main category,
     with its lower-carbon alternative and practical action from RecommendationActions
   - Priority 1 = the recommendation that saves the most carbon that month.
   Customers under the threshold get no row. */
CREATE OR ALTER VIEW dbo.vw_Recommendations AS
WITH trig AS (
    SELECT m.CustomerId, m.SpendMonth, m.CategoryId, m.Category,
           m.EstMonthlyGBP, m.EstMonthlyCarbonKg,
           r.MonthlyThresholdGBP, r.RecommendationText, r.ReductionPercentage
    FROM dbo.vw_MonthlyByMainCategory m
    JOIN dbo.RecommendationRules r ON r.CategoryId = m.CategoryId
    WHERE m.EstMonthlyGBP > r.MonthlyThresholdGBP
), topsub AS (
    SELECT s.CustomerId, s.SpendMonth, h.TopCategoryId, h.CategoryId, h.Name,
           ROW_NUMBER() OVER (PARTITION BY s.CustomerId, s.SpendMonth, h.TopCategoryId
                              ORDER BY s.EstMonthlyGBP * ef.KgCO2ePerGBP DESC, h.CategoryId) AS rn
    FROM dbo.vw_EstimatedMonthlySpend s
    JOIN dbo.vw_CategoryHierarchy h          ON h.CategoryId  = s.CategoryId
    JOIN dbo.vw_EffectiveEmissionsFactors ef ON ef.CategoryId = s.CategoryId
    WHERE h.CategoryLevel = 2
)
SELECT t.CustomerId,
       t.SpendMonth,
       t.CategoryId,
       t.Category,
       t.EstMonthlyGBP                                                        AS SpendGBP,
       t.MonthlyThresholdGBP                                                  AS ThresholdGBP,
       CAST(t.EstMonthlyGBP - t.MonthlyThresholdGBP AS DECIMAL(10,2))         AS OverThresholdGBP,
       t.EstMonthlyCarbonKg                                                   AS CarbonKg,
       t.RecommendationText                                                   AS Recommendation,
       ts.Name                                                                AS FocusSubCategory,
       a.LowerCarbonAlternative,
       a.ActionText                                                           AS Action,
       a.Source                                                               AS ActionSource,
       t.ReductionPercentage,
       CAST(t.EstMonthlyGBP      * t.ReductionPercentage AS DECIMAL(10,2))    AS SavingGBP,
       CAST(t.EstMonthlyCarbonKg * t.ReductionPercentage AS DECIMAL(10,2))    AS CarbonSavedKg,
       RANK() OVER (PARTITION BY t.CustomerId, t.SpendMonth
                    ORDER BY t.EstMonthlyCarbonKg * t.ReductionPercentage DESC) AS Priority
FROM trig t
LEFT JOIN topsub ts ON ts.CustomerId = t.CustomerId AND ts.SpendMonth = t.SpendMonth
                   AND ts.TopCategoryId = t.CategoryId AND ts.rn = 1
LEFT JOIN dbo.RecommendationActions a ON a.CategoryId = ts.CategoryId;
GO

/* Total potential saving per customer and month if every recommendation is
   followed, so the API and front end don't add up the rows themselves.
   Months with no recommendation return 0, not a missing row. */
CREATE OR ALTER VIEW dbo.vw_MonthlySavingsSummary AS
SELECT f.CustomerId,
       f.SpendMonth,
       f.TotalCarbonKg,
       COUNT(r.CategoryId)                                                      AS RecommendationCount,
       CAST(ISNULL(SUM(r.SavingGBP), 0) AS DECIMAL(10,2))                       AS TotalSavingGBP,
       CAST(ISNULL(SUM(r.CarbonSavedKg), 0) AS DECIMAL(12,2))                   AS TotalCarbonSavedKg,
       CAST(f.TotalCarbonKg - ISNULL(SUM(r.CarbonSavedKg), 0) AS DECIMAL(12,2)) AS FootprintAfterKg,
       CAST(100.0 * ISNULL(SUM(r.CarbonSavedKg), 0)
            / NULLIF(f.TotalCarbonKg, 0) AS DECIMAL(5,1))                       AS CarbonSavedPct
FROM dbo.vw_CustomerMonthlyFootprint f
LEFT JOIN dbo.vw_Recommendations r
       ON r.CustomerId = f.CustomerId AND r.SpendMonth = f.SpendMonth
GROUP BY f.CustomerId, f.SpendMonth, f.TotalCarbonKg;
GO

/* ---------- Sprint 4: challenges and medals ---------- */
/* 1. Each customer's progress on a challenge.
      A row is added when the customer starts a challenge.
      No row = 'NOT_STARTED'. */
CREATE TABLE dbo.CustomerChallenges (
        CustomerChallengeId INT IDENTITY(1,1) PRIMARY KEY,
        CustomerId  UNIQUEIDENTIFIER NOT NULL
                    CONSTRAINT FK_Challenges_Customer REFERENCES dbo.Customers(CustomerId),
        CategoryId  INT NOT NULL
                    CONSTRAINT FK_Challenges_Category REFERENCES dbo.Categories(CategoryId),
        SpendMonth  DATE NOT NULL
                    CONSTRAINT CK_Challenges_Month CHECK (DAY(SpendMonth) = 1),
        Status      NVARCHAR(20) NOT NULL
                    CONSTRAINT DF_Challenges_Status DEFAULT N'IN_PROGRESS'
                    CONSTRAINT CK_Challenges_Status
                        CHECK (Status IN (N'NOT_STARTED', N'IN_PROGRESS', N'COMPLETED')),
        StartedAt   DATETIME2 NOT NULL CONSTRAINT DF_Challenges_Started DEFAULT SYSUTCDATETIME(),
        CompletedAt DATETIME2 NULL,
        CONSTRAINT UQ_CustomerChallenge UNIQUE (CustomerId, CategoryId, SpendMonth),
        CONSTRAINT CK_Challenges_Completed CHECK (
            (Status =  N'COMPLETED' AND CompletedAt IS NOT NULL) OR
            (Status <> N'COMPLETED' AND CompletedAt IS NULL))
    );
GO

/* 2. Every recommendation with its challenge status.
      The API reads this view to list a customer's challenges.
      Recommendation = main-category advice (always there).
      LowerCarbonAlternative / Action = sub-category advice (only when
      the customer entered sub-category spending). */
CREATE OR ALTER VIEW dbo.vw_CustomerChallenges AS
SELECT r.CustomerId,
       r.SpendMonth,
       r.CategoryId,
       r.Category,
       r.Recommendation,
       r.LowerCarbonAlternative,
       r.Action,
       r.SavingGBP,
       r.CarbonSavedKg,
       r.Priority,
       ISNULL(cc.Status, N'NOT_STARTED') AS Status,
       cc.StartedAt,
       cc.CompletedAt
FROM dbo.vw_Recommendations r
LEFT JOIN dbo.CustomerChallenges cc
       ON cc.CustomerId = r.CustomerId
      AND cc.CategoryId = r.CategoryId
      AND cc.SpendMonth = r.SpendMonth;
GO

/* 3. Medal per customer, from the number of completed challenges.
      1+ = Bronze, 3+ = Silver, 5+ = Gold (thresholds can be changed here). */
CREATE OR ALTER VIEW dbo.vw_CustomerMedals AS
SELECT c.CustomerId,
       COUNT(cc.CustomerChallengeId) AS CompletedChallenges,
       CASE WHEN COUNT(cc.CustomerChallengeId) >= 5 THEN N'Gold'
            WHEN COUNT(cc.CustomerChallengeId) >= 3 THEN N'Silver'
            WHEN COUNT(cc.CustomerChallengeId) >= 1 THEN N'Bronze'
       END AS Medal
FROM dbo.Customers c
LEFT JOIN dbo.CustomerChallenges cc
       ON cc.CustomerId = c.CustomerId AND cc.Status = N'COMPLETED'
GROUP BY c.CustomerId;
GO
