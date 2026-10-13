"""
stratified_partition.py
Splits the empirical feature matrix into Train, Validation, and Test Parquet 
matrices while preserving the class distribution of the target variable.

Optimized for Charles's ML pipeline (LightGBM/XGBoost) using columnar Parquet 
storage via pyarrow.

Usage (from data-pipeline):
    python scripts/stratified_partition.py
"""

import pandas as pd
from sklearn.model_selection import train_test_split
from pathlib import Path

# Adjust paths to match the actual repository structure
SEEDS = Path(__file__).resolve().parents[1] / "seeds"
PARTITIONS = Path(__file__).resolve().parents[1] / "partitions"

# --- Configuration ---
TRAIN_RATIO = 0.70
VAL_RATIO = 0.10
TEST_RATIO = 0.20
RANDOM_STATE = 42
TARGET_COLUMN = "swdi_level" # Verify this matches the exact column name in features_swdi_clean.parquet

def load_empirical_matrix() -> pd.DataFrame:
    """Loads the clean empirical feature matrix (Parquet)."""
    parquet_path = SEEDS / "features_swdi_clean.parquet"
    
    if not parquet_path.exists():
        raise FileNotFoundError(
            f"Empirical matrix not found at {parquet_path}. "
            "Ensure Notebook 02 has been executed and the parquet file is generated."
        )
        
    print(f"Loading empirical matrix from {parquet_path}...")
    df = pd.read_parquet(parquet_path)
    print(f"Total records loaded: {len(df):,}")
    
    return df

def stratified_split(df: pd.DataFrame) -> tuple:
    """
    Performs a stratified split: 70% Train, 10% Val, 20% Test.
    """
    print(f"Stratifying by column: '{TARGET_COLUMN}'")
    
    if TARGET_COLUMN not in df.columns:
        available_cols = list(df.columns)
        raise ValueError(
            f"Target column '{TARGET_COLUMN}' not found in dataset. "
            f"Available columns: {available_cols}"
        )

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
        test_size=(TEST_RATIO / (VAL_RATIO + TEST_RATIO)), 
        stratify=temp_df[TARGET_COLUMN], 
        random_state=RANDOM_STATE
    )

    return train_df, val_df, test_df

def verify_distribution(train: pd.DataFrame, val: pd.DataFrame, test: pd.DataFrame):
    """Prints the class distribution to prove stratification worked."""
    print("\n--- Class Distribution Verification ---")
    for name, df in [("Train", train), ("Val", val), ("Test", test)]:
        counts = df[TARGET_COLUMN].value_counts(normalize=True).sort_index()
        print(f"{name} Set Distribution (Total: {len(df):,}):")
        for level, pct in counts.items():
            print(f"  Level {level}: {pct:.2%}")
        print("-" * 40)

def main():
    print("=" * 65)
    print("INITIALIZING STRATIFIED PARTITION ENGINE (Sprint 2)")
    print("=" * 65)

    # 1. Load Empirical Matrix
    modeling_df = load_empirical_matrix()

    # 2. Split
    train_df, val_df, test_df = stratified_split(modeling_df)
    
    print(f"\nSplit Sizes -> Train: {len(train_df):,} | Val: {len(val_df):,} | Test: {len(test_df):,}")

    # 3. Verify
    verify_distribution(train_df, val_df, test_df)

    # 4. Save as Parquet
    PARTITIONS.mkdir(parents=True, exist_ok=True)
    print("\nSaving Parquet partitions to /partitions/ ...")
    
    train_df.to_parquet(PARTITIONS / "train_features.parquet", engine='pyarrow', index=False)
    val_df.to_parquet(PARTITIONS / "validation_features.parquet", engine='pyarrow', index=False)
    test_df.to_parquet(PARTITIONS / "test_features.parquet", engine='pyarrow', index=False)

    print("\n[SUCCESS] Empirical Parquet partitions generated. Ready for Sprint 2 ML Training.")
    print("=" * 65)

if __name__ == "__main__":
    main()