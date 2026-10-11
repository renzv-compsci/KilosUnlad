"""
json_to_csv.py
Flatten seed JSON files and the noise manifest into CSV for spreadsheet 
inspection and sharing.

Read-only with respect to seeds/; derived CSV files are written to
data-pipeline/exports/ so the ingestion contract directory stays clean.

Usage (from data-pipeline):
    python scripts/json_to_csv.py --all
    python scripts/json_to_csv.py --file beneficiaries
    python scripts/json_to_csv.py --file external
    python scripts/json_to_csv.py --file manifest
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

DATA_ROOT = Path(__file__).resolve().parents[1]
SEEDS = DATA_ROOT / "seeds"
EXPORTS = DATA_ROOT / "exports"

TARGETS = {
    "beneficiaries": SEEDS / "seed_beneficiaries.json",
    "external": SEEDS / "seed_external_records.json",
    "manifest": SEEDS / "noise_manifest.json",
}

LIST_JOIN_SEPARATOR = "; "
CSV_ENCODING = "utf-8-sig"  # BOM so Excel renders Filipino diacritics correctly


def load_records(path: Path):
    """Load a seed JSON file. Supports both arrays (seeds) and objects (manifest)."""
    if not path.exists():
        raise FileNotFoundError(f"Seed file not found: {path}")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def flatten_records(records) -> pd.DataFrame:
    """
    Normalize nested dicts into dot-notation columns.
    Handles both lists of records (seeds) and single objects (manifest).
    """
    # If it's a single dict (like the manifest), wrap it in a list to create a 1-row DataFrame
    if isinstance(records, dict):
        records = [records]

    df = pd.json_normalize(records)

    for col in df.columns:
        if df[col].map(lambda v: isinstance(v, list)).any():
            df[col] = df[col].map(
                lambda v: LIST_JOIN_SEPARATOR.join(map(str, v)) if isinstance(v, list) else v
            )

    # Deterministic column ordering based on primary keys
    if "household_id" in df.columns:
        ordered = ["household_id"] + [c for c in sorted(df.columns) if c != "household_id"]
        df = df[ordered]
    elif "total_records" in df.columns:
        ordered = ["total_records"] + [c for c in sorted(df.columns) if c != "total_records"]
        df = df[ordered]
        
    return df


def export_csv(name: str) -> Path:
    """Convert one seed target to CSV and report its shape."""
    records = load_records(TARGETS[name])
    df = flatten_records(records)
    EXPORTS.mkdir(parents=True, exist_ok=True)
    out = EXPORTS / f"{TARGETS[name].stem}.csv"
    df.to_csv(out, index=False, encoding=CSV_ENCODING)
    print(f"{name}: {len(df):,} rows x {len(df.columns)} columns -> {out}")
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Flatten seed JSON files into CSV.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--file", choices=sorted(TARGETS))
    group.add_argument("--all", action="store_true", help="Convert both seed files and the manifest.")
    args = parser.parse_args()

    names = sorted(TARGETS) if args.all else [args.file]
    try:
        for name in names:
            export_csv(name)
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())