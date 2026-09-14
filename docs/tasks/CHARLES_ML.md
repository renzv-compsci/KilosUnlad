# Engineering Task Roadmap: Machine Learning & Analytics
**Lead:** Charles Cabatian  
**Primary Domain:** `/ml-service/`  
**Core Technologies:** Python 3.10, FastAPI, LightGBM, SHAP, Scikit-Learn, Pydantic, Uvicorn  
**Container:** `kilosunlad-ml` (Internal Port `8000`)  

---

## 1. Context & Architecture Summary for Charles

You are building the **AI & Analytics Engine** for **KilosUnlad**, a decision-support system for the DSWD 4Ps program. 

Your service runs as an isolated FastAPI microservice inside Docker. It has two analytical responsibilities:
1. **Proxy-Means Testing (PMT):** Predict a household's true well-being level (DSWD SWDI: *Level 1: Survival*, *Level 2: Subsistence*, *Level 3: Self-Sufficiency*) using LightGBM and explain the prediction using SHAP values.
2. **ATM Telemetry Anomaly Detection:** Detect illegal card-pawning rings (*Sangla-ATM*) by analyzing LandBank ATM transaction velocities and batch patterns.

**Your Boundaries:**
* You do **not** touch the database directly; Mae’s Node.js backend sends you HTTP requests and saves your outputs.
* Your endpoints must strictly match `/docs/contracts/ml/ml-swdi-inference.json` and `/docs/contracts/ml/ml-atm-telemetry.json`.

---

## Phase 1: Environment Verification & Contract Validation (Days 1–3)
*Goal: Verify local container setup, validate Pydantic models, and ensure mock endpoints respond.*

- [ ] **Task 1.1: Local Virtual Environment & Dependency Installation**
  - Path: `/ml-service/requirements.txt`
  - Create a local Python 3.10 virtual environment (`python -m venv .venv`) and install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
  - *Definition of Done (DoD):* All packages (`fastapi`, `lightgbm`, `shap`, `pydantic`, `joblib`) install with zero wheel compilation errors.

- [ ] **Task 1.2: Boot Microservice & Validate Swagger Documentation**
  - Paths: `/ml-service/app/main.py`, `/ml-service/app/core/config.py`
  - Run the development server locally:
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```
  - Open `http://localhost:8000/docs` in your browser.
  - *DoD:* Interactive Swagger UI renders `/health`, `/api/v1/predict-swdi`, and `/api/v1/score-atm-stream`.

- [ ] **Task 1.3: Contract Compliance Verification**
  - Paths: `/ml-service/app/schemas/inference.py`, `/ml-service/app/schemas/telemetry.py`
  - Execute test requests via Swagger UI or `curl` using the sample payloads from:
    - `/docs/contracts/ml/ml-swdi-inference.json`
    - `/docs/contracts/ml/ml-atm-telemetry.json`
  - *DoD:* Endpoints respond with HTTP `200 OK` and match the contract JSON structures 1:1.

*Daily Standup Deliverable (Phase 1):*  
> "FastAPI microservice is running locally on Port 8000 with interactive Swagger docs; Pydantic schemas validated against frozen contracts."

---

## Phase 2: Core Machine Learning & Anomaly Engineering (Days 4–8)
*Goal: Train the LightGBM classifier on real PSA FIES data, integrate SHAP, and code the ATM velocity algorithm.*

- [ ] **Task 2.1: Ingest Clean Training Matrix from Renz**
  - Source: `/data-pipeline/seeds/features_swdi_clean.parquet`
  - Load the feature matrix into a training script (`train_pipeline.py`).
  - Verify feature columns: `household_size`, `dependents_ratio`, `head_education_level`, `wall_score`, `roof_score`, `water_access_level`.
  - Verify target column: `swdi_level` (integers 1, 2, 3).
  - *DoD:* 80/20 train-test split created with stratified class balance.

- [ ] **Task 2.2: Train & Serialize LightGBM Classifier**
  - Path: `/ml-service/app/services/classifier.py`
  - Train `LGBMClassifier(objective='multiclass', num_class=3, n_estimators=100, learning_rate=0.05)`.
  - Target metrics: Macro F1-score $\ge 85\%$ across all 3 tiers.
  - Save trained model weights to `/ml-service/artifacts/lightgbm_swdi_v1.joblib`.
  - Update `/ml-service/artifacts/model_metadata.json` with accuracy and training date.
  - *DoD:* Model serializes cleanly and achieves $\ge 85\%$ F1-score on test split.

- [ ] **Task 2.3: In-Memory Lifespan Model Loader**
  - Path: `/ml-service/app/main.py`
  - In the `@asynccontextmanager lifespan(app)` function, load `lightgbm_swdi_v1.joblib` into `ml_models["swdi_classifier"]`.
  - *DoD:* Model is loaded once on server startup; per-request inference time is under 15 milliseconds.

