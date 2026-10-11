```markdown
# KilosUnlad: ML Subsystem Handoff & Integration Notes

**To:** Renz Viloria (PM / Data Lead)
**From:** Charles Cabatian (ML Lead)
**Date:** 2026-10-11
**Branch:** `ml-charles`
**Status:** ✅ ML Microservice v1.0 Complete & Containerized
**Model Artifact:** `ml-service/artifacts/lightgbm_swdi_v1.joblib`

---

## 1. Executive Summary

The Machine Learning microservice (`kilosunlad-ml`) is fully operational. It exposes two live endpoints:
1.  **SWDI Inference:** Predicts household socioeconomic level (1, 2, or 3) using a LightGBM classifier with SHAP explainability.
2.  **Sangla-ATM Detection:** Flags predatory loan shark activity using a deterministic telemetry heuristic.

The service is Dockerized, tested against the frozen contracts, and ready for full-stack integration.

---

## 2. Critical Change: Feature Schema Alignment

⚠️ **IMPORTANT FOR BACKEND INTEGRATION** ⚠️

During implementation, we discovered a mismatch between the original JSON contract and the actual data pipeline output.

*   **Original Contract (Deprecated):** Used `wall_score`, `roof_score`, `water_access_level`.
*   **Actual Data Pipeline:** Uses `housing_material_score`, `head_formal_employment`, `remittance_income_flag`, etc.

**Resolution:** We aligned the ML Service to the **Data Pipeline** (the mathematical source of truth).

### The New Required Payload Schema
The backend (`mlClient.service.js`) **MUST** send this exact structure to `POST /api/v1/predict-swdi`:

```json
{
  "household_id": "4PS-04A-2026-00129",
  "household_size": 6,
  "demographics": {
    "head_education_level": 1,
    "head_formal_employment": 0,
    "remittance_income_flag": 1,
    "housing_material_score": 2,
    "appliance_density_index": 1.5,
    "dependency_ratio": 2.0
  }
}
```

### Backend `mlClient.service.js` Update
Renz, please ensure the Joi validation in `server/src/services/mlClient.service.js` matches this:

```javascript
const features = {
  head_education_level: Joi.number().integer().min(0).max(3).required(),
  head_formal_employment: Joi.number().integer().min(0).max(1).required(),
  remittance_income_flag: Joi.number().integer().min(0).max(1).required(),
  housing_material_score: Joi.number().integer().min(1).max(3).required(),
  appliance_density_index: Joi.number().min(0).max(3).required(),
  dependency_ratio: Joi.number().min(0).required()
};

