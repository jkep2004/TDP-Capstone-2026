/* =====================================================================
   infra/database/seed.sql   (T-SQL)  - run after schema.sql
   Reference data only (categories, emission factors, assumptions,
   customers, recommendation rules). Spending is NOT seeded here:
   in the app the user selects the month and uploads/enters spending.
   For testing without the app, run test_spending.sql.
   SYNTHETIC / TEST DATA ONLY - no real customer information.
   ===================================================================== */

SET NOCOUNT ON;   -- avoids 'rows affected' messages that can stop Python drivers mid-batch

SET IDENTITY_INSERT dbo.Categories ON;
INSERT INTO dbo.Categories (CategoryId, Name, Description) VALUES
(1, N'Travel',    N'Car fuel, commuting, public transport, flights'),
(2, N'Food',      N'Groceries, takeaways, eating out'),
(3, N'Utilities', N'Electricity, gas, heating, water');
SET IDENTITY_INSERT dbo.Categories OFF;
GO

/* Emission factors (kgCO2e per GBP, including VAT).
   OFFICIAL SOURCE: UK Government (Defra / University of Leeds),
   "UK and England's carbon footprint to 2023" - Spend-based emissions multipliers,
   sheet COICOP_multipliers_2023 (published 30 June 2026, Open Government Licence 3.0).
   COICOP = household spending classification, so it suits customer spending.
   Category mapping (team decision, see docs/data.md):
     Travel    = COICOP 7.2.2  Fuels and lubricants for personal transport equipment  2.7747
     Food      = COICOP 11.1.1 Restaurants, cafes and the like                         0.6797
     Utilities = average of COICOP 4.5.1 Electricity (1.0317) and 4.5.2 Gas (3.0773)  2.0545 */
INSERT INTO dbo.EmissionsFactors (CategoryId, KgCO2ePerGBP, Unit, Source, Version, EffectiveDate) VALUES
(1, 2.7747, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 7.2.2 Fuels for personal transport', N'2023', '2026-06-30'),
(2, 0.6797, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 11.1.1 Restaurants, cafes', N'2023', '2026-06-30'),
(3, 2.0545, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, avg of COICOP 4.5.1 Electricity and 4.5.2 Gas', N'2023', '2026-06-30');
GO

INSERT INTO dbo.Assumptions (Name, CategoryId, Value, Unit, Description, Source) VALUES
(N'WeeksPerMonth',       NULL, 4.3333, N'weeks', N'Monthly spend = manual monthly total, else average weekly spend x 52/12', N'Team decision (weekly data, monthly thresholds)'),
(N'TravelThreshold',     1,  300.0000, N'GBP/month', N'Monthly travel spend above this triggers recommendations',    N'Appendix A'),
(N'FoodThreshold',       2,  250.0000, N'GBP/month', N'Monthly food spend above this triggers recommendations',      N'Appendix A'),
(N'UtilitiesThreshold',  3,  150.0000, N'GBP/month', N'Monthly utilities spend above this triggers recommendations', N'Appendix A'),
(N'TravelReductionPct',    1, 0.1400, N'fraction',  N'ProjectedSavings = SpendAmount x ReductionPercentage (avg of Appendix B travel examples: 80/520, 60/450)', N'Derived from Appendix B'),
(N'FoodReductionPct',      2, 0.1400, N'fraction',  N'ProjectedSavings = SpendAmount x ReductionPercentage (avg of Appendix B food examples: 45/320, 90/650)', N'Derived from Appendix B'),
(N'UtilitiesReductionPct', 3, 0.1900, N'fraction',  N'ProjectedSavings = SpendAmount x ReductionPercentage (avg of Appendix B utilities examples: 30/180, 55/260)', N'Derived from Appendix B'),
(N'CarbonModel',         NULL, 1.0000, N'n/a',       N'CarbonImpact = SpendAmount x EmissionFactor', N'Appendix B');
GO

INSERT INTO dbo.Customers (CustomerId, PersonaType, DataSource) VALUES
(1, NULL, N'test-data v3'),
(2, NULL, N'test-data v3'),
(3, NULL, N'test-data v3'),
(4, N'High Commuter (Heathrow)', N'test-data v3');
GO

INSERT INTO dbo.RecommendationRules (CategoryId, MonthlyThresholdGBP, RecommendationText, ReductionPercentage) VALUES
(1, 300.00, N'Reduce solo car journeys, car share or switch some commutes to public transport', 0.1400),
(2, 250.00, N'Reduce takeaway meals, meal prep and batch cook', 0.1400),
(3, 150.00, N'Reduce heating by 1C, switch off unused devices and optimise appliance use', 0.1900);
GO