- [ ] **Task 2.4: Implement SHAP Explainability Engine**
  - Path: `/ml-service/app/services/explainer.py`
  - Initialize `shap.TreeExplainer(model)`.
  - For incoming predictions, extract the top 2 positive and top 2 negative contributing indicators.
  - Attach human-readable explanations (e.g., *"Educational attainment strongly correlates with Level 3 transition"*).
  - *DoD:* `predict-swdi` endpoint returns real SHAP weights matching the contract schema.

- [ ] **Task 2.5: Implement Sangla-ATM Sliding-Window Algorithm**
  - Path: `/ml-service/app/services/anomaly.py`
  - Process transaction batches received at `/api/v1/score-atm-stream`:
    - Check 1: Average swipe interval $< 45\text{ seconds}$ (+35 pts).
    - Check 2: Transaction executed between 01:00 AM and 04:30 AM (+30 pts).
    - Check 3: Card cluster overlap rate $\ge 70\%$ (+40 pts).
  - Return `sangla_atm_risk_score` ($0-100$) and `is_anomalous_batch: true` if score $\ge 70$.
  - *DoD:* Automated unit test flags suspicious test clusters correctly.

*Daily Standup Deliverable (Phase 2):*  
> "LightGBM classifier trained on PSA data with $\ge 85\%$ F1-score; SHAP explainability and Sangla-ATM detection algorithms implemented."

---

## Phase 3: Service Integration & Performance Profiling (Days 9–12)
*Goal: Connect with Mae's Node.js backend over Docker network and profile latency.*

- [ ] **Task 3.1: Connect Route Handlers to Real Services**
  - Update `/ml-service/app/api/v1/predict.py`: Replace dummy logic with calls to `classifier.py` and `explainer.py`.
  - Update `/ml-service/app/api/v1/telemetry.py`: Replace dummy logic with calls to `anomaly.py`.
  - *DoD:* Endpoints execute real calculations and return live predictions.

- [ ] **Task 3.2: Cross-Container Network Testing with Mae**
  - Boot containers via `docker-compose up server ml-service`.
  - Mae triggers `mlClient.service.js` from Express $\to$ sends payload to `http://ml-service:8000`.
  - Verify that response parsing succeeds and P95 latency is under 25 milliseconds.
  - *DoD:* Node.js receives real ML predictions and writes risk scores to MongoDB.

- [ ] **Task 3.3: Graceful Error Handling & Boundary Defense**
  - Verify that invalid inputs (e.g., negative household size or out-of-bounds wall score) return clean `422 Unprocessable Entity` responses without crashing the Uvicorn worker.
  - *DoD:* Zero unhandled 500 crashes during malformed payload tests.

*Daily Standup Deliverable (Phase 3):*  
> "ML microservice integrated with Node.js backend over internal Docker bridge; latency verified under 25ms."

---

## Phase 4: Model Evaluation Visualizations & Defense Prep (Days 13–15)
*Goal: Generate academic defense plots and export evaluation metrics.*

- [ ] **Task 4.1: Generate Academic Performance Visualizations**
  - Create a script (`generate_metrics.py`) to output:
    1. **Confusion Matrix:** Showing accuracy across Level 1, 2, and 3.
    2. **ROC-AUC Curves:** Showing multi-class discrimination performance.
    3. **Global SHAP Summary Plot (Beeswarm):** Proving which features most influence poverty transitions in the Philippines.
  - Save exported charts to `/docs/architecture/evaluation_metrics.png`.
  - *DoD:* High-resolution plots ready for capstone presentation slides.

- [ ] **Task 4.2: Edge-Case Adversarial Testing**
  - Test borderline cases (e.g., large family with 10 members but high education; small family with light housing materials).
  - Verify that confidence scores reflect uncertainty realistically.
  - *DoD:* Model does not produce arbitrary 1.0/0.0 extreme probabilities on borderline data.

*Daily Standup Deliverable (Phase 4):*  
> "Evaluation metrics finalized; Confusion Matrix, ROC-AUC, and SHAP summary plots generated for project defense."

---

## Phase 5: Container Optimization & Live Demo Rehearsal (Days 16–18)
*Goal: Optimize Docker image and prepare live demonstration test cases.*

- [ ] **Task 5.1: Container Build Optimization**
  - Path: `/ml-service/Dockerfile`
  - Ensure `.dockerignore` excludes unnecessary virtual environment files and caches.
  - Verify that `docker build -t kilosunlad-ml .` completes in under 2 minutes.
  - *DoD:* Final container image is under 500MB.

- [ ] **Task 5.2: Live Demo Test Case Scripting**
  - Prepare 2 specific test cases for the live panel presentation:
    1. **The Graduation Case:** A household with college education, concrete walls, and high power usage $\to$ returns Level 3 with positive SHAP education weight.
    2. **The Loan Shark Catch:** An ATM log with 12 withdrawals in 8 minutes at 2:30 AM $\to$ returns Sangla-ATM risk score of $85/100$.
  - *DoD:* Both test cases execute smoothly during end-to-end rehearsal.

*Daily Standup Deliverable (Phase 5):*  
> "ML microservice fully packaged, image size optimized, and live demo scenarios rehearsed."