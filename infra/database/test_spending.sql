/* =====================================================================
   infra/database/test_spending.sql   (T-SQL) - OPTIONAL, for testing only
   Loads src/test-data/sample_customer_spending.csv (v1, customers 1-3)
   (wide -> long format; values unchanged) into Spending.
   v2 and v3 are kept OUT of the database so they can be used to test
   the upload endpoints.
   Like the app, YOU choose the month: change @SpendMonth below
   (must be the 1st of a month). Run after schema.sql and seed.sql.
   SYNTHETIC / TEST DATA ONLY - no real customer information.
   ===================================================================== */

SET NOCOUNT ON;   -- avoids 'rows affected' messages that can stop Python drivers mid-batch

DECLARE @SpendMonth DATE = '2026-10-01';   -- <-- pick any month

DELETE FROM dbo.Spending WHERE SpendMonth = @SpendMonth;   -- re-runnable

INSERT INTO dbo.Spending (CustomerId, CategoryId, SpendMonth, WeekNumber, AmountGBP) VALUES
(1, 1, @SpendMonth, 1, 120.00),
(1, 2, @SpendMonth, 1, 180.00),
(1, 3, @SpendMonth, 1, 95.00),
(1, 1, @SpendMonth, 2, 95.00),
(1, 2, @SpendMonth, 2, 160.00),
(1, 3, @SpendMonth, 2, 90.00),
(1, 1, @SpendMonth, 3, 80.00),
(1, 2, @SpendMonth, 3, 150.00),
(1, 3, @SpendMonth, 3, 85.00),
(2, 1, @SpendMonth, 1, 200.00),
(2, 2, @SpendMonth, 1, 140.00),
(2, 3, @SpendMonth, 1, 110.00),
(2, 1, @SpendMonth, 2, 180.00),
(2, 2, @SpendMonth, 2, 130.00),
(2, 3, @SpendMonth, 2, 105.00),
(2, 1, @SpendMonth, 3, 170.00),
(2, 2, @SpendMonth, 3, 120.00),
(2, 3, @SpendMonth, 3, 100.00),
(3, 1, @SpendMonth, 1, 60.00),
(3, 2, @SpendMonth, 1, 220.00),
(3, 3, @SpendMonth, 1, 130.00),
(3, 1, @SpendMonth, 2, 55.00),
(3, 2, @SpendMonth, 2, 200.00),
(3, 3, @SpendMonth, 2, 125.00),
(3, 1, @SpendMonth, 3, 50.00),
(3, 2, @SpendMonth, 3, 180.00),
(3, 3, @SpendMonth, 3, 120.00);

SELECT COUNT(*) AS SpendingRowsLoaded FROM dbo.Spending WHERE SpendMonth = @SpendMonth;  -- expect 27 (3 customers x 3 weeks x 3 categories)
GO
