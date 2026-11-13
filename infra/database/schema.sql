/* =====================================================================
   Nationwide TDP 2026 Capstone - Carbon Footprint & Savings Advisor
   infra/database/schema.sql   (T-SQL, SQL Server 2016+ / Azure SQL)
   Spending is saved against the month the user selects:
   - CSV upload  -> weekly rows (WeekNumber 1-5)
   - manual entry -> one whole-month total (WeekNumber NULL)
   The view turns both into a MONTHLY figure for the monthly thresholds.
   Re-runnable: drops and recreates all tables.
   ===================================================================== */

DROP TABLE IF EXISTS dbo.Spending;
DROP TABLE IF EXISTS dbo.RecommendationRules;
DROP TABLE IF EXISTS dbo.Assumptions;
DROP TABLE IF EXISTS dbo.EmissionsFactors;
DROP TABLE IF EXISTS dbo.Customers;
DROP TABLE IF EXISTS dbo.Categories;
GO

CREATE TABLE dbo.Categories (
    CategoryId   INT IDENTITY(1,1) PRIMARY KEY,
    Name         NVARCHAR(50)  NOT NULL CONSTRAINT UQ_Categories_Name UNIQUE,
    Description  NVARCHAR(200) NULL
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

CREATE TABLE dbo.Customers (
    CustomerId   INT          PRIMARY KEY,
    PersonaType  NVARCHAR(50) NULL,
    DataSource   NVARCHAR(100) NOT NULL
);
GO

/* One row per customer, category, month and week (long format).
   SpendMonth = the month the user selects (stored as the 1st of that month).
   WeekNumber = week within that month (1-5) for CSV uploads,
                NULL for a manual whole-month total. */
CREATE TABLE dbo.Spending (
    SpendingId  INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId  INT           NOT NULL
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
