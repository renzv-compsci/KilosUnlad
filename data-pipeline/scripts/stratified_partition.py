"""
stratified_partition.py
Splits the noisy synthetic seed data into Train, Validation, and Test Parquet 
matrices while preserving the class distribution of the target variable.

Optimized for Charles's ML pipeline (LightGBM/XGBoost) using columnar Parquet 
storage via pyarrow.

Usage (from data-pipeline):
    python scripts/stratified_partition.py
"""

import json
import pandas as pd
from sklearn.model_selection import train_test_split
from pathlib import Path

SEEDS = Path(__file__).resolve().parents[1] / "seeds"
PARTITIONS = Path(__file__).resolve().parents[1] / "partitions"

# --- Configuration (Adjusted to match 70k/10k/20k DoD) ---
TRAIN_RATIO = 0.70
VAL_RATIO = 0.10
TEST_RATIO = 0.20
RANDOM_STATE = 42  # Must match generator seed for reproducibility
TARGET_COLUMN = "true_swdi_level"

def load_and_merge_seeds() -> pd.DataFrame:
    """Loads the noisy JSON seeds and merges them into a single modeling table."""
    print("Loading seed data...")
    with open(SEEDS / "seed_beneficiaries.json", "r", encoding="utf-8") as f:
        ben_df = pd.json_normalize(json.load(f))
    
    with open(SEEDS / "seed_external_records.json", "r", encoding="utf-8") as f:
        ext_df = pd.json_normalize(json.load(f))

    print("Merging beneficiary and external records...")
    merged_df = pd.merge(ben_df, ext_df, on="household_id", how="left", suffixes=("_ben", "_ext"))
    
    return merged_df

def stratified_split(df: pd.DataFrame) -> tuple:
    """
    Performs a stratified split: 70% Train, 10% Val, 20% Test.
    """
    print(f"Stratifying by column: '{TARGET_COLUMN}'")
    
    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Target column '{TARGET_COLUMN}' not found in dataset.")

    # Split 1: Train (70%) vs Temp (30%)
    train_df, temp_df = train_test_split(
        df, 
        test_size=(1.0 - TRAIN_RATIO), 
        stratify=df[TARGET_COLUMN], 
        random_state=RANDOM_STATE
    )

    # Split 2: Temp (30%) -> Val (1/3 of Temp = 10% total) and Test (2/3 of Temp = 20% total)
    val_df, test_df = train_test_split(
        temp_df, 
        test_size=(TEST_RATIO / (VAL_RATIO + TEST_RATIO)), # 0.20 / 0.30 = 0.666...
        stratify=temp_df[TARGET_COLUMN], 
        random_state=RANDOM_STATE
    )

    return train_df, val_df, test_df

def verify_distribution(train: pd.DataFrame, val: pd.DataFrame, test: pd.DataFrame):
    """Prints the class distribution to prove stratification worked."""
    print("\n--- Class Distribution Verification ---")
    for name, df in [("Train", train), ("Val", val), ("Test", test)]:
        counts = df[TARGET_COLUMN].value_counts(normalize=True).sort_index()
        print(f"{name} Set Distribution:")
        for level, pct in counts.items():
            print(f"  Level {level}: {pct:.2%}")
        print("-" * 40)

def main():
    print("=" * 65)
    print("INITIALIZING STRATIFIED PARTITION ENGINE (Task 3.2)")
    print("=" * 65)

    # 1. Load and Merge
    modeling_df = load_and_merge_seeds()
    print(f"Total records for partitioning: {len(modeling_df):,}")

    # 2. Split
    train_df, val_df, test_df = stratified_split(modeling_df)
    
    print(f"Split Sizes -> Train: {len(train_df):,} | Val: {len(val_df):,} | Test: {len(test_df):,}")

    # 3. Verify
    verify_distribution(train_df, val_df, test_df)

    # 4. Save as Parquet (Task 3.2 DoD)
    PARTITIONS.mkdir(parents=True, exist_ok=True)
    print("Saving Parquet partitions to /partitions/ ...")
    
    # Using pyarrow engine for optimal columnar compression and type preservation
    train_df.to_parquet(PARTITIONS / "train_features_70k.parquet", engine='pyarrow', index=False)
    val_df.to_parquet(PARTITIONS / "validation_features_10k.parquet", engine='pyarrow', index=False)
    test_df.to_parquet(PARTITIONS / "test_features_20k.parquet", engine='pyarrow', index=False)

    print("\n[SUCCESS] Parquet partitions generated. Ready for ML Feature Engineering.")
    print("=" * 65)

if __name__ == "__main__":
    main()