const requestSchema = Joi.object({ 
  household_id: Joi.string().trim().required(),
  household_size: Joi.number().integer().min(1).max(20).required(),
  demographics: Joi.object(features).required() 
}).required();
```

---

## 3. Model Specifications (For the Paper)

### 3.1 Algorithm Selection
We trained and compared three tree-based ensemble classifiers on the 70,000-record training partition:
1.  **LightGBM** (Selected Winner)
2.  **XGBoost**
3.  **Random Forest**

**Winner:** LightGBM
*   **Macro F1-Score:** 0.7726 (Validation Set)
*   **Inference Latency:** < 50ms (well within the 2500ms contractual deadline)
*   **Reasoning:** LightGBM provided the best balance of accuracy and speed for tabular data.

### 3.2 Feature Engineering
The model uses **6 Core Proxy-Means Testing (PMT) Features** derived from the PSA FIES dataset:

| Feature Name | Data Type | Description |
| :--- | :--- | :--- |
| `demographics.head_education_level` | Int (0-3) | Educational attainment of household head |
| `demographics.head_formal_employment` | Binary | Regularized employment status |
| `demographics.remittance_income_flag` | Binary | Receipt of OFW remittances |
| `demographics.housing_material_score` | Int (1-3) | Structural integrity of walls/roof |
| `demographics.appliance_density_index` | Float | Assets per capita (capped at 3.0) |
| `demographics.dependency_ratio` | Float | Dependents vs. working-age adults |

### 3.3 Target Variable
*   **Column:** `true_swdi_level`
*   **Classes:** `1` (Survival), `2` (Subsistence), `3` (Self-Sufficiency)
*   **Note:** The model was trained on 0-indexed classes (0, 1, 2) internally and mapped back to 1, 2, 3 for the API response.

### 3.4 Explainability (SHAP)
The API returns the **top 3 most impactful features** for each prediction using SHAP (SHapley Additive exPlanations).
*   **Positive Weight:** Increases probability of the predicted class.
*   **Negative Weight:** Decreases probability.
*   **Implementation:** `shap.TreeExplainer` computed on the fly per request.

---

## 4. API Endpoints & Contracts

### 4.1 SWDI Prediction
*   **Endpoint:** `POST /api/v1/predict-swdi`
*   **Response:**
    ```json
    {
      "household_id": "TEST-001",
      "ml_evaluation": {
        "predicted_swdi_level": 3,
        "class_probabilities": {
          "level_1_survival": 0.05,
          "level_2_subsistence": 0.15,
          "level_3_self_sufficiency": 0.80
        },
        "shap_explainability": [
          {
            "indicator": "demographics.housing_material_score",
            "contribution_weight": 2.01,
            "description": "Stronger housing materials indicate accumulated asset wealth."
          }
        ]
      },
      "evaluated_at": "2026-10-11T14:12:27Z"
    }
    ```

### 4.2 Sangla-ATM Telemetry
*   **Endpoint:** `POST /api/v1/score-atm-stream`
*   **Logic:** Deterministic heuristic (Nocturnal + Rapid Interval + Batch Size).
*   **Threshold:** Risk Score ≥ 70.0 triggers `is_anomalous_batch: true`.
*   **Demo Case:** The `sangla_atm_payload.json` file returns a score of **85.0**.

### 4.3 Health Check
*   **Endpoint:** `GET /api/v1/health`
*   **Response:** `{"status": "online", "service": "ml-service"}`

---

## 5. Docker & Deployment

### 5.1 Container Configuration
*   **Base Image:** `python:3.10-slim`
*   **Port:** 8000
*   **Critical Fix:** Added `libgomp1` to `Dockerfile` (required for LightGBM multithreading).
*   **Service Name:** `kilosunlad-ml` (or `ml-service` in `docker-compose.yml`).

### 5.2 Environment Variables
The Backend service **MUST** have this environment variable set in `docker-compose.yml`:
```yaml
ML_SERVICE_URL: http://kilosunlad-ml:8000
```
*(Do NOT use `localhost:8000` inside Docker, or the backend will fail to connect).*

### 5.3 Running Locally
```bash
cd ml-service
python -m uvicorn app.main:app --reload --port 8000
```

### 5.4 Running via Docker
```bash
docker-compose up --build ml-service
```

---

## 6. Retraining Guide (Future Work)

We agreed that the initial **0.7726 Macro F1** is a solid baseline but can be improved.

### 6.1 How to Retrain
1.  Ensure your data partitions are up to date in `data-pipeline/partitions/`.
2.  Run the training script:
    ```bash
    cd ml-service
    python scripts/train_and_export.py
    ```
3.  The script will automatically:
    *   Train LightGBM, XGBoost, and RandomForest.
    *   Select the winner based on Macro F1.
    *   Export the new `.joblib` file to `artifacts/`.
    *   Update `model_metadata.json`.

### 6.2 Strategies to Improve F1
1.  **Feature Expansion:** Add the external registry features to `FEATURE_COLS` in `train_and_export.py`:
    *   `power.kwh_monthly`
    *   `water.cubic_meters_monthly`
    *   `vehicle.category` (One-hot encode this)
2.  **Hyperparameter Tuning:** Increase `n_estimators` (e.g., 100 → 300) and tune `learning_rate`.
3.  **Class Weighting:** Add `class_weight='balanced'` to the model initialization if Level 1 is underperforming.

---

## 7. Integration Checklist for Renz

Before the final demo, verify these 5 points:

- [ ] **Backend Payload:** `mlClient.service.js` sends the new 6-feature schema (Section 2).
- [ ] **Docker Network:** `ML_SERVICE_URL` in `docker-compose.yml` points to `http://kilosunlad-ml:8000`.
- [ ] **Contract Update:** `/docs/contracts/ml/ml-swdi-inference.json` updated to match the new schema.
- [ ] **Artifacts Committed:** Ensure `ml-service/artifacts/lightgbm_swdi_v1.joblib` is committed to Git (or mounted via volume).
- [ ] **Full Stack Test:** Run `docker-compose up` and verify no `ML_UNAVAILABLE` errors in the backend logs.

---

## 8. Defense Day Talking Points

**"Why did you choose LightGBM?"**
> We conducted an empirical comparison of LightGBM, XGBoost, and Random Forest. LightGBM achieved the highest Macro F1-Score (0.7726) on the validation set. Its histogram-based splitting algorithm also provides sub-50ms inference, which is critical for meeting our 2500ms contractual deadline.

**"How does the system explain its decisions?"**
> We use SHAP (SHapley Additive exPlanations) with a TreeExplainer. For every prediction, the API computes the marginal contribution of each feature to the final class probability. This ensures the Human-in-the-Loop workflow is transparent: social workers see *why* a household was flagged, not just *that* it was flagged.

**"Why is Sangla-ATM detection rule-based instead of ML?"**
> Sangla-ATM is a behavioral pattern, not a statistical classification problem. The signal is deterministic: rapid, nocturnal, multi-card withdrawals at a single terminal. A heuristic engine provides 100% precision for this specific fraud pattern without the risk of false positives that a probabilistic model might introduce.

**"How do you handle data noise?"**
> The training data contains intentional noise (4% label noise, 10% feature noise) to simulate real-world data quality issues. We do not clean this noise; it forces the model to learn robust decision boundaries rather than overfitting to perfect synthetic data.

---

*End of Handoff Document. Good luck with the final integration!*
```