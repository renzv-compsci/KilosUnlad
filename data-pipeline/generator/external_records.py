"""
external_records.py
External registry generation layer (LTO vehicles, telecom) for KilosUnlad.

Ownership model:
    Registry presence does not imply asset ownership. Boundary and lease
    arrangements (jeepney operators) and untransferred deeds of sale are
    common in the Philippines. Every vehicle record therefore carries an
    explicit ownership_status and registered-owner relationship so audits
    can separate owned assets from operated tools.

Transport income model:
    Motorcycles and four-wheel passenger units may operate as TNVS
    ride-hailing capital (Joyride, inDrive, Grab, Angkas, MoveIt). Net
    monthly transport income equals gross earnings minus operating costs
    minus chattel-mortgage amortization. Personal-use units under loan
    register a negative net income, modeling the liability drag.

    All peso parameters are DOCUMENTED ASSUMPTIONS pending validation
    against LTU/TNVS industry reports or field interviews.

Execution note:
    This module contains no entry point. All orchestration runs in
    generator.py.
"""

import numpy as np
import pandas as pd
from numpy.typing import NDArray

# --- Vehicle categories ---
VEHICLE_NONE = "NONE"
VEHICLE_MOTORCYCLE = "MOTORCYCLE"
VEHICLE_FOUR_WHEEL = "FOUR_WHEEL_PASSENGER"
VEHICLE_PUBLIC_UTILITY = "PUBLIC_UTILITY_JEEPNEY"

# --- Ownership statuses ---
OWNED_OUTRIGHT = "OWNED_OUTRIGHT"
OWNED_ENCUMBERED = "OWNED_WITH_ENCUMBRANCE"
OPERATOR_NOT_OWNER = "OPERATOR_NOT_OWNER"
REGISTERED_UNDER_OTHER = "REGISTERED_UNDER_OTHER"

# --- Registered owner relationship to household ---
REL_HEAD = "HOUSEHOLD_HEAD"
REL_SPOUSE = "SPOUSE"
REL_MEMBER = "OTHER_HOUSEHOLD_MEMBER"
REL_EXTERNAL = "NON_HOUSEHOLD"

# --- Telecom plans ---
TELECOM_NONE = "NONE"
TELECOM_PREPAID = "PREPAID_MOBILE"
TELECOM_FIBER = "POSTPAID_FIBER"

# --- Wealth tier boundaries (single source of truth for tier logic) ---
WEALTH_TIER_LOW = 35.0
WEALTH_TIER_HIGH = 70.0

# --- Transport income parameters (PHP/month). DOCUMENTED ASSUMPTIONS. ---
MOTO_GROSS_MEDIAN = 15_000.0
FOURWHEEL_GROSS_MEDIAN = 35_000.0
GROSS_SIGMA = 0.35
MOTO_OPEX_RATE = 0.25
FOURWHEEL_OPEX_RATE = 0.35
MOTO_AMORT = (2_500.0, 6_000.0)
FOURWHEEL_AMORT = (12_000.0, 22_000.0)
JEEPNEY_AMORT = (8_000.0, 15_000.0)
JEEPNEY_OWNER_NET = (15_000.0, 30_000.0)
JEEPNEY_OPERATOR_NET = (10_000.0, 28_000.0)
NET_FLOOR = -8_000.0

_CATEGORIES = [VEHICLE_NONE, VEHICLE_MOTORCYCLE, VEHICLE_FOUR_WHEEL, VEHICLE_PUBLIC_UTILITY]
_OWNERSHIP = [OWNED_OUTRIGHT, OWNED_ENCUMBERED, OPERATOR_NOT_OWNER, REGISTERED_UNDER_OTHER]
_PLATE_LETTERS = list("ABCDEFGHJKLMNPRSTUVWXYZ")

_REQUIRED_RECORD_COLUMNS = [
    "household_id", "electricity_kwh_monthly", "water_cum_monthly",
    "telecom_plan_type", "vehicle_type", "vehicle_registration_year",
    "vehicle_productive_use", "ownership_status", "owner_relationship",
    "vehicle_net_monthly_income",
]

# --- Recalibrated vehicle category probabilities per wealth tier ---
# Ordered as (NONE, MOTORCYCLE, FOUR_WHEEL_PASSENGER, PUBLIC_UTILITY_JEEPNEY).
#
# Recalibration rationale:
#   - Four-wheel ownership below the self-sufficiency tier is rare in reality,
#     so any four-wheel unit at enrolled Level 1 is almost certainly an
#     injected Cohort C audit signal rather than organic noise.
#   - Motorcycles dominate the low and mid tiers, reflecting the TNVS and
#     delivery economy (Angkas, MoveIt, Joyride) as the primary productive
#     asset of poor and transitional households.
VEHICLE_CATEGORY_PROBS = {
    "low":  [0.80, 0.16, 0.01, 0.03],
    "mid":  [0.50, 0.38, 0.04, 0.08],
    "high": [0.25, 0.27, 0.46, 0.02],
}


