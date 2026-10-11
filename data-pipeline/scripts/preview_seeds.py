import argparse
import json
from pathlib import Path

SEEDS = Path(__file__).resolve().parents[1] / "seeds"
TARGETS = {
    "beneficiaries": SEEDS / "seed_beneficiaries.json",
    "external": SEEDS / "seed_external_records.json",
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Pretty-print a slice of seed JSON.")
    parser.add_argument("--file", choices=sorted(TARGETS), default="beneficiaries")
    parser.add_argument("--count", type=int, default=5)
    args = parser.parse_args()

    path = TARGETS[args.file]
    if not path.exists():
        print(f"Missing seed file: {path}")
        return 1
    with open(path, encoding="utf-8") as fh:
        records = json.load(fh)
    print(json.dumps(records[: args.count], indent=2, ensure_ascii=False))
    print(f"... {len(records):,} records total in {path.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())