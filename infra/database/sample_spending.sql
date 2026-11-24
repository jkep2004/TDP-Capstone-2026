/* =====================================================================
   infra/database/sample_spending.sql   (T-SQL) - test data for Sprint 3
   Synthetic spending for 8 made-up customers over 3 months (Sep-Nov 2026),
   saved against sub-categories, for carbon insights, trends and
   recommendations. Each customer has a different spending pattern
   (see the comments in the plan below).
   Run after schema.sql and seed.sql. Can be loaded together with
   test_spending.sql (different customers).
   Re-runnable: removes these 8 customers and their spending first.
   Expected results: docs/sample_expected_results.md
   SYNTHETIC / MADE-UP DATA ONLY - no real customer information.
   ===================================================================== */

SET NOCOUNT ON;

DECLARE @C101 UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000101';  -- Car commuter
DECLARE @C102 UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000102';  -- Family
DECLARE @C103 UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000103';  -- City renter who flies
DECLARE @C104 UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000104';  -- Student
DECLARE @C105 UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000105';  -- Retired homeowner
DECLARE @C106 UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000106';  -- Remote worker
DECLARE @C107 UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000107';  -- Green switcher
DECLARE @C108 UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000108';  -- Long-distance commuter

DELETE FROM dbo.Spending  WHERE CustomerId IN (@C101, @C102, @C103, @C104, @C105, @C106, @C107, @C108);
DELETE FROM dbo.Customers WHERE CustomerId IN (@C101, @C102, @C103, @C104, @C105, @C106, @C107, @C108);

INSERT INTO dbo.Customers (CustomerId, PersonaType, DataSource) VALUES
(@C101, N'Car commuter', N'synthetic sample data (Sprint 3)'),
(@C102, N'Family', N'synthetic sample data (Sprint 3)'),
(@C103, N'City renter who flies', N'synthetic sample data (Sprint 3)'),
(@C104, N'Student', N'synthetic sample data (Sprint 3)'),
(@C105, N'Retired homeowner', N'synthetic sample data (Sprint 3)'),
(@C106, N'Remote worker', N'synthetic sample data (Sprint 3)'),
(@C107, N'Green switcher', N'synthetic sample data (Sprint 3)'),
(@C108, N'Long-distance commuter', N'synthetic sample data (Sprint 3)');

/* One row per customer, sub-category and month.
   WeeklyGBP  = typical weekly spend -> 4 weekly rows (x 1.05, 0.95, 1.00, 1.00,
                so the weekly average is exactly WeeklyGBP)
   MonthlyGBP = a bill or one-off purchase -> one monthly row (WeekNumber NULL)
   Amounts are set so the data-quality checks in queries.sql all return 0. */
DECLARE @Plan TABLE (
    CustomerId UNIQUEIDENTIFIER,
    CategoryId INT,
    SpendMonth DATE,
    WeeklyGBP  DECIMAL(10,2) NULL,
    MonthlyGBP DECIMAL(10,2) NULL
);

