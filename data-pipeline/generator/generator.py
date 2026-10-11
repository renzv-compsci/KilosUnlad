import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from faker import Faker

from . import distributions
from .latent_wealth import (
    generate_core_features,
    apply_vehicle_income_adjustment,
    sample_asset_proxies,
)
from .external_records import (
    augment_external_attributes,
    compute_vehicle_net_monthly_income,
    build_external_records,
    asset_counting_mask,
    VEHICLE_NONE,
    VEHICLE_FOUR_WHEEL,
    VEHICLE_PUBLIC_UTILITY,
    OPERATOR_NOT_OWNER,
    OWNED_OUTRIGHT,
    REL_HEAD,
    WEALTH_TIER_LOW,
    WEALTH_TIER_HIGH,
)

TOTAL_HOUSEHOLDS = 100_000
CHUNK_SIZE = 10_000
SEED = 42
JSON_INDENT_PRETTY = 2

# --- Cohort proportions (RENZ_DATA_PROMPT.md) ---
COHORT_A_SHARE = 0.60
COHORT_B_SHARE = 0.15
COHORT_C_SHARE = 0.10

# --- Cohort override parameters ---
COHORT_B_WEALTH = (70.0, 95.0)
COHORT_C_ELECTRICITY = (220.0, 450.0)
COHORT_C_REG_YEAR = (2018, 2025)
COHORT_D_ELECTRICITY = (0.0, 15.0)
COHORT_D_WATER = (2.0, 10.0)
COHORT_D_ATTENDANCE = (0.40, 0.79)
DEFAULT_ATTENDANCE = (0.85, 1.00)

# --- Appliance density index (matches Task 2.2 parquet formula) ---
APPLIANCE_DENSITY_SMOOTHING = 0.1
APPLIANCE_DENSITY_CAP = 3.0

# --- PII parameters ---
GPS_LAT_BOUNDS = (14.18, 14.24)
GPS_LNG_BOUNDS = (121.13, 121.18)
FIRST_NAME_POOL = 2_000
LAST_NAME_POOL = 1_000
MIDDLE_INITIALS = list("ABCDEFGHJKLMNPRSTV")
SPOUSE_PRESENCE_PROB = 0.85
CHILD_COUNT_BOUNDS = (1, 5)  # randint high is exclusive
PHILSYS_SPACE = 100_000_000
PAN_GROUP_SPACE = 10_000

BENEFICIARY_COLUMNS = [
    "household_id", "philsys_id", "landbank_card_pan", "names",
    "gps_coordinates", "household_size", "enrolled_level",
    "true_swdi_level", "school_attendance",
    "head_education_level", "head_formal_employment",
    "remittance_income_flag", "housing_material_score",
    "appliance_density_index", "dependency_ratio",
]

fake = Faker("fil_PH")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate synthetic 4Ps household seed data."
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Write human-readable indented JSON (files become roughly 3-4x larger).",
    )
    return parser.parse_args()


def _build_name_pools():
    first = sorted({fake.first_name() for _ in range(FIRST_NAME_POOL)})
    last = sorted({fake.last_name() for _ in range(LAST_NAME_POOL)})
    return first, last


