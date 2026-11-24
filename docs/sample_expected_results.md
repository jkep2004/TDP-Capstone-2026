# Sample data: expected results

Expected output for `infra/database/sample_spending.sql`: 8 made-up customers, September to November 2026. Use it to check the views and as the expected values in API tests.

How the numbers are worked out: monthly spend = weekly average × 4.3333, or the monthly bill. Carbon = spend × the sub-category's factor, added up to the main category. Savings = monthly spend × reduction %, only when spend is over the threshold. UK average = 631 kg per person per month (see `data.md`).

## Customers

| Customer | ID | Persona | Spending pattern |
|---|---|---|---|
| C101 | `...101` | Car commuter | Drives to work; cuts back on driving each month; gas rises in winter |
| C102 | `...102` | Family | Buses and trains; mortgage (spend but no carbon); Black Friday electronics in November |
| C103 | `...103` | City renter who flies | Eats out a lot; flights in September and November; furniture in September |
| C104 | `...104` | Student | Low spend; public transport; laptop in October |
| C105 | `...105` | Retired homeowner | Home all day: high gas and electricity; little travel; no rent or mortgage |
| C106 | `...106` | Remote worker | Hardly travels; home office bills; new computer in September |
| C107 | `...107` | Green switcher | Swaps the car for the train over three months; eats out less |
| C108 | `...108` | Long-distance commuter | Drives a long way every day; travel well above the threshold |

IDs are `00000000-0000-0000-0000-000000000101` to `...108`.

## Monthly footprint (`vw_CustomerMonthlyFootprint`)

| Customer | Month | Spend (£) | Carbon (kg) | kg per £ | Change (kg) | Change (%) | vs UK average (%) |
|---|---|---|---|---|---|---|---|
| C101 | Sep | 2253.32 | 1739.57 | 0.7720 | - | - | +175.7 |
| C101 | Oct | 2223.99 | 1689.51 | 0.7597 | -50.06 | -2.9 | +167.8 |
| C101 | Nov | 2245.34 | 1691.42 | 0.7533 | 1.91 | 0.1 | +168.1 |
| C102 | Sep | 2149.99 | 1018.28 | 0.4736 | - | - | +61.4 |
| C102 | Oct | 2193.66 | 1122.20 | 0.5116 | 103.92 | 10.2 | +77.8 |
| C102 | Nov | 2989.65 | 2408.48 | 0.8056 | 1286.28 | 114.6 | +281.7 |
| C103 | Sep | 2461.67 | 1363.97 | 0.5541 | - | - | +116.2 |
| C103 | Oct | 1659.01 | 821.09 | 0.4949 | -542.88 | -39.8 | +30.1 |
| C103 | Nov | 2041.66 | 1052.53 | 0.5155 | 231.44 | 28.2 | +66.8 |
| C104 | Sep | 1043.67 | 438.82 | 0.4205 | - | - | -30.5 |
| C104 | Oct | 1363.34 | 980.92 | 0.7195 | 542.10 | 123.5 | +55.5 |
| C104 | Nov | 1088.00 | 512.92 | 0.4714 | -468.00 | -47.7 | -18.7 |
| C105 | Sep | 833.66 | 1038.98 | 1.2463 | - | - | +64.7 |
| C105 | Oct | 878.66 | 1167.23 | 1.3284 | 128.25 | 12.3 | +85.0 |
| C105 | Nov | 972.66 | 1306.20 | 1.3429 | 138.97 | 11.9 | +107.0 |
| C106 | Sep | 2661.67 | 2280.96 | 0.8570 | - | - | +261.5 |
| C106 | Oct | 1791.67 | 837.55 | 0.4675 | -1443.41 | -63.3 | +32.7 |
| C106 | Nov | 1953.65 | 1042.32 | 0.5335 | 204.77 | 24.4 | +65.2 |
| C107 | Sep | 2008.33 | 1720.49 | 0.8567 | - | - | +172.7 |
| C107 | Oct | 1829.00 | 1334.48 | 0.7296 | -386.01 | -22.4 | +111.5 |
| C107 | Nov | 1687.32 | 967.07 | 0.5731 | -367.41 | -27.5 | +53.3 |
| C108 | Sep | 2580.00 | 2241.07 | 0.8686 | - | - | +255.2 |
| C108 | Oct | 2629.67 | 2381.23 | 0.9055 | 140.16 | 6.3 | +277.4 |
| C108 | Nov | 2748.32 | 2558.90 | 0.9311 | 177.67 | 7.5 | +305.5 |

