"""Appendix D model evaluation visuals, computed from the deployed v1 artifact.

Inputs (all produced by repository scripts, nothing fetched):
  ml-service/artifacts/lightgbm_swdi_v1.joblib, model_metadata.json
  data-pipeline/partitions/test_features_20k.parquet  (stratified_partition.py)
  data-pipeline/seeds/demo/sangla_atm_payload.json    (Proof 3 demo window)
Usage: python docs/diagrams/src/ml_plots.py <output dir>
"""
import json
import sys
from datetime import datetime
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.metrics import auc, confusion_matrix, f1_score, roc_curve

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11, "savefig.dpi": 160})
LEVELS = ["Level 1\nSurvival", "Level 2\nSubsistence", "Level 3\nSelf-Sufficiency"]
COLORS = ["#2B6CB0", "#C05621", "#2F855A"]

meta = json.loads((ROOT / "ml-service/artifacts/model_metadata.json").read_text())
model = joblib.load(ROOT / "ml-service/artifacts/lightgbm_swdi_v1.joblib")
features = meta["feature_names"]
test = pd.read_parquet(ROOT / "data-pipeline/partitions/test_features_20k.parquet")
X, y = test[features], test["true_swdi_level"].to_numpy() - 1
proba = model.predict_proba(X)
pred = proba.argmax(1)
macro = f1_score(y, pred, average="macro")
per_class = f1_score(y, pred, average=None)
summary = {"rows": int(len(y)), "macro_f1": round(float(macro), 4),
           "per_class_f1": [round(float(v), 4) for v in per_class]}

# 1. Confusion matrix
cm = confusion_matrix(y, pred)
fig, ax = plt.subplots(figsize=(7.6, 6.4))
norm = cm / cm.sum(1, keepdims=True)
ax.imshow(norm, cmap="Blues", vmin=0, vmax=1)
for i in range(3):
    for j in range(3):
        ax.text(j, i, f"{cm[i, j]:,}\n{norm[i, j]:.1%}", ha="center", va="center",
                color="white" if norm[i, j] > 0.55 else "#1B2430", fontsize=12)
ax.set_xticks(range(3), LEVELS)
ax.set_yticks(range(3), LEVELS)
ax.set_xlabel("Predicted SWDI level")
ax.set_ylabel("True SWDI level")
ax.set_title(f"Confusion Matrix: LightGBM v1 on the untouched synthetic test split\n"
             f"n = {len(y):,}   macro F1 = {macro:.4f}   per-class F1 = "
             + " / ".join(f"{v:.3f}" for v in per_class), fontsize=11.5)
fig.tight_layout()
fig.savefig(OUT / "fig_d1_confusion_matrix.jpg", pil_kwargs={"quality": 92})
plt.close(fig)

# 2. One-vs-rest ROC-AUC
fig, ax = plt.subplots(figsize=(7.2, 6.2))
summary["roc_auc"] = []
for k in range(3):
    fpr, tpr, _ = roc_curve(y == k, proba[:, k])
    a = auc(fpr, tpr)
    summary["roc_auc"].append(round(float(a), 4))
    ax.plot(fpr, tpr, color=COLORS[k], lw=2, label=f"{LEVELS[k].replace(chr(10), ' ')}  (AUC = {a:.3f})")
ax.plot([0, 1], [0, 1], ls="--", color="#94A3B8", lw=1, label="Chance")
ax.set_xlabel("False positive rate")
ax.set_ylabel("True positive rate")
ax.set_title("ROC Curves (one-vs-rest), LightGBM v1, synthetic test split", fontsize=12)
ax.legend(loc="lower right", frameon=False)
ax.grid(alpha=.25)
fig.tight_layout()
fig.savefig(OUT / "fig_d2_roc_auc.jpg", pil_kwargs={"quality": 92})
plt.close(fig)

