"""Appendix D charts for the deployed model v2, drawn from its saved metadata only.

The raw PSA FIES rows are not stored in the repository, so the confusion matrix and ROC curves
cannot be redrawn here; these charts use the holdout metrics and SHAP importance that
ml-service/scripts/sprint2_experiments.py wrote into ml-service/artifacts/v2/model_metadata.json.
Usage: python docs/diagrams/src/ml_plots_v2.py <output dir>
"""
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
meta = json.loads((ROOT / "ml-service/artifacts/v2/model_metadata.json").read_text())
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11, "savefig.dpi": 160})
NAVY, OCHRE, BRICK, GREY = "#1F3A5F", "#C9A227", "#A84E43", "#7A8CA3"
exps = meta["experiments"]

def save(fig, name):
    fig.tight_layout(); fig.savefig(OUT / name, format="jpg", pil_kwargs={"quality": 92}); plt.close(fig)

# D5: per-class F1 of the shipped model (E1) on the real holdout
h = exps["E1"]["empirical_holdout"]
fig, ax = plt.subplots(figsize=(7, 4.2))
labels = ["Level 1\nSurvival", "Level 2\nSubsistence", "Level 3\nSelf-sufficiency"]
bars = ax.bar(labels, h["per_class_f1"], color=[BRICK, OCHRE, NAVY])
for b, v in zip(bars, h["per_class_f1"]):
    ax.text(b.get_x() + b.get_width() / 2, v + 0.02, f"{v:.3f}", ha="center", fontweight="bold")
ax.axhline(h["macro_f1"], color=GREY, ls="--", lw=1)
ax.text(2.45, h["macro_f1"] + 0.015, f"macro F1 {h['macro_f1']:.4f}", ha="right", color=GREY)
ax.set_ylim(0, 1.05); ax.set_ylabel("F1 score")
ax.set_title(f"Figure D5. Model v2 F1 per SWDI level (real holdout, ROC-AUC {h['roc_auc_ovr']:.3f})")
ax.spines[["top", "right"]].set_visible(False)
save(fig, "fig_d5_v2_per_class_f1.jpg")

# D6: the five experiments compared on the real holdout
names = list(exps.keys())
macro = [exps[n]["empirical_holdout"]["macro_f1"] for n in names]
l1 = [exps[n]["empirical_holdout"]["per_class_f1"][0] for n in names]
fig, ax = plt.subplots(figsize=(8, 4.2))
x = range(len(names)); w = 0.38
b1 = ax.bar([i - w / 2 for i in x], macro, w, label="Macro F1", color=NAVY)
b2 = ax.bar([i + w / 2 for i in x], l1, w, label="Level 1 F1", color=OCHRE)
for bars in (b1, b2):
    for b in bars:
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.01, f"{b.get_height():.3f}", ha="center", fontsize=9)
ax.set_xticks(list(x)); ax.set_xticklabels([n + (" (shipped)" if n == "E1" else "") for n in names])
ax.set_ylim(0, 0.8); ax.set_ylabel("F1 on the real holdout"); ax.legend(frameon=False)
ax.set_title("Figure D6. Training experiments E1 to E5 compared")
ax.spines[["top", "right"]].set_visible(False)
save(fig, "fig_d6_v2_experiments.jpg")

# D7: global SHAP importance of the six features
imp = meta["shap_importance"]
pretty = {"demographics.head_education_level": "Head's education level",
          "demographics.head_formal_employment": "Head has formal employment",
          "demographics.remittance_income_flag": "Receives remittances",
          "demographics.housing_material_score": "Housing material score",
          "demographics.appliance_density_index": "Appliance density",
          "demographics.dependency_ratio": "Dependency ratio"}
items = sorted(imp.items(), key=lambda kv: kv[1])
fig, ax = plt.subplots(figsize=(7.5, 4))
ax.barh([pretty.get(k, k) for k, _ in items], [v for _, v in items], color=NAVY)
for i, (_, v) in enumerate(items):
    ax.text(v + 0.01, i, f"{v:.2f}", va="center")
ax.set_xlabel("Mean |SHAP value| (bigger = more influence)")
ax.set_title("Figure D7. Which household features drive model v2")
ax.spines[["top", "right"]].set_visible(False)
save(fig, "fig_d7_v2_shap_importance.jpg")
print("written", sorted(p.name for p in OUT.glob("fig_d[5-7]*")))