## By category (`vw_CategoryInsights` and recommendations)

Rank 1 = most carbon that month. Change = against the customer's previous month with spend in that category.

| Customer | Month | Category | Spend (£) | Carbon (kg) | Spend share (%) | Carbon share (%) | Rank | Change (%) | Over threshold | Saving (£) | Carbon saved (kg) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C101 | Sep | Travel | 411.66 | 1142.23 | 18.3 | 65.7 | 1 | - | Yes | 57.63 | 159.91 |
| C101 | Sep | Utilities | 165.00 | 263.77 | 7.3 | 15.2 | 2 | - | Yes | 31.35 | 50.12 |
| C101 | Sep | Food | 411.66 | 228.03 | 18.3 | 13.1 | 3 | - | Yes | 57.63 | 31.92 |
| C101 | Sep | Housing | 1200.00 | 82.56 | 53.3 | 4.7 | 4 | - | No rule | - | - |
| C101 | Sep | Shopping | 65.00 | 22.98 | 2.9 | 1.3 | 5 | - | No | - | - |
| C101 | Oct | Travel | 368.33 | 1022.01 | 16.6 | 60.5 | 1 | -10.5 | Yes | 51.57 | 143.08 |
| C101 | Oct | Utilities | 192.00 | 342.77 | 8.6 | 20.3 | 2 | 30.0 | Yes | 36.48 | 65.13 |
| C101 | Oct | Food | 398.66 | 219.19 | 17.9 | 13.0 | 3 | -3.9 | Yes | 55.81 | 30.69 |
| C101 | Oct | Housing | 1200.00 | 82.56 | 54.0 | 4.9 | 4 | 0.0 | No rule | - | - |
| C101 | Oct | Shopping | 65.00 | 22.98 | 2.9 | 1.4 | 5 | 0.0 | No | - | - |
| C101 | Nov | Travel | 325.00 | 901.78 | 14.5 | 53.3 | 1 | -11.8 | Yes | 45.50 | 126.25 |
| C101 | Nov | Utilities | 235.00 | 458.72 | 10.5 | 27.1 | 2 | 33.8 | Yes | 44.65 | 87.16 |
| C101 | Nov | Food | 398.67 | 217.72 | 17.8 | 12.9 | 3 | -0.7 | Yes | 55.81 | 30.48 |
| C101 | Nov | Housing | 1200.00 | 82.56 | 53.4 | 4.9 | 4 | 0.0 | No rule | - | - |
| C101 | Nov | Shopping | 86.67 | 30.64 | 3.9 | 1.8 | 5 | 33.3 | No | - | - |
| C102 | Sep | Utilities | 205.00 | 341.78 | 9.5 | 33.6 | 1 | - | Yes | 38.95 | 64.94 |
| C102 | Sep | Travel | 173.33 | 336.68 | 8.1 | 33.1 | 2 | - | No | - | - |
| C102 | Sep | Food | 563.33 | 301.53 | 26.2 | 29.6 | 3 | - | Yes | 78.87 | 42.21 |
| C102 | Sep | Shopping | 108.33 | 38.29 | 5.0 | 3.8 | 4 | - | No | - | - |
| C102 | Sep | Housing | 1100.00 | no carbon | 51.2 | - | 5 | - | No rule | - | - |
| C102 | Oct | Utilities | 240.00 | 439.26 | 10.9 | 39.1 | 1 | 28.5 | Yes | 45.60 | 83.46 |
| C102 | Oct | Travel | 173.33 | 336.68 | 7.9 | 30.0 | 2 | 0.0 | No | - | - |
| C102 | Oct | Food | 585.00 | 312.56 | 26.7 | 27.9 | 3 | 3.7 | Yes | 81.90 | 43.76 |
| C102 | Oct | Shopping | 95.33 | 33.70 | 4.3 | 3.0 | 4 | -12.0 | No | - | - |
| C102 | Oct | Housing | 1100.00 | no carbon | 50.1 | - | 5 | - | No rule | - | - |
| C102 | Nov | Shopping | 771.33 | 1144.64 | 25.8 | 47.5 | 1 | 3296.6 | Yes | 123.41 | 183.14 |
| C102 | Nov | Utilities | 295.00 | 577.82 | 9.9 | 24.0 | 2 | 31.5 | Yes | 56.05 | 109.79 |
| C102 | Nov | Food | 649.99 | 349.34 | 21.7 | 14.5 | 3 | 11.8 | Yes | 91.00 | 48.91 |
| C102 | Nov | Travel | 173.33 | 336.68 | 5.8 | 14.0 | 4 | 0.0 | No | - | - |
| C102 | Nov | Housing | 1100.00 | no carbon | 36.8 | - | 5 | - | No rule | - | - |
| C103 | Sep | Travel | 580.00 | 467.30 | 23.6 | 34.3 | 1 | - | Yes | 81.20 | 65.42 |
| C103 | Sep | Shopping | 400.00 | 407.88 | 16.2 | 29.9 | 2 | - | Yes | 64.00 | 65.26 |
| C103 | Sep | Food | 411.67 | 242.83 | 16.7 | 17.8 | 3 | - | Yes | 57.63 | 34.00 |
| C103 | Sep | Utilities | 120.00 | 180.60 | 4.9 | 13.2 | 4 | - | No | - | - |
| C103 | Sep | Housing | 950.00 | 65.36 | 38.6 | 4.8 | 5 | - | No rule | - | - |
| C103 | Oct | Travel | 138.67 | 269.35 | 8.4 | 32.8 | 1 | -42.4 | No | - | - |
| C103 | Oct | Food | 433.34 | 257.56 | 26.1 | 31.4 | 2 | 6.1 | Yes | 60.67 | 36.06 |
| C103 | Oct | Utilities | 137.00 | 228.82 | 8.3 | 27.9 | 3 | 26.7 | No | - | - |
| C103 | Oct | Housing | 950.00 | 65.36 | 57.3 | 8.0 | 4 | 0.0 | No rule | - | - |
| C103 | Nov | Travel | 450.00 | 405.25 | 22.0 | 38.5 | 1 | 50.5 | Yes | 63.00 | 56.74 |
| C103 | Nov | Utilities | 165.00 | 298.62 | 8.1 | 28.4 | 2 | 30.5 | Yes | 31.35 | 56.74 |
| C103 | Nov | Food | 476.66 | 283.30 | 23.3 | 26.9 | 3 | 10.0 | Yes | 66.73 | 39.66 |
| C103 | Nov | Housing | 950.00 | 65.36 | 46.5 | 6.2 | 4 | 0.0 | No rule | - | - |
| C104 | Sep | Food | 281.67 | 165.56 | 27.0 | 37.7 | 1 | - | Yes | 39.43 | 23.18 |
| C104 | Sep | Travel | 65.00 | 126.26 | 6.2 | 28.8 | 2 | - | No | - | - |
| C104 | Sep | Utilities | 45.00 | 87.34 | 4.3 | 19.9 | 3 | - | No | - | - |
| C104 | Sep | Housing | 600.00 | 41.28 | 57.5 | 9.4 | 4 | - | No rule | - | - |
| C104 | Sep | Shopping | 52.00 | 18.38 | 5.0 | 4.2 | 5 | - | No | - | - |
| C104 | Oct | Shopping | 352.00 | 526.88 | 25.8 | 53.7 | 1 | 2766.6 | Yes | 56.32 | 84.30 |
| C104 | Oct | Food | 290.34 | 171.45 | 21.3 | 17.5 | 2 | 3.6 | Yes | 40.65 | 24.00 |
| C104 | Oct | Travel | 65.00 | 126.26 | 4.8 | 12.9 | 3 | 0.0 | No | - | - |
| C104 | Oct | Utilities | 56.00 | 115.05 | 4.1 | 11.7 | 4 | 31.7 | No | - | - |
| C104 | Oct | Housing | 600.00 | 41.28 | 44.0 | 4.2 | 5 | 0.0 | No rule | - | - |
| C104 | Nov | Food | 286.00 | 166.29 | 26.3 | 32.4 | 1 | -3.0 | Yes | 40.04 | 23.28 |
| C104 | Nov | Utilities | 72.00 | 156.11 | 6.6 | 30.4 | 2 | 35.7 | No | - | - |
| C104 | Nov | Travel | 65.00 | 126.26 | 6.0 | 24.6 | 3 | 0.0 | No | - | - |
| C104 | Nov | Housing | 600.00 | 41.28 | 55.1 | 8.0 | 4 | 0.0 | No rule | - | - |
| C104 | Nov | Shopping | 65.00 | 22.98 | 6.0 | 4.5 | 5 | -95.6 | No | - | - |
| C105 | Sep | Utilities | 240.00 | 439.26 | 28.8 | 42.3 | 1 | - | Yes | 45.60 | 83.46 |
| C105 | Sep | Travel | 130.00 | 360.71 | 15.6 | 34.7 | 2 | - | No | - | - |
| C105 | Sep | Food | 411.66 | 220.63 | 49.4 | 21.2 | 3 | - | Yes | 57.63 | 30.89 |
| C105 | Sep | Shopping | 52.00 | 18.38 | 6.2 | 1.8 | 4 | - | No | - | - |
| C105 | Oct | Utilities | 285.00 | 567.51 | 32.4 | 48.6 | 1 | 29.2 | Yes | 54.15 | 107.83 |
| C105 | Oct | Travel | 130.00 | 360.71 | 14.8 | 30.9 | 2 | 0.0 | No | - | - |
| C105 | Oct | Food | 411.66 | 220.63 | 46.9 | 18.9 | 3 | 0.0 | Yes | 57.63 | 30.89 |
| C105 | Oct | Shopping | 52.00 | 18.38 | 5.9 | 1.6 | 4 | 0.0 | No | - | - |
| C105 | Nov | Utilities | 340.00 | 706.07 | 35.0 | 54.1 | 1 | 24.4 | Yes | 64.60 | 134.15 |
| C105 | Nov | Travel | 121.33 | 336.65 | 12.5 | 25.8 | 2 | -6.7 | No | - | - |
| C105 | Nov | Food | 446.33 | 240.50 | 45.9 | 18.4 | 3 | 9.0 | Yes | 62.49 | 33.67 |
| C105 | Nov | Shopping | 65.00 | 22.98 | 6.7 | 1.8 | 4 | 25.0 | No | - | - |
| C106 | Sep | Shopping | 943.33 | 1540.82 | 35.4 | 67.6 | 1 | - | Yes | 150.93 | 246.53 |
| C106 | Sep | Utilities | 185.00 | 304.86 | 7.0 | 13.4 | 2 | - | Yes | 35.15 | 57.92 |
| C106 | Sep | Food | 346.67 | 191.25 | 13.0 | 8.4 | 3 | - | Yes | 48.53 | 26.78 |
| C106 | Sep | Travel | 86.67 | 168.35 | 3.3 | 7.4 | 4 | - | No | - | - |
| C106 | Sep | Housing | 1100.00 | 75.68 | 41.3 | 3.3 | 5 | - | No rule | - | - |
| C106 | Oct | Utilities | 215.00 | 386.95 | 12.0 | 46.2 | 1 | 26.9 | Yes | 40.85 | 73.52 |
| C106 | Oct | Food | 346.67 | 191.25 | 19.3 | 22.8 | 2 | 0.0 | Yes | 48.53 | 26.78 |
| C106 | Oct | Travel | 86.67 | 168.35 | 4.8 | 20.1 | 3 | 0.0 | No | - | - |
| C106 | Oct | Housing | 1100.00 | 75.68 | 61.4 | 9.0 | 4 | 0.0 | No rule | - | - |
| C106 | Oct | Shopping | 43.33 | 15.32 | 2.4 | 1.8 | 5 | -99.0 | No | - | - |
| C106 | Nov | Utilities | 260.00 | 504.97 | 13.3 | 48.4 | 1 | 30.5 | Yes | 49.40 | 95.94 |
| C106 | Nov | Food | 454.99 | 261.18 | 23.3 | 25.1 | 2 | 36.6 | Yes | 63.70 | 36.57 |
| C106 | Nov | Travel | 95.33 | 185.17 | 4.9 | 17.8 | 3 | 10.0 | No | - | - |
| C106 | Nov | Housing | 1100.00 | 75.68 | 56.3 | 7.3 | 4 | 0.0 | No rule | - | - |
| C106 | Nov | Shopping | 43.33 | 15.32 | 2.2 | 1.5 | 5 | 0.0 | No | - | - |
| C107 | Sep | Travel | 411.66 | 1088.13 | 20.5 | 63.2 | 1 | - | Yes | 57.63 | 152.34 |
| C107 | Sep | Food | 476.67 | 279.61 | 23.7 | 16.3 | 2 | - | Yes | 66.73 | 39.15 |
| C107 | Sep | Utilities | 155.00 | 267.85 | 7.7 | 15.6 | 3 | - | Yes | 29.45 | 50.89 |
| C107 | Sep | Housing | 900.00 | 61.92 | 44.8 | 3.6 | 4 | - | No rule | - | - |
| C107 | Sep | Shopping | 65.00 | 22.98 | 3.2 | 1.3 | 5 | - | No | - | - |
| C107 | Oct | Travel | 303.33 | 733.45 | 16.6 | 55.0 | 1 | -32.6 | Yes | 42.47 | 102.68 |
| C107 | Oct | Utilities | 162.00 | 285.30 | 8.9 | 21.4 | 2 | 6.5 | Yes | 30.78 | 54.21 |
| C107 | Oct | Food | 411.67 | 235.43 | 22.5 | 17.6 | 3 | -15.8 | Yes | 57.63 | 32.96 |
| C107 | Oct | Housing | 900.00 | 61.92 | 49.2 | 4.6 | 4 | 0.0 | No rule | - | - |
| C107 | Oct | Shopping | 52.00 | 18.38 | 2.8 | 1.4 | 5 | -20.0 | No | - | - |
| C107 | Nov | Utilities | 185.00 | 339.71 | 11.0 | 35.1 | 1 | 19.1 | Yes | 35.15 | 64.54 |
| C107 | Nov | Travel | 173.33 | 336.68 | 10.3 | 34.8 | 2 | -54.1 | No | - | - |
| C107 | Nov | Food | 376.99 | 210.38 | 22.3 | 21.8 | 3 | -10.6 | Yes | 52.78 | 29.45 |
| C107 | Nov | Housing | 900.00 | 61.92 | 53.3 | 6.4 | 4 | 0.0 | No rule | - | - |
| C107 | Nov | Shopping | 52.00 | 18.38 | 3.1 | 1.9 | 5 | 0.0 | No | - | - |
| C108 | Sep | Travel | 606.66 | 1683.30 | 23.5 | 75.1 | 1 | - | Yes | 84.93 | 235.66 |
| C108 | Sep | Food | 476.67 | 268.52 | 18.5 | 12.0 | 2 | - | Yes | 66.73 | 37.59 |
| C108 | Sep | Utilities | 160.00 | 258.61 | 6.2 | 11.5 | 3 | - | Yes | 30.40 | 49.14 |
| C108 | Sep | Shopping | 86.67 | 30.64 | 3.4 | 1.4 | 4 | - | No | - | - |
| C108 | Sep | Housing | 1250.00 | no carbon | 48.4 | - | 5 | - | No rule | - | - |
| C108 | Oct | Travel | 628.33 | 1743.43 | 23.9 | 73.2 | 1 | 3.6 | Yes | 87.97 | 244.08 |
| C108 | Oct | Utilities | 188.00 | 338.64 | 7.1 | 14.2 | 2 | 30.9 | Yes | 35.72 | 64.34 |
| C108 | Oct | Food | 476.67 | 268.52 | 18.1 | 11.3 | 3 | 0.0 | Yes | 66.73 | 37.59 |
| C108 | Oct | Shopping | 86.67 | 30.64 | 3.3 | 1.3 | 4 | 0.0 | No | - | - |
| C108 | Oct | Housing | 1250.00 | no carbon | 47.5 | - | 5 | - | No rule | - | - |
| C108 | Nov | Travel | 650.00 | 1803.56 | 23.7 | 70.5 | 1 | 3.4 | Yes | 91.00 | 252.50 |
| C108 | Nov | Utilities | 220.00 | 422.79 | 8.0 | 16.5 | 2 | 24.8 | Yes | 41.80 | 80.33 |
| C108 | Nov | Food | 519.99 | 294.26 | 18.9 | 11.5 | 3 | 9.6 | Yes | 72.80 | 41.20 |
| C108 | Nov | Shopping | 108.33 | 38.29 | 3.9 | 1.5 | 4 | 25.0 | No | - | - |
| C108 | Nov | Housing | 1250.00 | no carbon | 45.5 | - | 5 | - | No rule | - | - |

