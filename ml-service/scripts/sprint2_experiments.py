"""
sprint2_experiments.py
Sprint 2 (ML-02, ML-03, ML-06): E1-E5 under the binding protocol in
docs/integration/SCRUM_INTEGRATION_PLAN.md (Sprint 2) and F1_DISPOSITION_MEMO.md §3.

Inputs (produced by the existing pipeline; this script never downloads data):
  --empirical  data-pipeline/seeds/features_swdi_clean.parquet
               (notebooks 01 -> 02 from data/raw/fies_raw.csv)
  --synthetic  data-pipeline/partitions/train_features_70k.parquet
               (scripts/stratified_partition.py)

Protocol:
  * Features are exactly the frozen ml-swdi-inference v1.1 vector (guardrail 1).
  * One stratified 70/15/15 empirical split, seed 42; the empirical test split is
    never used for fitting or tuning and is excluded from every blend (guardrails 2, 3).
  * Hyperparameter search uses stratified CV on the empirical training fold only (guardrail 4).
  * Pre-registered selection: macro F1 on the empirical holdout; tie-break = higher
    minimum per-class F1.
  * Every run records seed, split hashes, library versions and row counts (guardrail 5);
    output passes ml-service/scripts/audit_leakage.py.

Experiments: E1 empirical/defaults; E2 empirical/balanced; E3 empirical/balanced/tuned;
E4a, E4b empirical + synthetic at weight 0.3 / 0.5 (balanced, E3 params);
E5 pretrain on synthetic, fine-tune on empirical (balanced, E3 params).

Usage (repo root):
  python ml-service/scripts/sprint2_experiments.py [--out ml-service/artifacts/v2] [--evidence DIR] [--quick]
The deployed v1 artifact is never overwritten; promotion is a separate, reviewed step.
"""
import argparse
import hashlib
import json
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
import shap
import sklearn
from scipy.stats import loguniform, randint, uniform
from sklearn.metrics import f1_score, roc_auc_score
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, train_test_split

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "docs" / "contracts" / "ml" / "ml-swdi-inference.json"
SEED = 42
CLASSES = [1, 2, 3]
SEARCH_SPACE = {
    "num_leaves": randint(8, 128),
    "max_depth": randint(3, 12),
    "learning_rate": loguniform(0.01, 0.3),
    "min_child_samples": randint(10, 200),
    "subsample": uniform(0.6, 0.4),
    "colsample_bytree": uniform(0.6, 0.4),
}


def frozen_features():
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    return list(contract["request"]["demographics"])


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_index(index):
    return hashlib.sha256(",".join(map(str, sorted(int(i) for i in index))).encode()).hexdigest()


def load_empirical(path, features):
    df = pd.read_parquet(path)
    missing = [c for c in features + ["swdi_level_true"] if c not in df.columns]
    if missing:
        raise SystemExit(f"[FATAL] {path} lacks columns {missing}; re-run notebook 02.")
    X = df[features].rename(columns=lambda c: f"demographics.{c}")
    y = df["swdi_level_true"].astype(int)
    if sorted(y.unique()) != CLASSES:
        raise SystemExit(f"[FATAL] empirical labels must be {CLASSES}, found {sorted(y.unique())}")
    return X, y


def load_synthetic(path, features):
    df = pd.read_parquet(path)
    cols = [f"demographics.{c}" for c in features]
    return df[cols], df["true_swdi_level"].astype(int)


def evaluate(model, X, y):
    pred = model.predict(X) + 1
    proba = model.predict_proba(X)
    per_class = f1_score(y, pred, average=None, labels=CLASSES)
    return {"macro_f1": float(f1_score(y, pred, average="macro")),
            "per_class_f1": [float(v) for v in per_class],
            "min_class_f1": float(per_class.min()),
            "roc_auc_ovr": float(roc_auc_score(y, proba, multi_class="ovr", labels=CLASSES))}