INSERT INTO @Plan (CustomerId, CategoryId, SpendMonth, WeeklyGBP, MonthlyGBP) VALUES
-- C101 Car commuter: Drives to work; cuts back on driving each month; gas rises in winter
(@C101,  7, '2026-09-01',   95.00,     NULL),   -- Fuel
(@C101,  7, '2026-10-01',   85.00,     NULL),   -- Fuel
(@C101,  7, '2026-11-01',   75.00,     NULL),   -- Fuel
(@C101, 10, '2026-09-01',   70.00,     NULL),   -- Groceries
(@C101, 10, '2026-10-01',   70.00,     NULL),   -- Groceries
(@C101, 10, '2026-11-01',   72.00,     NULL),   -- Groceries
(@C101, 11, '2026-09-01',   25.00,     NULL),   -- Eating out
(@C101, 11, '2026-10-01',   22.00,     NULL),   -- Eating out
(@C101, 11, '2026-11-01',   20.00,     NULL),   -- Eating out
(@C101, 12, '2026-09-01',    NULL,    70.00),   -- Electricity
(@C101, 12, '2026-10-01',    NULL,    72.00),   -- Electricity
(@C101, 12, '2026-11-01',    NULL,    80.00),   -- Electricity
(@C101, 13, '2026-09-01',    NULL,    60.00),   -- Gas
(@C101, 13, '2026-10-01',    NULL,    85.00),   -- Gas
(@C101, 13, '2026-11-01',    NULL,   120.00),   -- Gas
(@C101, 14, '2026-09-01',    NULL,    35.00),   -- Water
(@C101, 14, '2026-10-01',    NULL,    35.00),   -- Water
(@C101, 14, '2026-11-01',    NULL,    35.00),   -- Water
(@C101, 18, '2026-09-01',    NULL,  1200.00),   -- Rent
(@C101, 18, '2026-10-01',    NULL,  1200.00),   -- Rent
(@C101, 18, '2026-11-01',    NULL,  1200.00),   -- Rent
(@C101, 15, '2026-09-01',   15.00,     NULL),   -- Clothing
(@C101, 15, '2026-10-01',   15.00,     NULL),   -- Clothing
(@C101, 15, '2026-11-01',   20.00,     NULL),   -- Clothing
-- C102 Family: Buses and trains; mortgage (spend but no carbon); Black Friday electronics in November
(@C102,  8, '2026-09-01',   40.00,     NULL),   -- Public transport
(@C102,  8, '2026-10-01',   40.00,     NULL),   -- Public transport
(@C102,  8, '2026-11-01',   40.00,     NULL),   -- Public transport
(@C102, 10, '2026-09-01',  110.00,     NULL),   -- Groceries
(@C102, 10, '2026-10-01',  115.00,     NULL),   -- Groceries
(@C102, 10, '2026-11-01',  125.00,     NULL),   -- Groceries
(@C102, 11, '2026-09-01',   20.00,     NULL),   -- Eating out
(@C102, 11, '2026-10-01',   20.00,     NULL),   -- Eating out
(@C102, 11, '2026-11-01',   25.00,     NULL),   -- Eating out
(@C102, 12, '2026-09-01',    NULL,    85.00),   -- Electricity
(@C102, 12, '2026-10-01',    NULL,    90.00),   -- Electricity
(@C102, 12, '2026-11-01',    NULL,   105.00),   -- Electricity
(@C102, 13, '2026-09-01',    NULL,    80.00),   -- Gas
(@C102, 13, '2026-10-01',    NULL,   110.00),   -- Gas
(@C102, 13, '2026-11-01',    NULL,   150.00),   -- Gas
(@C102, 14, '2026-09-01',    NULL,    40.00),   -- Water
(@C102, 14, '2026-10-01',    NULL,    40.00),   -- Water
(@C102, 14, '2026-11-01',    NULL,    40.00),   -- Water
(@C102, 19, '2026-09-01',    NULL,  1100.00),   -- Mortgage
(@C102, 19, '2026-10-01',    NULL,  1100.00),   -- Mortgage
(@C102, 19, '2026-11-01',    NULL,  1100.00),   -- Mortgage
(@C102, 15, '2026-09-01',   25.00,     NULL),   -- Clothing
(@C102, 15, '2026-10-01',   22.00,     NULL),   -- Clothing
(@C102, 15, '2026-11-01',   28.00,     NULL),   -- Clothing
(@C102, 16, '2026-11-01',    NULL,   650.00),   -- Electronics
-- C103 City renter who flies: Eats out a lot; flights in September and November; furniture in September
(@C103,  9, '2026-09-01',    NULL,   450.00),   -- Flights
(@C103,  9, '2026-11-01',    NULL,   320.00),   -- Flights
(@C103,  8, '2026-09-01',   30.00,     NULL),   -- Public transport
(@C103,  8, '2026-10-01',   32.00,     NULL),   -- Public transport
(@C103,  8, '2026-11-01',   30.00,     NULL),   -- Public transport
(@C103, 10, '2026-09-01',   50.00,     NULL),   -- Groceries
(@C103, 10, '2026-10-01',   50.00,     NULL),   -- Groceries
(@C103, 10, '2026-11-01',   55.00,     NULL),   -- Groceries
(@C103, 11, '2026-09-01',   45.00,     NULL),   -- Eating out
(@C103, 11, '2026-10-01',   50.00,     NULL),   -- Eating out
(@C103, 11, '2026-11-01',   55.00,     NULL),   -- Eating out
(@C103, 12, '2026-09-01',    NULL,    50.00),   -- Electricity
(@C103, 12, '2026-10-01',    NULL,    52.00),   -- Electricity
(@C103, 12, '2026-11-01',    NULL,    60.00),   -- Electricity
(@C103, 13, '2026-09-01',    NULL,    40.00),   -- Gas
(@C103, 13, '2026-10-01',    NULL,    55.00),   -- Gas
(@C103, 13, '2026-11-01',    NULL,    75.00),   -- Gas
(@C103, 14, '2026-09-01',    NULL,    30.00),   -- Water
(@C103, 14, '2026-10-01',    NULL,    30.00),   -- Water
(@C103, 14, '2026-11-01',    NULL,    30.00),   -- Water
(@C103, 18, '2026-09-01',    NULL,   950.00),   -- Rent
(@C103, 18, '2026-10-01',    NULL,   950.00),   -- Rent
(@C103, 18, '2026-11-01',    NULL,   950.00),   -- Rent
(@C103, 17, '2026-09-01',    NULL,   400.00),   -- Furniture and appliances
-- C104 Student: Low spend; public transport; laptop in October
(@C104,  8, '2026-09-01',   15.00,     NULL),   -- Public transport
(@C104,  8, '2026-10-01',   15.00,     NULL),   -- Public transport
(@C104,  8, '2026-11-01',   15.00,     NULL),   -- Public transport
(@C104, 10, '2026-09-01',   35.00,     NULL),   -- Groceries
(@C104, 10, '2026-10-01',   35.00,     NULL),   -- Groceries
(@C104, 10, '2026-11-01',   38.00,     NULL),   -- Groceries
(@C104, 11, '2026-09-01',   30.00,     NULL),   -- Eating out
(@C104, 11, '2026-10-01',   32.00,     NULL),   -- Eating out
(@C104, 11, '2026-11-01',   28.00,     NULL),   -- Eating out
(@C104, 12, '2026-09-01',    NULL,    25.00),   -- Electricity
(@C104, 12, '2026-10-01',    NULL,    28.00),   -- Electricity
(@C104, 12, '2026-11-01',    NULL,    32.00),   -- Electricity
(@C104, 13, '2026-09-01',    NULL,    20.00),   -- Gas
(@C104, 13, '2026-10-01',    NULL,    28.00),   -- Gas
(@C104, 13, '2026-11-01',    NULL,    40.00),   -- Gas
(@C104, 18, '2026-09-01',    NULL,   600.00),   -- Rent
(@C104, 18, '2026-10-01',    NULL,   600.00),   -- Rent
(@C104, 18, '2026-11-01',    NULL,   600.00),   -- Rent
(@C104, 15, '2026-09-01',   12.00,     NULL),   -- Clothing
(@C104, 15, '2026-10-01',   12.00,     NULL),   -- Clothing
(@C104, 15, '2026-11-01',   15.00,     NULL),   -- Clothing
(@C104, 16, '2026-10-01',    NULL,   300.00),   -- Electronics
-- C105 Retired homeowner: Home all day: high gas and electricity; little travel; no rent or mortgage
(@C105,  7, '2026-09-01',   30.00,     NULL),   -- Fuel
(@C105,  7, '2026-10-01',   30.00,     NULL),   -- Fuel
(@C105,  7, '2026-11-01',   28.00,     NULL),   -- Fuel
(@C105, 10, '2026-09-01',   80.00,     NULL),   -- Groceries
(@C105, 10, '2026-10-01',   80.00,     NULL),   -- Groceries
(@C105, 10, '2026-11-01',   85.00,     NULL),   -- Groceries
(@C105, 11, '2026-09-01',   15.00,     NULL),   -- Eating out
(@C105, 11, '2026-10-01',   15.00,     NULL),   -- Eating out
(@C105, 11, '2026-11-01',   18.00,     NULL),   -- Eating out
(@C105, 12, '2026-09-01',    NULL,    90.00),   -- Electricity
(@C105, 12, '2026-10-01',    NULL,    95.00),   -- Electricity
(@C105, 12, '2026-11-01',    NULL,   110.00),   -- Electricity
(@C105, 13, '2026-09-01',    NULL,   110.00),   -- Gas
(@C105, 13, '2026-10-01',    NULL,   150.00),   -- Gas
(@C105, 13, '2026-11-01',    NULL,   190.00),   -- Gas
(@C105, 14, '2026-09-01',    NULL,    40.00),   -- Water
(@C105, 14, '2026-10-01',    NULL,    40.00),   -- Water
(@C105, 14, '2026-11-01',    NULL,    40.00),   -- Water
(@C105, 15, '2026-09-01',   12.00,     NULL),   -- Clothing
(@C105, 15, '2026-10-01',   12.00,     NULL),   -- Clothing
(@C105, 15, '2026-11-01',   15.00,     NULL),   -- Clothing
-- C106 Remote worker: Hardly travels; home office bills; new computer in September
(@C106,  8, '2026-09-01',   20.00,     NULL),   -- Public transport
(@C106,  8, '2026-10-01',   20.00,     NULL),   -- Public transport
(@C106,  8, '2026-11-01',   22.00,     NULL),   -- Public transport
(@C106, 10, '2026-09-01',   60.00,     NULL),   -- Groceries
(@C106, 10, '2026-10-01',   60.00,     NULL),   -- Groceries
(@C106, 10, '2026-11-01',   65.00,     NULL),   -- Groceries
(@C106, 11, '2026-09-01',   20.00,     NULL),   -- Eating out
(@C106, 11, '2026-10-01',   20.00,     NULL),   -- Eating out
(@C106, 11, '2026-11-01',   40.00,     NULL),   -- Eating out
(@C106, 12, '2026-09-01',    NULL,    80.00),   -- Electricity
(@C106, 12, '2026-10-01',    NULL,    85.00),   -- Electricity
(@C106, 12, '2026-11-01',    NULL,    95.00),   -- Electricity
(@C106, 13, '2026-09-01',    NULL,    70.00),   -- Gas
(@C106, 13, '2026-10-01',    NULL,    95.00),   -- Gas
(@C106, 13, '2026-11-01',    NULL,   130.00),   -- Gas
(@C106, 14, '2026-09-01',    NULL,    35.00),   -- Water
(@C106, 14, '2026-10-01',    NULL,    35.00),   -- Water
(@C106, 14, '2026-11-01',    NULL,    35.00),   -- Water
(@C106, 18, '2026-09-01',    NULL,  1100.00),   -- Rent
(@C106, 18, '2026-10-01',    NULL,  1100.00),   -- Rent
(@C106, 18, '2026-11-01',    NULL,  1100.00),   -- Rent
(@C106, 15, '2026-09-01',   10.00,     NULL),   -- Clothing
(@C106, 15, '2026-10-01',   10.00,     NULL),   -- Clothing
(@C106, 15, '2026-11-01',   10.00,     NULL),   -- Clothing
(@C106, 16, '2026-09-01',    NULL,   900.00),   -- Electronics
-- C107 Green switcher: Swaps the car for the train over three months; eats out less
(@C107,  7, '2026-09-01',   80.00,     NULL),   -- Fuel
(@C107,  7, '2026-10-01',   40.00,     NULL),   -- Fuel
(@C107,  8, '2026-09-01',   15.00,     NULL),   -- Public transport
(@C107,  8, '2026-10-01',   30.00,     NULL),   -- Public transport
(@C107,  8, '2026-11-01',   40.00,     NULL),   -- Public transport
(@C107, 10, '2026-09-01',   60.00,     NULL),   -- Groceries
(@C107, 10, '2026-10-01',   60.00,     NULL),   -- Groceries
(@C107, 10, '2026-11-01',   62.00,     NULL),   -- Groceries
(@C107, 11, '2026-09-01',   50.00,     NULL),   -- Eating out
(@C107, 11, '2026-10-01',   35.00,     NULL),   -- Eating out
(@C107, 11, '2026-11-01',   25.00,     NULL),   -- Eating out
(@C107, 12, '2026-09-01',    NULL,    60.00),   -- Electricity
(@C107, 12, '2026-10-01',    NULL,    62.00),   -- Electricity
(@C107, 12, '2026-11-01',    NULL,    70.00),   -- Electricity
(@C107, 13, '2026-09-01',    NULL,    65.00),   -- Gas
(@C107, 13, '2026-10-01',    NULL,    70.00),   -- Gas
(@C107, 13, '2026-11-01',    NULL,    85.00),   -- Gas
(@C107, 14, '2026-09-01',    NULL,    30.00),   -- Water
(@C107, 14, '2026-10-01',    NULL,    30.00),   -- Water
(@C107, 14, '2026-11-01',    NULL,    30.00),   -- Water
(@C107, 18, '2026-09-01',    NULL,   900.00),   -- Rent
(@C107, 18, '2026-10-01',    NULL,   900.00),   -- Rent
(@C107, 18, '2026-11-01',    NULL,   900.00),   -- Rent
(@C107, 15, '2026-09-01',   15.00,     NULL),   -- Clothing
(@C107, 15, '2026-10-01',   12.00,     NULL),   -- Clothing
(@C107, 15, '2026-11-01',   12.00,     NULL),   -- Clothing
-- C108 Long-distance commuter: Drives a long way every day; travel well above the threshold
(@C108,  7, '2026-09-01',  140.00,     NULL),   -- Fuel
(@C108,  7, '2026-10-01',  145.00,     NULL),   -- Fuel
(@C108,  7, '2026-11-01',  150.00,     NULL),   -- Fuel
(@C108, 10, '2026-09-01',   75.00,     NULL),   -- Groceries
(@C108, 10, '2026-10-01',   75.00,     NULL),   -- Groceries
(@C108, 10, '2026-11-01',   80.00,     NULL),   -- Groceries
(@C108, 11, '2026-09-01',   35.00,     NULL),   -- Eating out
(@C108, 11, '2026-10-01',   35.00,     NULL),   -- Eating out
(@C108, 11, '2026-11-01',   40.00,     NULL),   -- Eating out
(@C108, 12, '2026-09-01',    NULL,    65.00),   -- Electricity
(@C108, 12, '2026-10-01',    NULL,    68.00),   -- Electricity
(@C108, 12, '2026-11-01',    NULL,    75.00),   -- Electricity
(@C108, 13, '2026-09-01',    NULL,    60.00),   -- Gas
(@C108, 13, '2026-10-01',    NULL,    85.00),   -- Gas
(@C108, 13, '2026-11-01',    NULL,   110.00),   -- Gas
(@C108, 14, '2026-09-01',    NULL,    35.00),   -- Water
(@C108, 14, '2026-10-01',    NULL,    35.00),   -- Water
(@C108, 14, '2026-11-01',    NULL,    35.00),   -- Water
(@C108, 19, '2026-09-01',    NULL,  1250.00),   -- Mortgage
(@C108, 19, '2026-10-01',    NULL,  1250.00),   -- Mortgage
(@C108, 19, '2026-11-01',    NULL,  1250.00),   -- Mortgage
(@C108, 15, '2026-09-01',   20.00,     NULL),   -- Clothing
(@C108, 15, '2026-10-01',   20.00,     NULL),   -- Clothing
(@C108, 15, '2026-11-01',   25.00,     NULL);   -- Clothing

-- Weekly rows (weeks 1-4)
INSERT INTO dbo.Spending (CustomerId, CategoryId, SpendMonth, WeekNumber, AmountGBP)
SELECT p.CustomerId, p.CategoryId, p.SpendMonth, w.WeekNumber,
       CAST(p.WeeklyGBP * w.WeekFactor AS DECIMAL(10,2))
FROM @Plan p
CROSS JOIN (VALUES (1, 1.05), (2, 0.95), (3, 1.00), (4, 1.00)) AS w(WeekNumber, WeekFactor)
WHERE p.WeeklyGBP IS NOT NULL;

-- Monthly bills and one-off purchases (WeekNumber NULL)
INSERT INTO dbo.Spending (CustomerId, CategoryId, SpendMonth, WeekNumber, AmountGBP)
SELECT p.CustomerId, p.CategoryId, p.SpendMonth, NULL, p.MonthlyGBP
FROM @Plan p
WHERE p.MonthlyGBP IS NOT NULL;

SELECT COUNT(*) AS SampleRowsLoaded
FROM dbo.Spending
WHERE CustomerId IN (@C101, @C102, @C103, @C104, @C105, @C106, @C107, @C108);   -- expect 476
GO
