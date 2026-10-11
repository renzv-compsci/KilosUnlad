import json
from pathlib import Path

SEEDS_DIR = Path(__file__).resolve().parents[1] / "seeds"

# Expected ML Contract Features (Charles)
ML_FEATURES = {
    "head_education_level", "head_formal_employment", "remittance_income_flag",
    "housing_material_score", "appliance_density_index", "dependency_ratio"
}

def validate_beneficiary_schema(rec: dict) -> list:
    errors = []
    hid = rec.get("household_id", "UNKNOWN")
    
    if not isinstance(rec.get("household_id"), str): errors.append(f"{hid}: missing household_id")
    if rec.get("enrolled_level") not in {1, 2, 3}: errors.append(f"{hid}: invalid enrolled_level")
    if rec.get("true_swdi_level") not in {1, 2, 3}: errors.append(f"{hid}: invalid true_swdi_level")
    
    demo = rec.get("demographics", {})
    if not isinstance(demo, dict):
        errors.append(f"{hid}: missing demographics block")
    else:
        missing_features = ML_FEATURES - set(demo.keys())
        if missing_features:
            errors.append(f"{hid}: missing ML features: {missing_features}")
            
    return errors

def validate_external_schema(rec: dict) -> list:
    errors = []
    hid = rec.get("household_id", "UNKNOWN")
    
    if not isinstance(rec.get("household_id"), str): errors.append(f"{hid}: missing household_id")
    
    power = rec.get("power", {})
    if not isinstance(power.get("kwh_monthly"), (int, float)): errors.append(f"{hid}: invalid power.kwh_monthly")
    
    water = rec.get("water", {})
    if not isinstance(water.get("cubic_meters_monthly"), (int, float)): errors.append(f"{hid}: invalid water.cubic_meters_monthly")
    
    telecom = rec.get("telecom", {})
    if telecom.get("plan_type") not in {"NONE", "PREPAID_MOBILE", "POSTPAID_FIBER"}:
        errors.append(f"{hid}: invalid telecom.plan_type")
        
    return errors

def validate_file(filename: str, validator_func, expected_count: int) -> int:
    path = SEEDS_DIR / filename
    if not path.exists():
        print(f"FAIL: {filename} not found.")
        return 1
        
    with open(path, "r", encoding="utf-8") as f:
        records = json.load(f)
        
    if len(records) != expected_count:
        print(f"FAIL: {filename} has {len(records)} records, expected {expected_count}.")
        return 1
        
    errors = []
    for rec in records:
        errors.extend(validator_func(rec))
        
    if errors:
        print(f"FAIL: {filename} has {len(errors)} schema errors. First 5:")
        for e in errors[:5]:
            print(f"  - {e}")
        return 1
        
    print(f"PASS: {filename} ({expected_count:,} records, schema valid)")
    return 0

def main() -> None:
    print("=" * 65)
    print("TASK 3.3: OFFLINE SCHEMA VALIDATION")
    print("=" * 65)
    
    failures = 0
    failures += validate_file("seed_beneficiaries_app_80k.json", validate_beneficiary_schema, 80_000)
    failures += validate_file("seed_external_records_app_80k.json", validate_external_schema, 80_000)
    failures += validate_file("seed_beneficiaries_test_20k.json", validate_beneficiary_schema, 20_000)
    failures += validate_file("seed_external_records_test_20k.json", validate_external_schema, 20_000)
    
    print("=" * 65)
    if failures == 0:
        print("RESULT: ALL PARTITIONED FILES PASS OFFLINE SCHEMA VALIDATION.")
        print("Dustin's live DB remains untouched.")
    else:
        print(f"RESULT: FAILED ({failures} files failed validation).")
    print("=" * 65)

if __name__ == "__main__":
    main()