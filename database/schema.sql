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

/* One row per customer, week and category (long format) */
CREATE TABLE dbo.Spending (
    SpendingId  INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId  INT           NOT NULL
        CONSTRAINT FK_Spending_Customer REFERENCES dbo.Customers(CustomerId),
    CategoryId  INT           NOT NULL
        CONSTRAINT FK_Spending_Category REFERENCES dbo.Categories(CategoryId),
    WeekNumber  INT           NOT NULL
        CONSTRAINT CK_Spending_Week CHECK (WeekNumber BETWEEN 1 AND 53),
    AmountGBP   DECIMAL(10,2) NOT NULL
        CONSTRAINT CK_Spending_Amount CHECK (AmountGBP >= 0 AND AmountGBP <= 100000),
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Spending_Customer_Category_Week UNIQUE (CustomerId, CategoryId, WeekNumber)
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

/* Estimated monthly spend = average weekly spend x WeeksPerMonth (Assumptions) */
CREATE OR ALTER VIEW dbo.vw_EstimatedMonthlySpend AS
SELECT s.CustomerId,
       s.CategoryId,
       COUNT(*)                                   AS WeeksOfData,
       CAST(AVG(s.AmountGBP) AS DECIMAL(10,2))    AS AvgWeeklyGBP,
       CAST(AVG(s.AmountGBP) * a.Value AS DECIMAL(10,2)) AS EstMonthlyGBP
FROM dbo.Spending s
CROSS JOIN (SELECT Value FROM dbo.Assumptions WHERE Name = N'WeeksPerMonth') a
GROUP BY s.CustomerId, s.CategoryId, a.Value;
GO
