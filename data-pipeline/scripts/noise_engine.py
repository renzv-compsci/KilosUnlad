"""
noise_engine.py
Applies controlled, bounded noise to synthetic seed data to bridge the 
Sim-to-Real gap and prevent ML overfitting.

Usage (from data-pipeline):
    python scripts/noise_engine.py

Outputs:
    - seeds/seed_beneficiaries.json (Overwritten with noisy version)
    - seeds/seed_external_records.json (Overwritten with noisy version)
    - seeds/noise_manifest.json (Audit log of exact noise distributions)
"""

import json
import math
import random
from pathlib import Path

# Set seed for deterministic, reproducible noise injection
random.seed(42)

SEEDS = Path(__file__).resolve().parents[1] / "seeds"

# --- Noise Ceilings (Task 2.5 DoD) ---
CEILING_LABEL = 0.05       # 5% max
CEILING_FEATURE = 0.12     # 12% max
CEILING_AMBIGUITY = 0.07   # 7% max
CEILING_TEMPORAL = 0.06    # 6% max

# --- Target Injection Rates (Set below ceilings to guarantee compliance) ---
RATE_LABEL = 0.04          # 4%
RATE_FEATURE = 0.10        # 10%
RATE_AMBIGUITY = 0.06      # 6%
RATE_TEMPORAL = 0.05       # 5%

# --- Geographic Noise Parameters ---
# 1 degree latitude ~ 111,000 meters. 
# Sigma of 0.0008 degrees yields ~88m std dev, 99% of points within ~260m.
GPS_JITTER_SIGMA = 0.0008  
MAX_GPS_JITTER_METERS = 200.0