# 3. Global SHAP beeswarm, one panel per class (2,000-row stratified sample)
sample = test.groupby("true_swdi_level", group_keys=False).sample(frac=2000 / len(test), random_state=42)
Xs = sample[features]
explainer = shap.TreeExplainer(model)
values = explainer.shap_values(Xs)
values = np.stack(values, axis=-1) if isinstance(values, list) else values
names = [f.split(".", 1)[1] for f in features]
fig = plt.figure(figsize=(20, 6.4))
for k in range(3):
    ax = fig.add_subplot(1, 3, k + 1)
    expl = shap.Explanation(values=values[:, :, k], data=Xs.to_numpy(), feature_names=names)
    shap.plots.beeswarm(expl, max_display=6, show=False, ax=ax, plot_size=None, color_bar=(k == 2))
    ax.set_title(f"Toward {LEVELS[k].replace(chr(10), ' ')}", fontsize=13)
    ax.set_xlabel("SHAP value (log-odds contribution)")
fig.suptitle("Global SHAP Beeswarm Summary, LightGBM v1 (n = 2,000 stratified test households)", fontsize=14)
fig.tight_layout()
fig.savefig(OUT / "fig_d3_shap_beeswarm.jpg", pil_kwargs={"quality": 92})
plt.close(fig)
summary["mean_abs_shap"] = {n: round(float(np.abs(values[:, i, :]).mean()), 4) for i, n in enumerate(names)}

# 4. Sangla-ATM velocity chart (Proof 3 demo window)
atm = json.loads((ROOT / "data-pipeline/seeds/demo/sangla_atm_payload.json").read_text())
ts = [datetime.fromisoformat(t["timestamp"].replace("Z", "+00:00")) for t in atm["transactions"]]
start = datetime.fromisoformat(atm["window_start_time"].replace("Z", "+00:00"))
minutes = [(t - start).total_seconds() / 60 for t in ts]
gaps = [(b - a).total_seconds() for a, b in zip(ts, ts[1:])]
fig, (a1, a2) = plt.subplots(1, 2, figsize=(14, 5.2), gridspec_kw={"width_ratios": [1.5, 1]})
a1.axvspan(0, 120, color="#FDE68A", alpha=.25, label="Nocturnal window 02:00-04:00 (heuristic: hour < 4)")
a1.scatter(minutes, range(1, len(ts) + 1), color="#C53030", s=60, zorder=3, label="Withdrawal (distinct card)")
a1.set_xlim(0, 30)
a1.set_xticks(range(0, 31, 5), [f"02:{m:02d}" for m in range(0, 31, 5)])
a1.set_xlabel(f"Time at {atm['terminal_id']} (UTC, 2026-09-05)")
a1.set_ylabel("Transaction #")
a1.set_title(f"{len(ts)} withdrawals in {(ts[-1] - ts[0]).total_seconds():.0f} s "
             f"({ts[0]:%H:%M:%S}-{ts[-1]:%H:%M:%S})", fontsize=12)
a1.legend(loc="upper left", frameon=True, fontsize=9.5)
a1.grid(alpha=.25)
a2.bar(range(2, len(ts) + 1), gaps, color="#C05621")
a2.axhline(60, color="#1F3A5F", ls="--", lw=1.4, label="60 s velocity threshold")
a2.axhline(np.mean(gaps), color="#C53030", ls=":", lw=1.6, label=f"mean interval {np.mean(gaps):.1f} s")
a2.set_xlabel("Transaction #")
a2.set_ylabel("Seconds since previous withdrawal")
a2.set_title("Inter-withdrawal interval", fontsize=12)
a2.set_ylim(0, 75)
a2.legend(loc="upper left", frameon=True, fontsize=9.5, ncol=2)
a2.grid(alpha=.25, axis="y")
fig.suptitle("Sangla-ATM Velocity Chart: syndicate cluster scored 85.0 / 100 (is_anomalous_batch = true)", fontsize=13)
fig.tight_layout()
fig.savefig(OUT / "fig_d4_sangla_atm_velocity.jpg", pil_kwargs={"quality": 92})
plt.close(fig)
summary["atm"] = {"transactions": len(ts), "span_s": (ts[-1] - ts[0]).total_seconds(), "mean_interval_s": round(float(np.mean(gaps)), 1)}

(OUT / "ml_plots_summary.json").write_text(json.dumps(summary, indent=2))
print(json.dumps(summary, indent=2))