def _tiers(wealth: NDArray[np.float64]):
    """Returns boolean masks for the three latent wealth tiers."""
    low = wealth < WEALTH_TIER_LOW
    high = wealth >= WEALTH_TIER_HIGH
    return low, ~(low | high), high


def sample_vehicle_type(wealth: NDArray[np.float64]) -> NDArray:
    """
    Category sampling. Motorcycles dominate the low and mid tiers (TNVS and
    delivery economy); four-wheel units concentrate in the self-sufficiency
    tier, where they are a legitimate marker of accumulated wealth.
    """
    types = np.full(len(wealth), VEHICLE_NONE, dtype=object)
    low, mid, high = _tiers(wealth)
    probs = (
        (low,  VEHICLE_CATEGORY_PROBS["low"]),
        (mid,  VEHICLE_CATEGORY_PROBS["mid"]),
        (high, VEHICLE_CATEGORY_PROBS["high"]),
    )
    for mask, p in probs:
        n = int(mask.sum())
        if n:
            types[mask] = np.random.choice(_CATEGORIES, size=n, p=p)
    return types


def sample_ownership_status(wealth: NDArray[np.float64], types: NDArray) -> NDArray:
    """
    Ownership sampling per category and wealth tier.
    Key socio-economic rule: most low-wealth jeepney units are operated
    under boundary arrangements, not owned by the driver's household.
    """
    status = np.full(len(wealth), OWNED_OUTRIGHT, dtype=object)
    low, mid, high = _tiers(wealth)

    matrix = {
        VEHICLE_MOTORCYCLE: (
            (low,  [0.55, 0.25, 0.15, 0.05]),
            (mid,  [0.60, 0.30, 0.05, 0.05]),
            (high, [0.80, 0.15, 0.00, 0.05]),
        ),
        VEHICLE_FOUR_WHEEL: (
            (low,  [0.45, 0.40, 0.05, 0.10]),
            (mid,  [0.45, 0.40, 0.05, 0.10]),
            (high, [0.60, 0.30, 0.02, 0.08]),
        ),
        VEHICLE_PUBLIC_UTILITY: (
            (low,  [0.15, 0.10, 0.70, 0.05]),
            (mid,  [0.30, 0.20, 0.45, 0.05]),
            (high, [0.60, 0.25, 0.10, 0.05]),
        ),
    }
    for category, rows in matrix.items():
        for mask, p in rows:
            sel = mask & (types == category)
            n = int(sel.sum())
            if n:
                status[sel] = np.random.choice(_OWNERSHIP, size=n, p=p)
    status[types == VEHICLE_NONE] = OWNED_OUTRIGHT  # placeholder; row dropped at assembly
    return status


def sample_owner_relationship(ownership: NDArray) -> NDArray:
    """Registered owner linkage; operators and untransferred sales name outsiders."""
    rel = np.full(len(ownership), REL_HEAD, dtype=object)
    owned = (ownership == OWNED_OUTRIGHT) | (ownership == OWNED_ENCUMBERED)
    untransferred = ownership == REGISTERED_UNDER_OTHER
    operator = ownership == OPERATOR_NOT_OWNER

    n_owned = int(owned.sum())
    if n_owned:
        rel[owned] = np.random.choice(
            [REL_HEAD, REL_SPOUSE, REL_MEMBER], size=n_owned, p=[0.80, 0.15, 0.05]
        )
    n_untr = int(untransferred.sum())
    if n_untr:
        rel[untransferred] = np.random.choice(
            [REL_MEMBER, REL_EXTERNAL], size=n_untr, p=[0.30, 0.70]
        )
    rel[operator] = REL_EXTERNAL
    return rel


def sample_productive_use_flag(wealth: NDArray[np.float64], types: NDArray) -> NDArray[np.bool_]:
    """
    Productive-use sampling extended to four-wheel TNVS units.
    Ride-hailing (Joyride, inDrive, Grab) concentrates in low and mid wealth
    tiers where households supplement income; high-wealth cars are personal.
    Jeepneys are always income-generating.
    """
    flags = np.zeros(len(wealth), dtype=bool)
    low, mid, high = _tiers(wealth)
    moto = types == VEHICLE_MOTORCYCLE
    four = types == VEHICLE_FOUR_WHEEL

    for mask, p in (
        (moto & low, 0.70), (moto & mid, 0.30), (moto & high, 0.05),
        (four & low, 0.45), (four & mid, 0.35), (four & high, 0.10),
    ):
        n = int(mask.sum())
        if n:
            flags[mask] = np.random.random(n) < p
    flags[types == VEHICLE_PUBLIC_UTILITY] = True
    return flags


