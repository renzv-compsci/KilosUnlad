# ML Handoff Instructions for Charles Cabatian (ML Lead)

## 1. Data Acquisition & Local Generation

The Machine Learning partitions are **not committed to Git** to prevent repository bloat. Instead, they are deterministically generated from the JSON source of truth located in `data-pipeline/seeds/`.

To obtain your training matrices, follow these exact steps:

### Step 1: Pull the Repository & Navigate

Ensure you are on the `phase-3-integration` branch (or `main`) and navigate to the data pipeline directory:

```bash
cd data-pipeline
```

### Step 2: Install Partition Dependencies

The partition script requires `pandas` and `scikit-learn`. If your ML environment does not have them, install the pipeline requirements:

```bash
pip install pandas scikit-learn
```

### Step 3: Generate the Stratified Partitions

Run the partition engine. This script reads the 100,000 noisy JSON records from `seeds/`, merges them, and outputs the 70/15/15 stratified CSV splits into a locally created `partitions/` folder:

```bash
python scripts/stratified_partition.py
```

**Output files:**

* `data-pipeline/partitions/train.csv`
* `data-pipeline/partitions/val.csv`
* `data-pipeline/partitions/test.csv`

### Step 4: Load into Your ML Environment

You can now load the CSVs directly into your Jupyter Notebook or Python training script:

```python
import pandas as pd

train_df = pd.read_csv("data-pipeline/partitions/train.csv")
val_df = pd.read_csv("data-pipeline/partitions/val.csv")
test_df = pd.read_csv("data-pipeline/partitions/test.csv")
```

---

## 2. Multi-Model Training & Evaluation Pipeline

To ensure academic rigor and establish a robust baseline, you are required to train, evaluate, and compare three tree-based ensemble classifiers on the `train.csv` partition:

1. **LightGBM** (Primary Candidate)
2. **XGBoost**
3. **Random Forest**

### Evaluation Metrics

Because the target variable (`true_swdi_level`) is a 3-class ordinal problem (1, 2, 3) with intentional class imbalances, optimize for **Macro F1-Score** and **ROC-AUC (One-vs-Rest)**.

Do not rely solely on accuracy.

---

## 3. SHAP Integration (Explainable AI)

The system architecture requires SHAP explainability for the Human-in-the-Loop (HITL) field workflow.

* Extract SHAP values for the **best-performing model** selected in Step 2.
* Ensure the SHAP feature names map exactly to the 6 core proxy features defined in `ml_feature_dictionary.md`.
* The FastAPI endpoint must return these SHAP weights in the response payload to satisfy the `ml-swdi-inference.json` contract.

---

## 4. Model Selection & Production Deployment

**CRITICAL CONSTRAINT:** The `MASTER_TURNOVER.md` enforces a strict **2500ms total inference deadline** and a **1 MiB response cap** for the ML microservice.

* **Do not deploy all three models.** Select the single model with the highest Macro F1-Score on the `test.csv` partition.
* Export the winning model as a `.joblib` file (e.g., `lightgbm_swdi_v1.joblib`, `xgboost_swdi_v1.joblib`, or `rf_swdi_v1.joblib`).
* Place the `.joblib` file in the `ml-service/models/` directory so the Docker container can mount it in RAM.
* Ensure the FastAPI `POST /api/v1/predict-swdi` endpoint loads **only this single model** to guarantee sub-second inference latency.

---

## 5. Handling the Synthetic Noise

The training data has been intentionally corrupted by the `noise_engine.py` (Task 2.5) to bridge the Sim-to-Real gap:

* **Label Noise (4%):** `enrolled_level` does not always match `true_swdi_level`. **Always train on `true_swdi_level`.**
* **Feature Noise (10%):** Utility readings (`kwh_monthly`) have ±15% skew.
* **GPS Jitter:** Coordinates are offset by up to 200m.

**Do not attempt to "clean" this noise.** It is mathematically necessary to prevent the tree-based models from overfitting to perfect synthetic boundaries. The noise forces the models to learn robust, generalized splits.

---

## 6. Deliverables for Integration (Task 3.2)

Once training and SHAP extraction are complete, provide the following for the end-to-end integration test:

1. The serialized `.joblib` model file.
2. The `ml-service` Docker container configured to expose `POST /api/v1/predict-swdi` on port 8000.
3. A sample JSON response demonstrating the SHAP weight payload structure.