def haversine_distance(lat1, lon1, lat2, lon2) -> float:
    """Calculates distance in meters between two GPS coordinates."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def load_json(path: Path) -> list:
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save_json(path: Path, data: list) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def apply_noise() -> dict:
    print("=" * 65)
    print("INITIALIZING NOISE INJECTION ENGINE (Task 2.5)")
    print("=" * 65)
    
    beneficiaries = load_json(SEEDS / "seed_beneficiaries.json")
    external = load_json(SEEDS / "seed_external_records.json")
    
    # Create a lookup for external records to apply temporal noise cross-reference
    ext_lookup = {rec["household_id"]: rec for rec in external}
    
    stats = {
        "total_records": len(beneficiaries),
        "label_noise": {"count": 0, "ceiling": CEILING_LABEL, "target_rate": RATE_LABEL},
        "feature_noise": {"count": 0, "ceiling": CEILING_FEATURE, "target_rate": RATE_FEATURE},
        "ambiguity_noise": {"count": 0, "ceiling": CEILING_AMBIGUITY, "target_rate": RATE_AMBIGUITY},
        "temporal_noise": {"count": 0, "ceiling": CEILING_TEMPORAL, "target_rate": RATE_TEMPORAL},
        "gps_jitter": {"applied": 0, "max_distance_meters": 0.0}
    }
    
    for ben in beneficiaries:
        hid = ben["household_id"]
        ext = ext_lookup.get(hid, {})
        
        # 1. Label Noise (Graduation Lag / Data Entry Error)
        if random.random() < RATE_LABEL:
            current_level = ben["enrolled_level"]
            # Pick a different valid level to simulate lag or typo
            other_levels = [l for l in [1, 2, 3] if l != current_level]
            ben["enrolled_level"] = random.choice(other_levels)
            stats["label_noise"]["count"] += 1
            
        # 2. Feature Noise (Meter Reading Errors / Skews)
        if random.random() < RATE_FEATURE:
            if "power" in ext and "kwh_monthly" in ext["power"]:
                # Apply +/- 15% skew
                skew = random.uniform(0.85, 1.15)
                ext["power"]["kwh_monthly"] = round(ext["power"]["kwh_monthly"] * skew, 1)
            if "water" in ext and "cubic_meters_monthly" in ext["water"]:
                skew = random.uniform(0.85, 1.15)
                ext["water"]["cubic_meters_monthly"] = round(ext["water"]["cubic_meters_monthly"] * skew, 1)
            stats["feature_noise"]["count"] += 1
            
        # 3. Cohort Ambiguity (Conflicting Observable Signals)
        # Target households with high housing score but force low appliance density
        demo = ben.get("demographics", {})
        if random.random() < RATE_AMBIGUITY:
            if demo.get("housing_material_score") == 3:
                demo["appliance_density_index"] = round(random.uniform(0.0, 0.5), 2)
                stats["ambiguity_noise"]["count"] += 1
            elif demo.get("housing_material_score") == 1:
                demo["appliance_density_index"] = round(random.uniform(1.5, 3.0), 2)
                stats["ambiguity_noise"]["count"] += 1
                
        # 4. Temporal Noise (Stale Registry Sync)
        if "vehicle" in ext and random.random() < RATE_TEMPORAL:
            # Simulate LTO database lag: remove the vehicle block entirely
            del ext["vehicle"]
            stats["temporal_noise"]["count"] += 1
            
        # 5. Geographic Noise (GIDA GPS Drift)
        if "gps_coordinates" in ben:
            orig_lat = ben["gps_coordinates"]["latitude"]
            orig_lng = ben["gps_coordinates"]["longitude"]
            
            jitter_lat = random.gauss(0, GPS_JITTER_SIGMA)
            jitter_lng = random.gauss(0, GPS_JITTER_SIGMA)
            
            new_lat = round(orig_lat + jitter_lat, 6)
            new_lng = round(orig_lng + jitter_lng, 6)
            
            distance = haversine_distance(orig_lat, orig_lng, new_lat, new_lng)
            
            # Clip to max 200m to satisfy DoD
            if distance > MAX_GPS_JITTER_METERS:
                scale = MAX_GPS_JITTER_METERS / distance
                new_lat = round(orig_lat + (jitter_lat * scale), 6)
                new_lng = round(orig_lng + (jitter_lng * scale), 6)
                distance = MAX_GPS_JITTER_METERS
                
            ben["gps_coordinates"]["latitude"] = new_lat
            ben["gps_coordinates"]["longitude"] = new_lng
            
            stats["gps_jitter"]["applied"] += 1
            if distance > stats["gps_jitter"]["max_distance_meters"]:
                stats["gps_jitter"]["max_distance_meters"] = round(distance, 2)

    # --- Validation Pass: Ensure No Ceilings Were Exceeded ---
    print("\nValidating Noise Ceilings (Task 2.5 DoD)...")
    all_passed = True
    for noise_type in ["label_noise", "feature_noise", "ambiguity_noise", "temporal_noise"]:
        actual_rate = stats[noise_type]["count"] / stats["total_records"]
        ceiling = stats[noise_type]["ceiling"]
        if actual_rate > ceiling:
            print(f"  [FAIL] {noise_type} exceeded ceiling: {actual_rate:.2%} > {ceiling:.2%}")
            all_passed = False
        else:
            print(f"  [PASS] {noise_type}: {actual_rate:.2%} (Ceiling: {ceiling:.2%})")
            
    if stats["gps_jitter"]["max_distance_meters"] > MAX_GPS_JITTER_METERS:
        print(f"  [FAIL] GPS jitter max distance exceeded: {stats['gps_jitter']['max_distance_meters']}m")
        all_passed = False
    else:
        print(f"  [PASS] GPS jitter max distance: {stats['gps_jitter']['max_distance_meters']}m (Ceiling: {MAX_GPS_JITTER_METERS}m)")

    if all_passed:
        print("\n[SUCCESS] All noise ceilings validated. Saving noisy datasets...")
        save_json(SEEDS / "seed_beneficiaries.json", beneficiaries)
        save_json(SEEDS / "seed_external_records.json", external)
        save_json(SEEDS / "noise_manifest.json", stats)
        print("Done. Files updated in /seeds/")
    else:
        print("\n[ERROR] Noise ceilings violated. Aborting save to protect data integrity.")
        
    return stats

if __name__ == "__main__":
    apply_noise()