def sample_registration_year(
    types: NDArray,
    ownership: NDArray,
    wealth: NDArray[np.float64],
) -> NDArray[np.int32]:
    """Jeepney fleets skew older; high-wealth passenger cars skew newer."""
    years = np.full(len(types), -1, dtype=np.int32)
    _, _, high = _tiers(wealth)
    jeep = types == VEHICLE_PUBLIC_UTILITY
    moto = types == VEHICLE_MOTORCYCLE
    four = types == VEHICLE_FOUR_WHEEL

    def fill(mask: NDArray[np.bool_], lo: int, hi: int) -> None:
        n = int(mask.sum())
        if n:
            years[mask] = np.random.randint(lo, hi, size=n)

    fill(jeep, 2008, 2020)
    fill(moto & (ownership == OPERATOR_NOT_OWNER), 2015, 2023)
    fill(moto & (ownership != OPERATOR_NOT_OWNER), 2014, 2024)
    fill(four & high, 2018, 2025)
    fill(four & ~high, 2012, 2021)
    return years


def sample_telecom_plan(wealth: NDArray[np.float64]) -> NDArray:
    """Postpaid fiber concentrates in the high-wealth tier (RA 9510 feed)."""
    plans = np.full(len(wealth), TELECOM_PREPAID, dtype=object)
    low, mid, high = _tiers(wealth)
    for mask, p in (
        (low,  [0.30, 0.68, 0.02]),
        (mid,  [0.10, 0.70, 0.20]),
        (high, [0.02, 0.48, 0.50]),
    ):
        n = int(mask.sum())
        if n:
            plans[mask] = np.random.choice(
                [TELECOM_NONE, TELECOM_PREPAID, TELECOM_FIBER], size=n, p=p
            )
    return plans


def generate_plate_numbers(n: int) -> list:
    """LTO-format plate numbers: 3 letters (I, O, Q excluded) plus 4 digits."""
    if n <= 0:
        return []
    letters = np.random.choice(_PLATE_LETTERS, size=(n, 3))
    digits = np.random.randint(0, 10, size=(n, 4))
    return [f"{a}{b}{c} {d}{e}{f}{g}" for (a, b, c), (d, e, f, g) in zip(letters, digits)]


def generate_franchise_numbers(n: int) -> list:
    """LTU franchise numbers, emitted only for public utility units."""
    if n <= 0:
        return []
    years = np.random.randint(2015, 2024, size=n)
    seqs = np.random.randint(10000, 99999, size=n)
    return [f"FR-{y}-{s}" for y, s in zip(years, seqs)]


def compute_vehicle_net_monthly_income(
    types: NDArray,
    ownership: NDArray,
    productive: NDArray[np.bool_],
) -> NDArray[np.float64]:
    """
    Net monthly transport income per household.

    Logic:
        productive motorcycle/four-wheel: lognormal gross minus opex rate.
        jeepney owner: boundary receipts net of collection risk.
        jeepney operator: take-home after boundary fees (not an asset owner).
        encumbered units: amortization deducted whether productive or not,
        so a personal-use car under loan registers as a pure liability drag.
    """
    n = len(types)
    gross = np.zeros(n)
    opex = np.zeros(n)

    moto_prod = (types == VEHICLE_MOTORCYCLE) & productive
    four_prod = (types == VEHICLE_FOUR_WHEEL) & productive
    owned_jeep = (types == VEHICLE_PUBLIC_UTILITY) & np.isin(
        ownership, [OWNED_OUTRIGHT, OWNED_ENCUMBERED]
    )
    oper_jeep = (types == VEHICLE_PUBLIC_UTILITY) & (ownership == OPERATOR_NOT_OWNER)

    def lognormal_draw(mask: NDArray[np.bool_], median: float) -> NDArray[np.float64]:
        k = int(mask.sum())
        if k == 0:
            return np.array([])
        return np.random.lognormal(mean=np.log(median), sigma=GROSS_SIGMA, size=k)

    gross[moto_prod] = lognormal_draw(moto_prod, MOTO_GROSS_MEDIAN)
    opex[moto_prod] = MOTO_OPEX_RATE
    gross[four_prod] = lognormal_draw(four_prod, FOURWHEEL_GROSS_MEDIAN)
    opex[four_prod] = FOURWHEEL_OPEX_RATE

    net = gross * (1.0 - opex)
    k_owner = int(owned_jeep.sum())
    if k_owner:
        net[owned_jeep] = np.random.uniform(*JEEPNEY_OWNER_NET, size=k_owner)
    k_oper = int(oper_jeep.sum())
    if k_oper:
        net[oper_jeep] = np.random.uniform(*JEEPNEY_OPERATOR_NET, size=k_oper)

    amort = np.zeros(n)
    enc = ownership == OWNED_ENCUMBERED
    m_enc = enc & (types == VEHICLE_MOTORCYCLE)
    f_enc = enc & (types == VEHICLE_FOUR_WHEEL)
    j_enc = enc & (types == VEHICLE_PUBLIC_UTILITY)
    if m_enc.sum():
        amort[m_enc] = np.random.uniform(*MOTO_AMORT, size=int(m_enc.sum()))
    if f_enc.sum():
        amort[f_enc] = np.random.uniform(*FOURWHEEL_AMORT, size=int(f_enc.sum()))
    if j_enc.sum():
        amort[j_enc] = np.random.uniform(*JEEPNEY_AMORT, size=int(j_enc.sum()))

    net -= amort
    net[types == VEHICLE_NONE] = 0.0
    return np.round(np.clip(net, NET_FLOOR, None), 2)


