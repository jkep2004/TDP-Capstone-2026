"""
Quick data profile for the spending CSVs.

Usage:
    python profile_data.py src/test-data
    python profile_data.py file1.csv file2.csv

For each file it prints: rows, customers, weeks, missing values, duplicates,
weeks per customer and min/mean/max per category. Then it compares the files:
which customers and weeks each file has that the others do not.
"""

import sys
from pathlib import Path

import pandas as pd

CATEGORIES = ["travel", "food", "utilities"]


def load(path: Path) -> pd.DataFrame:
    # comment="#" skips the "# NW TDP 2026 v2" header line
    return pd.read_csv(path, comment="#")


def profile(name: str, df: pd.DataFrame) -> None:
    print(f"\n=== {name} ===")
    print(f"Rows: {len(df)}   Columns: {list(df.columns)}")
    print(f"Customers: {df['customer_id'].nunique()}  -> {sorted(df['customer_id'].unique().tolist())}")
    print(f"Weeks:     {df['week'].nunique()}  -> {sorted(df['week'].unique().tolist())}")
    print(f"Missing values: {int(df.isna().sum().sum())}")
    print(f"Duplicate customer+week rows: {int(df.duplicated(['customer_id', 'week']).sum())}")

    weeks = df.groupby("customer_id")["week"].nunique()
    uneven = weeks[weeks != weeks.max()]
    print(f"Weeks per customer: {weeks.min()}-{weeks.max()}"
          + (f"  (fewer weeks: customers {uneven.index.tolist()})" if len(uneven) else "  (all equal)"))

    print("Spend per week (GBP):")
    print(df[CATEGORIES].agg(["min", "mean", "max"]).round(1).to_string())

    negatives = (df[CATEGORIES] < 0).sum().sum()
    if negatives:
        print(f"WARNING: {negatives} negative amounts")


def compare(frames: dict) -> None:
    print("\n=== Comparison ===")
    names = list(frames)
    all_customers = set().union(*(set(f["customer_id"]) for f in frames.values()))
    all_weeks = set().union(*(set(f["week"]) for f in frames.values()))
    for name in names:
        customers = set(frames[name]["customer_id"])
        weeks = set(frames[name]["week"])
        missing_c = sorted(int(c) for c in all_customers - customers)
        missing_w = sorted(int(w) for w in all_weeks - weeks)
        print(f"{name}: {len(customers)} customers, {len(weeks)} weeks"
              + (f" | missing customers {missing_c}" if missing_c else "")
              + (f" | missing weeks {missing_w}" if missing_w else ""))

    # Same customer + week but different amounts between files
    base_name = names[0]
    base = frames[base_name].set_index(["customer_id", "week"])[CATEGORIES]
    for name in names[1:]:
        other = frames[name].set_index(["customer_id", "week"])[CATEGORIES]
        common = base.index.intersection(other.index)
        diff = (base.loc[common] != other.loc[common]).any(axis=1)
        changed = [tuple(int(x) for x in i) for i in common[diff]]
        print(f"{name} vs {base_name}: {len(changed)} shared customer+week rows with different amounts"
              + (f" {changed}" if changed else ""))


def main() -> None:
    args = [Path(a) for a in sys.argv[1:]] or [Path("src/test-data")]
    files = []
    for a in args:
        files += sorted(a.glob("*.csv")) if a.is_dir() else [a]
    if not files:
        sys.exit("No CSV files found.")

    frames = {f.name: load(f) for f in files}
    for name, df in frames.items():
        profile(name, df)
    if len(frames) > 1:
        compare(frames)


if __name__ == "__main__":
    main()
