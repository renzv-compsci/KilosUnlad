"""
test_sprint2_experiments.py
Mechanics test for sprint2_experiments.py (--quick). The "empirical" input here is a
FIXTURE with the notebook-02 schema built from synthetic rows: it exercises code paths
only and its scores are not results.

Usage (repo root): python -m unittest ml-service/scripts/test_sprint2_experiments.py
Needs data-pipeline/partitions (python data-pipeline/scripts/stratified_partition.py).
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

import joblib
import pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
import audit_leakage  # noqa: E402
import sprint2_experiments as s2  # noqa: E402

PARTITIONS = ROOT / "data-pipeline" / "partitions"


@unittest.skipUnless((PARTITIONS / "train_features_70k.parquet").exists(), "run stratified_partition.py first")
class Sprint2Mechanics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        tmp = Path(cls.tmp.name)
        val = pd.read_parquet(PARTITIONS / "validation_features_10k.parquet").iloc[:2000]
        fixture = pd.DataFrame({f: val[f"demographics.{f}"] for f in s2.frozen_features()})
        fixture["swdi_level_true"] = val["true_swdi_level"].values
        cls.empirical = tmp / "fixture_features_swdi_clean.parquet"
        fixture.to_parquet(cls.empirical, index=False)
        cls.out = tmp / "v2"
        cls.meta = s2.run(type("A", (), {"empirical": str(cls.empirical), "quick": True, "evidence": str(tmp / "ev"),
                                         "synthetic": str(PARTITIONS / "train_features_70k.parquet"),
                                         "out": str(cls.out)})())

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_all_experiments_ran_on_one_holdout(self):
        self.assertEqual(list(self.meta["experiments"]), ["E1", "E2", "E3", "E4a", "E4b", "E5"])
        self.assertEqual(self.meta["row_counts"]["empirical_test"], 300)  # 15% of 2,000

    def test_selection_rule(self):
        res = self.meta["experiments"]
        best = max(res, key=lambda k: (round(res[k]["empirical_holdout"]["macro_f1"], 6),
                                       res[k]["empirical_holdout"]["min_class_f1"]))
        self.assertEqual(self.meta["selection"]["winner"], best)

    def test_no_holdout_leakage_and_audit_gate_passes(self):
        self.assertEqual(self.meta["empirical_test_rows_in_training"], 0)
        code = audit_leakage.main(["--artifact", str(self.out / "lightgbm_swdi_v2.joblib"),
                                   "--metadata", str(self.out / "model_metadata.json")])
        self.assertEqual(code, 0)

    def test_artifact_serves_the_frozen_vector(self):
        model = joblib.load(self.out / "lightgbm_swdi_v2.joblib")
        names = json.loads((self.out / "model_metadata.json").read_text())["feature_names"]
        row = pd.DataFrame([[2, 1, 0, 3, 1.0, 0.8]], columns=names)
        self.assertEqual(model.predict_proba(row).shape, (1, 3))

    def test_missing_empirical_matrix_names_the_notebooks(self):
        with self.assertRaises(SystemExit) as ctx:
            s2.main(["--empirical", "/nonexistent.parquet", "--out", str(self.out / "x")])
        self.assertIn("notebooks 01 then 02", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