def classifier(balanced, params=None, n_estimators=200):
    return lgb.LGBMClassifier(objective="multiclass", num_class=3, random_state=SEED, verbose=-1,
                              n_estimators=n_estimators, subsample_freq=1 if params and "subsample" in params else 0,
                              class_weight="balanced" if balanced else None, **(params or {}))


def run(args):
    features = frozen_features()
    emp_path, syn_path = Path(args.empirical), Path(args.synthetic)
    for p, how in [(emp_path, "run data-pipeline notebooks 01 then 02 (needs data/raw/fies_raw.csv)"),
                   (syn_path, "run python data-pipeline/scripts/stratified_partition.py")]:
        if not p.exists():
            raise SystemExit(f"[FATAL] {p} not found: {how}.")

    X, y = load_empirical(emp_path, features)
    idx_train, idx_rest = train_test_split(X.index, test_size=0.30, stratify=y, random_state=SEED)
    idx_val, idx_test = train_test_split(idx_rest, test_size=0.50, stratify=y.loc[idx_rest], random_state=SEED)
    Xtr, ytr, Xva, yva, Xte, yte = X.loc[idx_train], y.loc[idx_train], X.loc[idx_val], y.loc[idx_val], X.loc[idx_test], y.loc[idx_test]
    Xs, ys = load_synthetic(syn_path, features)
    if args.quick:
        Xs, ys = Xs.iloc[:3000], ys.iloc[:3000]

    def fit(model, Xf, yf, **kw):
        model.fit(Xf, yf - 1, **kw)  # classes 1-3 -> 0-2, as in v1
        return model

    results, models = {}, {}
    def record(name, model, training_rows, note):
        results[name] = {"training_rows": training_rows, "note": note,
                         "validation": evaluate(model, Xva, yva), "empirical_holdout": evaluate(model, Xte, yte)}
        models[name] = model
        print(f"  {name:4s} holdout macroF1={results[name]['empirical_holdout']['macro_f1']:.4f} "
              f"min-class={results[name]['empirical_holdout']['min_class_f1']:.4f}  ({note})")

    print("=== Sprint 2 experiments (empirical holdout = selection split) ===")
    record("E1", fit(classifier(False), Xtr, ytr), {"empirical": len(Xtr)}, "empirical, defaults")
    record("E2", fit(classifier(True), Xtr, ytr), {"empirical": len(Xtr)}, "empirical, balanced")

    search = RandomizedSearchCV(classifier(True), SEARCH_SPACE, n_iter=4 if args.quick else 40,
                                scoring="f1_macro", random_state=SEED, n_jobs=1, refit=True,
                                cv=StratifiedKFold(3 if args.quick else 5, shuffle=True, random_state=SEED))
    search.fit(Xtr, ytr - 1)
    best = {k: (float(v) if isinstance(v, (np.floating, float)) else int(v)) for k, v in search.best_params_.items()}
    record("E3", search.best_estimator_, {"empirical": len(Xtr)}, f"empirical, balanced, tuned (CV on train folds) {best}")

    emp_w = np.ones(len(Xtr))
    for name, w in [("E4a", 0.3), ("E4b", 0.5)]:
        Xb, yb = pd.concat([Xtr, Xs]), pd.concat([ytr, ys])
        weights = np.concatenate([emp_w, np.full(len(Xs), w)])
        record(name, fit(classifier(True, best), Xb, yb, sample_weight=weights),
               {"empirical": len(Xtr), "synthetic": len(Xs)}, f"blend, synthetic weight {w}")

    pre = fit(classifier(True, best), Xs, ys)
    record("E5", fit(classifier(True, best, n_estimators=100), Xtr, ytr, init_model=pre.booster_),
           {"empirical": len(Xtr), "synthetic_pretrain": len(Xs)}, "pretrain synthetic, fine-tune empirical")

    winner = max(results, key=lambda k: (round(results[k]["empirical_holdout"]["macro_f1"], 6),
                                          results[k]["empirical_holdout"]["min_class_f1"]))
    print(f"\n  WINNER: {winner}")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    model = models[winner]
    sv = shap.TreeExplainer(model).shap_values(Xte)
    arr = np.array(sv)
    importance = (np.mean([np.abs(s).mean(axis=0) for s in sv], axis=0) if isinstance(sv, list)
                  else np.abs(arr).mean(axis=(0, 2)) if arr.ndim == 3 else np.abs(arr).mean(axis=0))
    model_file = "lightgbm_swdi_v2.joblib"
    joblib.dump(model, out / model_file)
    test_set = set(int(i) for i in idx_test)
    used = set(int(i) for i in idx_train)
    metadata = {
        "model_name": "LightGBM", "model_file": model_file,
        "training_date": datetime.now(timezone.utc).isoformat(),
        "feature_names": [f"demographics.{f}" for f in features],
        "shap_importance": {f"demographics.{f}": float(v) for f, v in zip(features, np.ravel(importance))},
        "target_classes": CLASSES,
        "random_seed": SEED,
        "library_versions": {"python": platform.python_version(), "lightgbm": lgb.__version__,
                             "scikit-learn": sklearn.__version__, "pandas": pd.__version__,
                             "numpy": np.__version__, "shap": shap.__version__},
        "row_counts": {"empirical_total": len(X), "empirical_train": len(Xtr), "empirical_validation": len(Xva),
                       "empirical_test": len(Xte), "synthetic_available": len(Xs)},
        "split_hashes": {"train": sha256_index(idx_train), "validation": sha256_index(idx_val),
                         "test": sha256_index(idx_test), "empirical_source_sha256": sha256_file(emp_path),
                         "synthetic_source_sha256": sha256_file(syn_path)},
        "empirical_test_rows_in_training": len(test_set & used),
        "selection": {"criterion": "macro F1 on the empirical holdout; tie-break: higher minimum per-class F1",
                      "winner": winner, "winner_metrics": results[winner]},
        "experiments": results,
        "quick_mode": bool(args.quick),
        "data_provenance": "PSA FIES 2015 (data-pipeline/docs/data_provenence.md) via notebooks 01-02; "
                           "synthetic partitions via scripts/stratified_partition.py",
    }
    (out / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"  exported {out / model_file} + model_metadata.json")

    if args.evidence:
        ev = Path(args.evidence)
        ev.mkdir(parents=True, exist_ok=True)
        rows = ["| Exp | Holdout macro F1 | Per-class F1 (L1/L2/L3) | ROC-AUC OvR | Val macro F1 | Training rows | Notes |",
                "| --- | --- | --- | --- | --- | --- | --- |"]
        for k, r in results.items():
            h = r["empirical_holdout"]
            rows.append(f"| {k}{' (winner)' if k == winner else ''} | {h['macro_f1']:.4f} | "
                        f"{' / '.join(f'{v:.3f}' for v in h['per_class_f1'])} | {h['roc_auc_ovr']:.4f} | "
                        f"{r['validation']['macro_f1']:.4f} | {r['training_rows']} | {r['note']} |")
        (ev / "sprint2_results.md").write_text("\n".join(rows) + "\n", encoding="utf-8")
        (ev / "model_metadata_v2.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--empirical", default=str(ROOT / "data-pipeline" / "seeds" / "features_swdi_clean.parquet"))
    parser.add_argument("--synthetic", default=str(ROOT / "data-pipeline" / "partitions" / "train_features_70k.parquet"))
    parser.add_argument("--out", default=str(ROOT / "ml-service" / "artifacts" / "v2"))
    parser.add_argument("--evidence", default="")
    parser.add_argument("--quick", action="store_true", help="small search for mechanics tests only; not a result")
    run(parser.parse_args(argv))
    return 0


if __name__ == "__main__":
    sys.exit(main())