def inject_cohorts(df: pd.DataFrame) -> pd.DataFrame:
    n = len(df)
    n_a = int(n * COHORT_A_SHARE)
    n_b = int(n * COHORT_B_SHARE)
    n_c = int(n * COHORT_C_SHARE)
    n_d = n - n_a - n_b - n_c

    out = df.sample(frac=1.0, random_state=SEED).reset_index(drop=True)
    wealth = out["latent_wealth_score"].to_numpy()
    out["true_swdi_level"] = np.select(
        [wealth < WEALTH_TIER_LOW, wealth < WEALTH_TIER_HIGH], [1, 2], default=3
    )
    out["enrolled_level"] = out["true_swdi_level"].copy()
    out["school_attendance"] = np.round(np.random.uniform(*DEFAULT_ATTENDANCE, n), 2)
    out["audit_cohort"] = "A"

    idx_b = out.index[n_a:n_a + n_b]
    idx_c = out.index[n_a + n_b:n_a + n_b + n_c]
    idx_d = out.index[n_a + n_b + n_c:]

    # Cohort B: unreported graduation. True state Level 3, enrolled Level 1.
    out.loc[idx_b, "audit_cohort"] = "B"
    out.loc[idx_b, "latent_wealth_score"] = np.random.uniform(*COHORT_B_WEALTH, n_b)
    out.loc[idx_b, "true_swdi_level"] = 3
    out.loc[idx_b, "enrolled_level"] = 1
    wealth_b = out.loc[idx_b, "latent_wealth_score"].to_numpy()
    sizes_b = out.loc[idx_b, "household_size"].to_numpy()
    out.loc[idx_b, "electricity_kwh_monthly"] = distributions.sample_electricity_kwh(wealth_b, sizes_b)
    out.loc[idx_b, "water_cum_monthly"] = distributions.sample_water_cum(wealth_b, sizes_b)
    out.loc[idx_b, "appliance_count"] = distributions.sample_appliance_count(wealth_b)
    out.loc[idx_b, "housing_material_score"] = 3

    # Cohort C: asset inconsistency. Owned four-wheel car plus high-draw meter.
    out.loc[idx_c, "audit_cohort"] = "C"
    out.loc[idx_c, "enrolled_level"] = 1
    out.loc[idx_c, "vehicle_type"] = VEHICLE_FOUR_WHEEL
    out.loc[idx_c, "ownership_status"] = OWNED_OUTRIGHT
    out.loc[idx_c, "owner_relationship"] = REL_HEAD
    out.loc[idx_c, "vehicle_productive_use"] = False
    out.loc[idx_c, "vehicle_net_monthly_income"] = 0.0
    out.loc[idx_c, "vehicle_registration_year"] = np.random.randint(*COHORT_C_REG_YEAR, n_c)
    out.loc[idx_c, "electricity_kwh_monthly"] = np.round(
        np.random.uniform(*COHORT_C_ELECTRICITY, n_c), 1
    )

    # Cohort D: sinking. Utility cutoff and attendance below the 80% statutory rule.
    out.loc[idx_d, "audit_cohort"] = "D"
    out.loc[idx_d, "enrolled_level"] = 2
    out.loc[idx_d, "electricity_kwh_monthly"] = np.round(
        np.random.uniform(*COHORT_D_ELECTRICITY, n_d), 1
    )
    out.loc[idx_d, "water_cum_monthly"] = np.round(np.random.uniform(*COHORT_D_WATER, n_d), 1)
    out.loc[idx_d, "school_attendance"] = np.round(
        np.random.uniform(*COHORT_D_ATTENDANCE, n_d), 2
    )
    return out


def augment_pii(df: pd.DataFrame, first_pool: list, last_pool: list) -> pd.DataFrame:
    """Culturally authentic names, bounded Laguna GPS, PhilSys IDs, LandBank PANs."""
    n = len(df)
    out = df.copy()

    f_head = np.random.choice(first_pool, n)
    m_init = np.random.choice(MIDDLE_INITIALS, n)
    l_head = np.random.choice(last_pool, n)
    f_spouse = np.random.choice(first_pool, n)
    spouse_present = np.random.random(n) < SPOUSE_PRESENCE_PROB
    child_counts = np.random.randint(*CHILD_COUNT_BOUNDS, n)

    names = []
    for i in range(n):
        entry = {"head": f"{f_head[i]} {m_init[i]}. {l_head[i]}"}
        entry["spouse"] = f"{f_spouse[i]} {l_head[i]}" if spouse_present[i] else None
        entry["children"] = [str(x) for x in np.random.choice(first_pool, size=child_counts[i])]
        names.append(entry)
    out["names"] = names

    lats = np.round(np.random.uniform(*GPS_LAT_BOUNDS, n), 6)
    lngs = np.round(np.random.uniform(*GPS_LNG_BOUNDS, n), 6)
    out["gps_coordinates"] = [
        {"latitude": float(a), "longitude": float(b)} for a, b in zip(lats, lngs)
    ]
    out["philsys_id"] = [f"PH-NID-{v:08d}" for v in np.random.randint(0, PHILSYS_SPACE, n)]
    pan_a = np.random.randint(0, PAN_GROUP_SPACE, n)
    pan_b = np.random.randint(0, PAN_GROUP_SPACE, n)
    pan_c = np.random.randint(0, PAN_GROUP_SPACE, n)
    out["landbank_card_pan"] = [
        f"5044-{a:04d}-{b:04d}-{c:04d}" for a, b, c in zip(pan_a, pan_b, pan_c)
    ]
    return out


