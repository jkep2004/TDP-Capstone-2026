/* =====================================================================
   infra/database/seed.sql   (T-SQL)  - run after schema.sql
   Reference data only (categories, emission factors, assumptions,
   customers, recommendation rules). Spending is NOT seeded here:
   in the app the user selects the month and uploads/enters spending.
   For testing without the app, run test_spending.sql.
   SYNTHETIC / TEST DATA ONLY - no real customer information.
   ===================================================================== */

SET NOCOUNT ON;   -- avoids 'rows affected' messages that can stop Python drivers mid-batch

/* Main categories first (sub-categories point to them).
   IDs 1-3 stay the same, so test_spending.sql still works.
   Main categories follow the areas used by bank carbon trackers
   (NatWest/Cogo: transport, groceries, bills, shopping).
   Only Mortgage is not counted for carbon (IsCarbonTracked = 0):
   it is a loan repayment, like a transfer, not a purchase. */
SET IDENTITY_INSERT dbo.Categories ON;
INSERT INTO dbo.Categories (CategoryId, Name, Description, ParentCategoryId, IsCarbonTracked) VALUES
(1, N'Travel',    N'Car fuel, commuting, public transport, flights', NULL, 1),
(2, N'Food',      N'Groceries, takeaways, eating out',               NULL, 1),
(3, N'Utilities', N'Electricity, gas, heating, water',               NULL, 1),
(4, N'Shopping',  N'Clothing, electronics, furniture and appliances', NULL, 1),
(5, N'Housing',   N'Rent and mortgage payments',                     NULL, 1),
(6, N'Other',     N'Spending that does not fit any category',        NULL, 1);

/* Sub-categories. Spending can also be saved against the main category
   when the sub-category is unknown. */
INSERT INTO dbo.Categories (CategoryId, Name, Description, ParentCategoryId, IsCarbonTracked) VALUES
(7,  N'Fuel',                     N'Petrol and diesel',                 1, 1),
(8,  N'Public transport',         N'Bus, coach, train, tube',           1, 1),
(9,  N'Flights',                  N'Air travel',                        1, 1),
(10, N'Groceries',                N'Supermarket food shopping',         2, 1),
(11, N'Eating out',               N'Restaurants, cafes, takeaways',     2, 1),
(12, N'Electricity',              N'Electricity bills',                 3, 1),
(13, N'Gas',                      N'Gas bills',                         3, 1),
(14, N'Water',                    N'Water bills',                       3, 1),
(15, N'Clothing',                 N'Clothes',                           4, 1),
(16, N'Electronics',              N'Phones, computers, TVs and audio',  4, 1),
(17, N'Furniture and appliances', N'Furniture and household appliances', 4, 1),
(18, N'Rent',                     N'Rent paid to a landlord',           5, 1),
(19, N'Mortgage',                 N'Mortgage repayments (no carbon counted)', 5, 0);
SET IDENTITY_INSERT dbo.Categories OFF;
GO

/* Emission factors (kgCO2e per GBP, including VAT).
   OFFICIAL SOURCE: UK Government (Defra / University of Leeds),
   "UK and England's carbon footprint to 2023" - Spend-based emissions multipliers,
   sheet COICOP_multipliers_2023 (published 30 June 2026, Open Government Licence 3.0).
   COICOP = household spending classification, so it suits customer spending.
   Main category mapping (team decision, see docs/data.md):
     Travel    = COICOP 7.2.2  Fuels and lubricants for personal transport equipment  2.7747
     Food      = COICOP 11.1.1 Restaurants, cafes and the like                         0.6797
     Utilities = average of COICOP 4.5.1 Electricity (1.0317) and 4.5.2 Gas (3.0773)  2.0545
   Every carbon-tracked category has its own factor from the same sheet.
   "avg" = simple (unweighted) average of the listed COICOP codes; the sheet
   has no spending weights, so this is an approximation (see docs/data.md).
   Main category factors are used when the user only gives the main category. */