def asset_counting_mask(df: pd.DataFrame) -> NDArray[np.bool_]:
    """
    Rule the backend SHOULD adopt (Proposal, pending Mae coordination):
    a vehicle counts toward the 30-point asset check only when it is a
    four-wheel passenger unit owned by the household outright or under
    encumbrance, registered to a household member.
    """
    owned = df["ownership_status"].isin([OWNED_OUTRIGHT, OWNED_ENCUMBERED]).to_numpy()
    internal = df["owner_relationship"].isin([REL_HEAD, REL_SPOUSE, REL_MEMBER]).to_numpy()
    four = df["vehicle_type"].to_numpy() == VEHICLE_FOUR_WHEEL
    return four & owned & internal


def augment_external_attributes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Attaches vehicle and telecom registry columns to the base feature frame.
    Requires 'latent_wealth_score'. Net transport income is computed by the
    caller via compute_vehicle_net_monthly_income after this function runs.
    """
    out = df.copy()
    wealth = out["latent_wealth_score"].to_numpy()
    types = sample_vehicle_type(wealth)
    ownership = sample_ownership_status(wealth, types)
    out["vehicle_type"] = types
    out["ownership_status"] = ownership
    out["owner_relationship"] = sample_owner_relationship(ownership)
    out["vehicle_productive_use"] = sample_productive_use_flag(wealth, types)
    out["vehicle_registration_year"] = sample_registration_year(types, ownership, wealth)
    out["telecom_plan_type"] = sample_telecom_plan(wealth)
    return out


def build_external_records(df: pd.DataFrame) -> list:
    """
    Assembles ExternalRecord documents for MongoDB ingestion.

    NONE vehicle households omit the 'vehicle' block entirely,
    satisfying the Task 2.4 no-bloat rule.
    FIX: Maps generated household_id to matched_household_id to satisfy 
    Dustin's unique database index for external records.
    """
    missing = [c for c in _REQUIRED_RECORD_COLUMNS if c not in df.columns]
    if missing:
        raise KeyError(f"build_external_records missing columns: {missing}")

    has_vehicle = df["vehicle_type"].to_numpy() != VEHICLE_NONE
    plates = iter(generate_plate_numbers(int(has_vehicle.sum())))
    franchises = iter(generate_franchise_numbers(
        int((df["vehicle_type"].to_numpy() == VEHICLE_PUBLIC_UTILITY).sum())
    ))

    records = []
    for row in df.itertuples(index=False):
        record = {
            "matched_household_id": str(row.household_id), # Maps to Dustin's unique index
            "household_id": str(row.household_id),
            "power": {"kwh_monthly": float(row.electricity_kwh_monthly)},
            "water": {"cubic_meters_monthly": float(row.water_cum_monthly)},
            "telecom": {"plan_type": row.telecom_plan_type},
        }
        if row.vehicle_type != VEHICLE_NONE:
            vehicle = {
                "plate_number": next(plates),
                "category": row.vehicle_type,
                "registration_year": int(row.vehicle_registration_year),
                "ownership_status": row.ownership_status,
                "registered_owner_relationship": row.owner_relationship,
                "productive_use_flag": bool(row.vehicle_productive_use),
                "net_monthly_transport_income": float(row.vehicle_net_monthly_income),
            }
            if row.vehicle_type == VEHICLE_PUBLIC_UTILITY:
                vehicle["franchise_number"] = next(franchises)
            record["vehicle"] = vehicle
        records.append(record)
    return records