def build_beneficiary_records(df: pd.DataFrame) -> list:
    """
    Explicit native-type casts keep json.dump free of numpy scalars.
    The nested demographics block mirrors ml-swdi-inference.json feature names.
    """
    records = []
    for row in df.itertuples(index=False):
        records.append({
            "household_id": str(row.household_id),
            "philsys_id": str(row.philsys_id),
            "landbank_card_pan": str(row.landbank_card_pan),
            "names": row.names,
            "gps_coordinates": row.gps_coordinates,
            "household_size": int(row.household_size),
            "enrolled_level": int(row.enrolled_level),
            "true_swdi_level": int(row.true_swdi_level),
            "school_attendance": float(row.school_attendance),
            "demographics": {
                "head_education_level": int(row.head_education_level),
                "head_formal_employment": int(row.head_formal_employment),
                "remittance_income_flag": int(row.remittance_income_flag),
                "housing_material_score": int(row.housing_material_score),
                "appliance_density_index": float(row.appliance_density_index),
                "dependency_ratio": float(row.dependency_ratio),
            },
        })
    return records


def main() -> None:
    args = parse_args()
    indent = JSON_INDENT_PRETTY if args.pretty else None

    np.random.seed(SEED)
    Faker.seed(SEED)
    first_pool, last_pool = _build_name_pools()

    print("=" * 65)
    print(f"GENERATING {TOTAL_HOUSEHOLDS:,} SYNTHETIC HOUSEHOLDS")
    print("=" * 65)

    frames = []
    for start in range(0, TOTAL_HOUSEHOLDS, CHUNK_SIZE):
        frames.append(generate_core_features(CHUNK_SIZE))
        print(f"  core features: {start + CHUNK_SIZE:,} / {TOTAL_HOUSEHOLDS:,}")
    df = pd.concat(frames, ignore_index=True)

    df = augment_external_attributes(df)
    df["vehicle_net_monthly_income"] = compute_vehicle_net_monthly_income(
        df["vehicle_type"].to_numpy(),
        df["ownership_status"].to_numpy(),
        df["vehicle_productive_use"].to_numpy(),
    )
    df = apply_vehicle_income_adjustment(df)
    df = sample_asset_proxies(df)
    df = inject_cohorts(df)

    # Density index computed post-cohort so Cohort B appliance mutations apply.
    df["appliance_density_index"] = (
        df["appliance_count"] / (df["household_size"] + APPLIANCE_DENSITY_SMOOTHING)
    ).clip(upper=APPLIANCE_DENSITY_CAP).round(2)

    df["household_id"] = [f"SYN-4PS-{i + 1:06d}" for i in range(len(df))]
    df = augment_pii(df, first_pool, last_pool)

    seeds = Path(__file__).resolve().parents[1] / "seeds"
    seeds.mkdir(parents=True, exist_ok=True)

    ben_path = seeds / "seed_beneficiaries.json"
    with open(ben_path, "w", encoding="utf-8") as fh:
        json.dump(
            build_beneficiary_records(df[BENEFICIARY_COLUMNS]),
            fh, ensure_ascii=False, indent=indent,
        )

    ext_path = seeds / "seed_external_records.json"
    with open(ext_path, "w", encoding="utf-8") as fh:
        json.dump(build_external_records(df), fh, ensure_ascii=False, indent=indent)

    has_vehicle = df["vehicle_type"].to_numpy() != VEHICLE_NONE
    print("-" * 65)
    print("COHORT PROPORTIONS (target A=60, B=15, C=10, D=15):")
    print((df["audit_cohort"].value_counts().sort_index() / len(df) * 100).round(2).to_string())
    print("-" * 65)
    print("ENROLLED LEVEL DISTRIBUTION:")
    print(df["enrolled_level"].value_counts().sort_index().to_string())
    print("-" * 65)
    print("VEHICLE CATEGORIES:")
    print(df["vehicle_type"].value_counts().to_string())
    print("-" * 65)
    print("OWNERSHIP AMONG VEHICLE HOUSEHOLDS:")
    print(df.loc[has_vehicle, "ownership_status"].value_counts().to_string())
    print(f"Boundary jeepney operators: "
          f"{int(((df['vehicle_type'] == VEHICLE_PUBLIC_UTILITY) & (df['ownership_status'] == OPERATOR_NOT_OWNER)).sum()):,}")
    print(f"Negative-net households (loan drag): {int((df['vehicle_net_monthly_income'] < 0).sum()):,}")
    print(f"Records counting as asset (proposed rule): {int(asset_counting_mask(df).sum()):,}")
    print("-" * 65)
    print(f"seed_beneficiaries.json: {ben_path.stat().st_size / 1e6:.1f} MB")
    print(f"seed_external_records.json: {ext_path.stat().st_size / 1e6:.1f} MB")
    print("=" * 65)
    print("GENERATION COMPLETE")


if __name__ == "__main__":
    main()