## Recommendations (`vw_Recommendations`)

One row per main category over its threshold. Saving = monthly spend × reduction %; carbon saved = monthly carbon × reduction %. Focus = the sub-category with the most carbon in that main category. Priority 1 = most carbon saved that month.

| Customer | Month | Priority | Category | Spend (£) | Over threshold by (£) | Focus | Lower-carbon alternative | Saving (£) | Carbon saved (kg) |
|---|---|---|---|---|---|---|---|---|---|
| C101 | Sep | 1 | Travel | 411.66 | 111.66 | Fuel | Car share, bus or train | 57.63 | 159.91 |
| C101 | Sep | 2 | Utilities | 165.00 | 15.00 | Gas | Turn the heating down 1C | 31.35 | 50.12 |
| C101 | Sep | 3 | Food | 411.66 | 161.66 | Groceries | Plan meals and waste less food | 57.63 | 31.92 |
| C101 | Oct | 1 | Travel | 368.33 | 68.33 | Fuel | Car share, bus or train | 51.57 | 143.08 |
| C101 | Oct | 2 | Utilities | 192.00 | 42.00 | Gas | Turn the heating down 1C | 36.48 | 65.13 |
| C101 | Oct | 3 | Food | 398.66 | 148.66 | Groceries | Plan meals and waste less food | 55.81 | 30.69 |
| C101 | Nov | 1 | Travel | 325.00 | 25.00 | Fuel | Car share, bus or train | 45.50 | 126.25 |
| C101 | Nov | 2 | Utilities | 235.00 | 85.00 | Gas | Turn the heating down 1C | 44.65 | 87.16 |
| C101 | Nov | 3 | Food | 398.67 | 148.67 | Groceries | Plan meals and waste less food | 55.81 | 30.48 |
| C102 | Sep | 1 | Utilities | 205.00 | 55.00 | Gas | Turn the heating down 1C | 38.95 | 64.94 |
| C102 | Sep | 2 | Food | 563.33 | 313.33 | Groceries | Plan meals and waste less food | 78.87 | 42.21 |
| C102 | Oct | 1 | Utilities | 240.00 | 90.00 | Gas | Turn the heating down 1C | 45.60 | 83.46 |
| C102 | Oct | 2 | Food | 585.00 | 335.00 | Groceries | Plan meals and waste less food | 81.90 | 43.76 |
| C102 | Nov | 1 | Shopping | 771.33 | 521.33 | Electronics | Refurbished devices | 123.41 | 183.14 |
| C102 | Nov | 2 | Utilities | 295.00 | 145.00 | Gas | Turn the heating down 1C | 56.05 | 109.79 |
| C102 | Nov | 3 | Food | 649.99 | 399.99 | Groceries | Plan meals and waste less food | 91.00 | 48.91 |
| C103 | Sep | 1 | Travel | 580.00 | 280.00 | Public transport | Off-peak and season tickets | 81.20 | 65.42 |
| C103 | Sep | 2 | Shopping | 400.00 | 150.00 | Furniture and appliances | Second-hand or repaired furniture | 64.00 | 65.26 |
| C103 | Sep | 3 | Food | 411.67 | 161.67 | Eating out | Cook at home | 57.63 | 34.00 |
| C103 | Oct | 1 | Food | 433.34 | 183.34 | Eating out | Cook at home | 60.67 | 36.06 |
| C103 | Nov | 1 | Utilities | 165.00 | 15.00 | Gas | Turn the heating down 1C | 31.35 | 56.74 |
| C103 | Nov | 2 | Travel | 450.00 | 150.00 | Public transport | Off-peak and season tickets | 63.00 | 56.74 |
| C103 | Nov | 3 | Food | 476.66 | 226.66 | Eating out | Cook at home | 66.73 | 39.66 |
| C104 | Sep | 1 | Food | 281.67 | 31.67 | Eating out | Cook at home | 39.43 | 23.18 |
| C104 | Oct | 1 | Shopping | 352.00 | 102.00 | Electronics | Refurbished devices | 56.32 | 84.30 |
| C104 | Oct | 2 | Food | 290.34 | 40.34 | Eating out | Cook at home | 40.65 | 24.00 |
| C104 | Nov | 1 | Food | 286.00 | 36.00 | Groceries | Plan meals and waste less food | 40.04 | 23.28 |
| C105 | Sep | 1 | Utilities | 240.00 | 90.00 | Gas | Turn the heating down 1C | 45.60 | 83.46 |
| C105 | Sep | 2 | Food | 411.66 | 161.66 | Groceries | Plan meals and waste less food | 57.63 | 30.89 |
| C105 | Oct | 1 | Utilities | 285.00 | 135.00 | Gas | Turn the heating down 1C | 54.15 | 107.83 |
| C105 | Oct | 2 | Food | 411.66 | 161.66 | Groceries | Plan meals and waste less food | 57.63 | 30.89 |
| C105 | Nov | 1 | Utilities | 340.00 | 190.00 | Gas | Turn the heating down 1C | 64.60 | 134.15 |
| C105 | Nov | 2 | Food | 446.33 | 196.33 | Groceries | Plan meals and waste less food | 62.49 | 33.67 |
| C106 | Sep | 1 | Shopping | 943.33 | 693.33 | Electronics | Refurbished devices | 150.93 | 246.53 |
| C106 | Sep | 2 | Utilities | 185.00 | 35.00 | Gas | Turn the heating down 1C | 35.15 | 57.92 |
| C106 | Sep | 3 | Food | 346.67 | 96.67 | Groceries | Plan meals and waste less food | 48.53 | 26.78 |
| C106 | Oct | 1 | Utilities | 215.00 | 65.00 | Gas | Turn the heating down 1C | 40.85 | 73.52 |
| C106 | Oct | 2 | Food | 346.67 | 96.67 | Groceries | Plan meals and waste less food | 48.53 | 26.78 |
| C106 | Nov | 1 | Utilities | 260.00 | 110.00 | Gas | Turn the heating down 1C | 49.40 | 95.94 |
| C106 | Nov | 2 | Food | 454.99 | 204.99 | Groceries | Plan meals and waste less food | 63.70 | 36.57 |
| C107 | Sep | 1 | Travel | 411.66 | 111.66 | Fuel | Car share, bus or train | 57.63 | 152.34 |
| C107 | Sep | 2 | Utilities | 155.00 | 5.00 | Gas | Turn the heating down 1C | 29.45 | 50.89 |
| C107 | Sep | 3 | Food | 476.67 | 226.67 | Eating out | Cook at home | 66.73 | 39.15 |
| C107 | Oct | 1 | Travel | 303.33 | 3.33 | Fuel | Car share, bus or train | 42.47 | 102.68 |
| C107 | Oct | 2 | Utilities | 162.00 | 12.00 | Gas | Turn the heating down 1C | 30.78 | 54.21 |
| C107 | Oct | 3 | Food | 411.67 | 161.67 | Groceries | Plan meals and waste less food | 57.63 | 32.96 |
| C107 | Nov | 1 | Utilities | 185.00 | 35.00 | Gas | Turn the heating down 1C | 35.15 | 64.54 |
| C107 | Nov | 2 | Food | 376.99 | 126.99 | Groceries | Plan meals and waste less food | 52.78 | 29.45 |
| C108 | Sep | 1 | Travel | 606.66 | 306.66 | Fuel | Car share, bus or train | 84.93 | 235.66 |
| C108 | Sep | 2 | Utilities | 160.00 | 10.00 | Gas | Turn the heating down 1C | 30.40 | 49.14 |
| C108 | Sep | 3 | Food | 476.67 | 226.67 | Groceries | Plan meals and waste less food | 66.73 | 37.59 |
| C108 | Oct | 1 | Travel | 628.33 | 328.33 | Fuel | Car share, bus or train | 87.97 | 244.08 |
| C108 | Oct | 2 | Utilities | 188.00 | 38.00 | Gas | Turn the heating down 1C | 35.72 | 64.34 |
| C108 | Oct | 3 | Food | 476.67 | 226.67 | Groceries | Plan meals and waste less food | 66.73 | 37.59 |
| C108 | Nov | 1 | Travel | 650.00 | 350.00 | Fuel | Car share, bus or train | 91.00 | 252.50 |
| C108 | Nov | 2 | Utilities | 220.00 | 70.00 | Gas | Turn the heating down 1C | 41.80 | 80.33 |
| C108 | Nov | 3 | Food | 519.99 | 269.99 | Groceries | Plan meals and waste less food | 72.80 | 41.20 |

57 recommendations in total. Customer-months with nothing over a threshold get no rows.

```sql
SELECT * FROM dbo.vw_Recommendations
WHERE CAST(CustomerId AS CHAR(36)) LIKE '00000000-0000-0000-0000-0000000001%'
ORDER BY CustomerId, SpendMonth, Priority;
```

## How to check

```sql
SELECT * FROM dbo.vw_CustomerMonthlyFootprint
WHERE CAST(CustomerId AS CHAR(36)) LIKE '00000000-0000-0000-0000-0000000001%'
ORDER BY CustomerId, SpendMonth;

SELECT * FROM dbo.vw_CategoryInsights
WHERE CAST(CustomerId AS CHAR(36)) LIKE '00000000-0000-0000-0000-0000000001%'
ORDER BY CustomerId, SpendMonth, CarbonRank;
```
