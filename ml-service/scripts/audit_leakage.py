"""
audit_leakage.py
Sprint 2 ML-04 (Charles + Renz): leakage and provenance audit for an exported
SWDI classifier artifact.

Checks (guardrails 1, 3 and 5 of SCRUM_INTEGRATION_PLAN.md Sprint 2):
  F1  metadata feature_names == the frozen ml-swdi-inference v1.1 vector, in order
  F2  the fitted model expects exactly those 6 features (n_features_in_, names)
  F3  target classes are exactly [1, 2, 3]
  P1  metadata records split hashes for train/validation/test partitions
  P2  metadata asserts the empirical test rows are excluded from every training
      blend (empirical_test_rows_in_training == 0)
  P3  metadata records seed, library versions and row counts

F* checks are verifiable on any artifact. P* checks require the Sprint 2 metadata
(ML-06); on v1 they fail by design and gate the v2 release.

Usage (from repo root):
  python ml-service/scripts/audit_leakage.py [--artifact PATH] [--metadata PATH]
Exit code 0 only if every check passes.
"""
import argparse
import json
import sys
from pathlib import Path

import joblib

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "docs" / "contracts" / "ml" / "ml-swdi-inference.json"


def frozen_vector():
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    return [f"demographics.{k}" for k in contract["request"]["demographics"]]


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", default=str(ROOT / "ml-service" / "artifacts" / "lightgbm_swdi_v1.joblib"))
    parser.add_argument("--metadata", default=str(ROOT / "ml-service" / "artifacts" / "model_metadata.json"))
    args = parser.parse_args(argv)

    metadata = json.loads(Path(args.metadata).read_text(encoding="utf-8"))
    model = joblib.load(args.artifact)
    expected = frozen_vector()
    results = []

    def record(check_id, label, passed, detail=""):
        results.append(passed)
        print(f"  [{'PASS' if passed else 'FAIL'}] {check_id} {label}" + (f" — {detail}" if detail else ""))

    print(f"=== ML-04 Leakage & Provenance Audit: {Path(args.artifact).name} ===")
    print(f"Frozen vector (contract v{json.loads(CONTRACT.read_text())['version']}): {expected}\n")

    record("F1", "metadata feature_names equal the frozen vector (order included)",
           metadata.get("feature_names") == expected, str(metadata.get("feature_names")))
    fitted_names = list(getattr(model, "feature_name_", []) or getattr(model, "feature_names_in_", []))
    n_in = getattr(model, "n_features_in_", None)
    record("F2", "fitted model expects exactly 6 features with the frozen names",
           n_in == len(expected) and [n.replace("demographics_", "demographics.") for n in fitted_names] in ([], expected),
           f"n_features_in_={n_in}, names={fitted_names}")
    record("F3", "target classes are [1, 2, 3]", metadata.get("target_classes") == [1, 2, 3], str(metadata.get("target_classes")))

    splits = metadata.get("split_hashes") or {}
    record("P1", "split hashes recorded for train/validation/test",
           all(k in splits for k in ("train", "validation", "test")), "missing: split_hashes" if not splits else str(sorted(splits)))
    record("P2", "empirical test rows excluded from all training blends",
           metadata.get("empirical_test_rows_in_training") == 0,
           f"empirical_test_rows_in_training={metadata.get('empirical_test_rows_in_training')!r}")
    missing = [k for k in ("random_seed", "library_versions", "row_counts") if k not in metadata]
    record("P3", "seed, library versions and row counts recorded", not missing, f"missing: {missing}" if missing else "")

    print(f"\n{sum(results)}/{len(results)} checks passed.")
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
