import json
import random
from pathlib import Path

SEEDS_DIR = Path(__file__).resolve().parents[1] / "seeds"
BEN_MASTER = SEEDS_DIR / "seed_beneficiaries.json"
EXT_MASTER = SEEDS_DIR / "seed_external_records.json"

APP_SIZE = 80_000
TEST_SIZE = 20_000
RANDOM_SEED = 42

def load_json(path: Path) -> list:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path: Path, data: list) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

def main() -> None:
    print("=" * 65)
    print("TASK 3.3: PARTITIONING 100K SEEDS (OFFLINE ISOLATION)")
    print("=" * 65)

    # 1. Load master files
    print("Loading master seed files...")
    beneficiaries = load_json(BEN_MASTER)
    external_records = load_json(EXT_MASTER)

    if len(beneficiaries) != 100_000 or len(external_records) != 100_000:
        raise ValueError(f"Master files must contain exactly 100,000 records. Found {len(beneficiaries)} and {len(external_records)}.")

    # 2. Build lookup maps for referential integrity
    ben_map = {rec["household_id"]: rec for rec in beneficiaries}
    ext_map = {rec["household_id"]: rec for rec in external_records}

    # Verify perfect 1:1 mapping before splitting
    if set(ben_map.keys()) != set(ext_map.keys()):
        raise ValueError("Referential integrity error: household_id sets do not match between master files.")

    # 3. Split household IDs deterministically
    all_ids = list(ben_map.keys())
    random.seed(RANDOM_SEED)
    random.shuffle(all_ids)

    app_ids = set(all_ids[:APP_SIZE])
    test_ids = set(all_ids[APP_SIZE:])

    print(f"Partitioned IDs: {len(app_ids)} for App, {len(test_ids)} for Test.")

    # 4. Reconstruct partitioned lists preserving original object structure
    app_ben = [ben_map[hid] for hid in all_ids if hid in app_ids]
    app_ext = [ext_map[hid] for hid in all_ids if hid in app_ids]
    test_ben = [ben_map[hid] for hid in all_ids if hid in test_ids]
    test_ext = [ext_map[hid] for hid in all_ids if hid in test_ids]

    # 5. Export to new files (CRITICAL: Do not overwrite master files)
    print("Writing partitioned JSON files...")
    save_json(SEEDS_DIR / "seed_beneficiaries_app_80k.json", app_ben)
    save_json(SEEDS_DIR / "seed_external_records_app_80k.json", app_ext)
    save_json(SEEDS_DIR / "seed_beneficiaries_test_20k.json", test_ben)
    save_json(SEEDS_DIR / "seed_external_records_test_20k.json", test_ext)

    # 6. Verification
    print("-" * 65)
    print("VERIFICATION:")
    print(f"  seed_beneficiaries_app_80k.json: {len(app_ben):,} records")
    print(f"  seed_external_records_app_80k.json: {len(app_ext):,} records")
    print(f"  seed_beneficiaries_test_20k.json: {len(test_ben):,} records")
    print(f"  seed_external_records_test_20k.json: {len(test_ext):,} records")
    
    # Verify referential integrity of the splits
    assert set(b["household_id"] for b in app_ben) == set(e["household_id"] for e in app_ext)
    assert set(b["household_id"] for b in test_ben) == set(e["household_id"] for e in test_ext)
    print("  Referential integrity: PASS")
    
    print("-" * 65)
    print("TASK 3.3 COMPLETE: LIVE DB UNTOUCHED. NO AUTO-INGESTION TRIGGERED.")
    print("=" * 65)

if __name__ == "__main__":
    main()