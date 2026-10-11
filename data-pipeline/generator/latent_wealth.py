import numpy as np
import pandas as pd
from numpy.typing import NDArray

from .distributions import (
    sample_household_size,
    sample_dependency_ratio,
    sample_electricity_kwh,
    sample_water_cum,
    sample_appliance_count,
    sample_housing_score,
)

# --- Latent Wealth Index weights ---
BASE_INTERCEPT = 35.0
EDU_WEIGHT = 8.0
DEP_WEIGHT = -12.0
WORK_WEIGHT = 25.0
REMIT_WEIGHT = 15.0
NOISE_SCALE = 5.0
W_I_MIN = 0.0
W_I_MAX = 100.0

# --- Vehicle income adjustment bounds ---
PHP_PER_WEALTH_POINT = 2_000.0
VEHICLE_DELTA_MIN = -5.0
VEHICLE_DELTA_MAX = 18.0

# --- Education sampling distribution (0=None, 1=Elem, 2=HS, 3=College+) ---
EDU_PROBABILITIES = [0.15, 0.35, 0.35, 0.15]

# --- Formal employment parameters ---
FORMAL_WORK_BASE_PROBS = np.array([0.05, 0.20, 0.40, 0.65])
WEALTH_PROXY_CENTER = 50.0
FORMAL_WORK_PROXY_SENSITIVITY = 0.005
FORMAL_WORK_PROB_FLOOR = 0.05
FORMAL_WORK_PROB_CEILING = 0.95

# --- Remittance decay parameters ---
REMIT_BASE_PROB = 0.35
REMIT_DECAY_RATE = 0.0025
REMIT_PROB_FLOOR = 0.10
REMIT_PROB_CEILING = 0.40

def sample_education_level(n_samples: int) -> NDArray[np.int32]:
    return np.random.choice([0, 1, 2, 3], size=n_samples, p=EDU_PROBABILITIES).astype(np.int32)

def sample_formal_employment(
    education_levels: NDArray[np.int32],
    wealth_proxy: NDArray[np.float64],
) -> NDArray[np.int32]:
    base_probs = FORMAL_WORK_BASE_PROBS[education_levels]
    adjusted = base_probs + (wealth_proxy - WEALTH_PROXY_CENTER) * FORMAL_WORK_PROXY_SENSITIVITY
    adjusted = np.clip(adjusted, FORMAL_WORK_PROB_FLOOR, FORMAL_WORK_PROB_CEILING)
    return (np.random.random(size=len(education_levels)) < adjusted).astype(np.int32)

def sample_remittance(wealth_proxy: NDArray[np.float64]) -> NDArray[np.int32]:
    probs = REMIT_BASE_PROB - (wealth_proxy * REMIT_DECAY_RATE)
    probs = np.clip(probs, REMIT_PROB_FLOOR, REMIT_PROB_CEILING)
    return (np.random.random(size=len(wealth_proxy)) < probs).astype(np.int32)

def calculate_latent_wealth_index(
    education: NDArray[np.int32],
    dependency_ratio: NDArray[np.float64],
    formal_work: NDArray[np.int32],
    remittance: NDArray[np.int32],
) -> NDArray[np.float64]:
    w_i = (
        BASE_INTERCEPT
        + EDU_WEIGHT * education
        + DEP_WEIGHT * np.log1p(dependency_ratio)
        + WORK_WEIGHT * formal_work
        + REMIT_WEIGHT * remittance
        + np.random.normal(loc=0.0, scale=NOISE_SCALE, size=len(education))
    )
    return np.clip(w_i, W_I_MIN, W_I_MAX).astype(np.float64)

def generate_core_features(n_samples: int) -> pd.DataFrame:
    sizes = sample_household_size(n_samples)
    dep_ratios = sample_dependency_ratio(sizes)
    edu_levels = sample_education_level(n_samples)

    initial_wealth_proxy = (
        BASE_INTERCEPT
        + EDU_WEIGHT * edu_levels
        + DEP_WEIGHT * np.log1p(dep_ratios)
    )

    formal_work = sample_formal_employment(edu_levels, initial_wealth_proxy)
    remittance = sample_remittance(initial_wealth_proxy)
    base_w = calculate_latent_wealth_index(edu_levels, dep_ratios, formal_work, remittance)

    return pd.DataFrame({
        "household_size": sizes,
        "dependency_ratio": dep_ratios,
        "head_education_level": edu_levels,
        "head_formal_employment": formal_work,
        "remittance_income_flag": remittance,
        "latent_wealth_score": base_w,
    })

def apply_vehicle_income_adjustment(df: pd.DataFrame) -> pd.DataFrame:
    if "vehicle_net_monthly_income" not in df.columns:
        raise KeyError(
            "apply_vehicle_income_adjustment requires 'vehicle_net_monthly_income'; "
            "run external_records.compute_vehicle_net_monthly_income first."
        )
    out = df.copy()
    delta = np.clip(
        out["vehicle_net_monthly_income"].to_numpy() / PHP_PER_WEALTH_POINT,
        VEHICLE_DELTA_MIN,
        VEHICLE_DELTA_MAX,
    )
    out["latent_wealth_score"] = np.clip(
        out["latent_wealth_score"].to_numpy() + delta, W_I_MIN, W_I_MAX
    ).astype(np.float64)
    return out

def sample_asset_proxies(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    wealth = out["latent_wealth_score"].to_numpy()
    sizes = out["household_size"].to_numpy()
    out["housing_material_score"] = sample_housing_score(wealth)
    out["appliance_count"] = sample_appliance_count(wealth)
    out["electricity_kwh_monthly"] = sample_electricity_kwh(wealth, sizes)
    out["water_cum_monthly"] = sample_water_cum(wealth, sizes)
    return out