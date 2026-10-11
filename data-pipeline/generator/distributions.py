import numpy as np 
from numpy .typing import NDArray

np.random.seed(42)

def sample_household_size(n_samples: int) -> NDArray[np.int32]: 
    sizes = np.random.poisson(lam=4.8, size=n_samples) + 1
    return np.clip(sizes, 2, 12).astype(np.int32)

def sample_dependency_ratio(household_sizes: NDArray[np.int32]) -> NDArray[np.float64]:
    alpha = 2.0
    beta = 2.0  + (household_sizes / 4.0)
    ratios = np.random.beta(alpha, beta, size=len(household_sizes)) * 2.5 

    # inject social noise 
    noise = np.random.normal(loc=0.0, scale=0.4, size=len(household_sizes))
    ratios = ratios + noise

    max_possible_ratios = (household_sizes - 1) / 1.0 
    ratios = np.clip(ratios, 0.0, max_possible_ratios)

    return np.round(ratios, 2).astype(np.float64)

def sample_electricity_kwh(
    wealth_scores: NDArray[np.float64], 
    household_sizes: NDArray[np.int32]
) -> NDArray[np.float64]:

    mu = 3.8 + (0.015 * wealth_scores) + (0.08 * household_sizes)
    sigma = 0.22

    ln_kwh = np.random.normal(loc=mu, scale=sigma, size=len(wealth_scores))
    kwh = np.exp(ln_kwh)

    # inject shared meter anomaly 
    low_wealth_mask = wealth_scores < 30
    shared_meter_mask = np.random.random(size=len(wealth_scores)) < 0.05

    # apply where conditions are met 
    anomaly_indices = np.where(low_wealth_mask & shared_meter_mask)[0]
    if len(anomaly_indices) > 0: 
        kwh[anomaly_indices] = np.random.uniform(250.0, 450.0, size=len(anomaly_indices))

    return np.round(np.clip(kwh, 5.0, 600.0), 1).astype(np.float64)

def sample_water_cum(
    wealth_scores: NDArray[np.float64], 
    household_sizes: NDArray[np.int32]
) -> NDArray[np.float64]: 

    base = 10.0
    wealth_factor = wealth_scores * 0.15
    size_factor = household_sizes * 1.2

    mean_cum = base + wealth_factor + size_factor
    cum = np.random.normal(loc=mean_cum, scale=3.5, size=len(wealth_scores))

    # inject shared water anomaly 
    low_wealth_mask = wealth_scores < 30
    shared_water_mask = np.random.random(size=len(wealth_scores)) < 0.05

    # apply anomaly 
    anomaly_indices = np.where(low_wealth_mask & shared_water_mask)[0]
    if len(anomaly_indices) > 0:
        cum[anomaly_indices] = np.random.uniform(30.0, 60.0, size=len(anomaly_indices))

    return np.round(np.clip(cum, 2.0, 100.0), 1).astype(np.float64)

def sample_appliance_count(wealth_scores: NDArray[np.float64]) -> NDArray[np.int32]:
    lam = 0.5 + (wealth_scores * 0.05)
    counts = np.random.poisson(lam=lam, size=len(wealth_scores))
    return np.clip(counts, 0, 10).astype(np.int32)

def sample_housing_score(wealth_scores: NDArray[np.float64]) -> NDArray[np.int32]:
    scores = np.zeros(len(wealth_scores), dtype=np.int32)
    
    for i, w in enumerate(wealth_scores):
        if w < 30:
            scores[i] = np.random.choice([1, 2, 3], p=[0.6, 0.3, 0.1])
        elif w < 70:
            scores[i] = np.random.choice([1, 2, 3], p=[0.1, 0.5, 0.4])
        else:
            # Wealthy: Almost always Strong
            scores[i] = np.random.choice([1, 2, 3], p=[0.0, 0.1, 0.9])
            
    return scores