INSERT INTO dbo.EmissionsFactors (CategoryId, KgCO2ePerGBP, Unit, Source, Version, EffectiveDate) VALUES
-- Main categories
(1,  2.7747, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 7.2.2 Fuels for personal transport', N'2023', '2026-06-30'),
(2,  0.6797, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 11.1.1 Restaurants, cafes', N'2023', '2026-06-30'),
(3,  2.0545, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, avg of COICOP 4.5.1 Electricity and 4.5.2 Gas', N'2023', '2026-06-30'),
(4,  1.0227, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, avg of the Clothing, Electronics and Furniture/appliances factors below', N'2023', '2026-06-30'),
(5,  0.0688, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 4.1.1 Actual rentals paid by tenants', N'2023', '2026-06-30'),
(6,  0.3598, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 12.7.1 Other services n.e.c.', N'2023', '2026-06-30'),
-- Sub-categories
(7,  2.7747, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 7.2.2 Fuels for personal transport', N'2023', '2026-06-30'),
(8,  1.9424, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 7.3.1_2 Passenger transport by railway and road', N'2023', '2026-06-30'),
(9,  0.4773, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 7.3.3 Passenger transport by air', N'2023', '2026-06-30'),
(10, 0.5090, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, avg of COICOP 1.1.1-1.1.9 Food', N'2023', '2026-06-30'),
(11, 0.6797, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 11.1.1 Restaurants, cafes', N'2023', '2026-06-30'),
(12, 1.0317, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 4.5.1 Electricity', N'2023', '2026-06-30'),
(13, 3.0773, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 4.5.2 Gas', N'2023', '2026-06-30'),
(14, 0.1975, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 4.4.1 Water supply', N'2023', '2026-06-30'),
(15, 0.3535, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 3.1.2 Garments', N'2023', '2026-06-30'),
(16, 1.6950, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, avg of COICOP 8.2.1 Telephone equipment, 9.1.1 Audio-visual, 9.1.3 Information processing', N'2023', '2026-06-30'),
(17, 1.0197, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, avg of COICOP 5.1.1 Furniture and 5.3.1 Major household appliances', N'2023', '2026-06-30'),
(18, 0.0688, N'kgCO2e per GBP incl VAT', N'UK Gov carbon footprint to 2023, spend-based multipliers, COICOP 4.1.1 Actual rentals paid by tenants', N'2023', '2026-06-30');
GO

INSERT INTO dbo.Assumptions (Name, CategoryId, Value, Unit, Description, Source) VALUES
(N'WeeksPerMonth',       NULL, 4.3333, N'weeks', N'Monthly spend = manual monthly total, else average weekly spend x 52/12', N'Team decision (weekly data, monthly thresholds)'),
(N'TravelThreshold',     1,  300.0000, N'GBP/month', N'Monthly travel spend above this triggers recommendations',    N'Appendix A'),
(N'FoodThreshold',       2,  250.0000, N'GBP/month', N'Monthly food spend above this triggers recommendations',      N'Appendix A'),
(N'UtilitiesThreshold',  3,  150.0000, N'GBP/month', N'Monthly utilities spend above this triggers recommendations', N'Appendix A'),
(N'ShoppingThreshold',   4,  250.0000, N'GBP/month', N'Monthly shopping spend above this triggers recommendations. Roughly the UK average: household goods and services c.GBP 40.60/week plus clothing and footwear c.GBP 17-22/week, x 4.33 = c.GBP 250-270/month, rounded down', N'ONS Family spending in the UK FYE 2025, rounded down'),
(N'ShoppingReductionPct',  4, 0.1600, N'fraction',  N'ProjectedSavings = SpendAmount x ReductionPercentage (no Appendix B example for shopping; average of the travel, food and utilities percentages)', N'Derived from Appendix B'),
(N'TravelReductionPct',    1, 0.1400, N'fraction',  N'ProjectedSavings = SpendAmount x ReductionPercentage (avg of Appendix B travel examples: 80/520, 60/450)', N'Derived from Appendix B'),
(N'FoodReductionPct',      2, 0.1400, N'fraction',  N'ProjectedSavings = SpendAmount x ReductionPercentage (avg of Appendix B food examples: 45/320, 90/650)', N'Derived from Appendix B'),
(N'UtilitiesReductionPct', 3, 0.1900, N'fraction',  N'ProjectedSavings = SpendAmount x ReductionPercentage (avg of Appendix B utilities examples: 30/180, 55/260)', N'Derived from Appendix B'),
(N'CarbonModel',         NULL, 1.0000, N'n/a',       N'CarbonImpact = SpendAmount x EmissionFactor', N'Appendix B'),
(N'SubCategoryRollUp',   NULL, 1.0000, N'n/a',       N'Sub-category spend is added to its main category for thresholds; a sub-category with no factor uses its main category factor', N'See docs/data.md');
GO

INSERT INTO dbo.Customers (CustomerId, PersonaType, DataSource) VALUES
(1, NULL, N'test-data (v1-v3)'),
(2, NULL, N'test-data (v1-v3)'),
(3, NULL, N'test-data (v1-v3)'),
(4, N'High Commuter (Heathrow)', N'test-data v3');   -- kept so v3 uploads can be tested
GO

/* Rules are on MAIN categories only.
   Travel/Food/Utilities from Appendix A/B; Shopping from ONS household spending (see Assumptions).
   Housing and Other have no rule: there is no useful generic advice for them. */
INSERT INTO dbo.RecommendationRules (CategoryId, MonthlyThresholdGBP, RecommendationText, ReductionPercentage) VALUES
(1, 300.00, N'Reduce solo car journeys, car share or switch some commutes to public transport', 0.1400),
(2, 250.00, N'Reduce takeaway meals, meal prep and batch cook', 0.1400),
(3, 150.00, N'Reduce heating by 1C, switch off unused devices and optimise appliance use', 0.1900),
(4, 250.00, N'Buy second-hand, repair before replacing and keep phones and electronics for longer', 0.1600);
GO
