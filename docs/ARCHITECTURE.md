# KilosUnlad: Technical System Architecture

## Component Design, Technical Stack, and System Interactions

---

## 1. System Architecture Diagram

The system employs a decoupled architecture: an asynchronous **MERN** application core paired with an isolated **Python FastAPI** analytical microservice.

```text
+===================================================================================+
| 1. PRESENTATION LAYER (FRONTEND)                                                 |
|                                                                                   |
| [ Desktop Web Application ]        [ Mobile Tablet Application ]                  |
| • Built with React & Vite          • Built with React (PWA)                     |
| • Interactive analytics & heatmaps • Local Offline Storage (IndexedDB)            |
| • Case management & verification   • Camera & Hardware GPS access                |
+=========================================+=========================================+
                                          |
                                          | HTTPS / REST Calls
                                          v
+===================================================================================+
| 2. GATEWAY & NETWORK LAYER (Nginx)                                               |
|                                                                                   |
| • SSL/TLS Security & Encryption      • Rate Limiting (Protects from DOS)          |
| • Request Routing & Load Handling    • Static Asset Delivery                     |
+=========================================+=========================================+
                                          |
                                          | Internal Routing
                                          v
+===================================================================================+
| 3. CORE APPLICATION SERVICE LAYER (Node.js & Express)                            |
|                                                                                   |
| • Authentication & Token Verification (Security rules & user permissions)        |
| • Workflow Engine (Controls status: Active -> Flagged -> Review -> Graduated)   |
| • Investigation Task Dispatcher (Assigns cases to specific locations)            |
| • Due Process Manager (Enforces the 15-day statutory appeal countdown timer)     |
| • Digital Seal Generator (Calculates SHA-256 hash chains for tamper-proof logs)  |
| • Offline Sync Consumer (Receives and validates batch data from field tablets)   |
+======================+====================================+=======================+
                       |                                    |
             Internal HTTP |                         | Database Queries
             Inference Calls v                         v (Mongoose Driver)
+=======================================+ +========================================+
| 4. AI & ANALYTICS SERVICE (Python)   | | 5. DATABASE LAYER (MongoDB)            |
|                                       | |                                        |
| • Poverty Classifier (LightGBM):     | | • Household Profiles (Demographics)   |
|   Predicts Level 1, 2, or 3 based on | | • External Data (Power, Water, LTO)   |
|   living conditions & demographics.  | | • Field Verification Tasks & Findings |
| • Rule-Based Discrepancy Engine:     | | • The Digital Seal Audit Trail        |
|   Checks utility spikes & car records.| |   (Append-only, chained log records)  |
| • ATM Telemetry Anomaly Detector:    | | • System Configuration & Calamity Data|
|   Identifies loan-shark batch swipes. | +-------------------+--------------------+
+=======================================+                     |
                                                              |
                                                              v
                                              +========================================+
                                              | 6. SECURE FILE STORAGE                 |
                                              |                                        |
                                              | • Field Verification Photos            |
                                              | • Photo SHA-256 Fingerprints & EXIF    |
                                              +========================================+
````

---

## 2. Technical Component Breakdown

### Layer 1: Presentation Layer (Frontend)

* **Desktop Web Application (React + Vite):** Engineered for office environments (Regional Directors, Supervisors, COA Auditors). Visualizes regional risk heatmaps, displays alert triage queues, manages task dispatching, and handles the 15-day appeal docket.

* **Mobile Tablet Application (React PWA):** Engineered for social workers (Municipal Links) traveling to remote mountain or island communities. Implements an **offline-first pattern** using the browser's `IndexedDB` to cache task assignments. It accesses hardware sensors via the HTML5 Geolocation API and Camera API to record geotagged field evidence without cellular reception.

### Layer 2: Gateway & Network Layer (Nginx)

* Terminates TLS 1.3 encryption (HTTPS) to secure all external communications.
* Enforces IP-based rate limiting (100 requests/minute per client IP) to protect the server from Denial-of-Service attacks.
* Serves pre-compiled static assets directly and reverse-proxies API requests (`/api/v1/*`) to the Node.js backend.

### Layer 3: Core Application Service Layer (Node.js & Express)

* **Authentication & RBAC:** Verifies JSON Web Tokens (JWT) using short-lived access tokens and secure HTTP-only cookies. Restricts write operations strictly to authorized DSWD personnel.

* **Workflow Engine:** Controls the lifecycle of each household record via an explicit state machine, preventing illegal status transitions.

* **Task Dispatcher:** Translates flagged household records into prioritized digital field inspection tickets mapped to Municipal Links by barangay.

* **Due Process Manager:** Manages the 15-day statutory countdown timer once graduation is approved, allowing families to file an appeal before cash grants are modified.

* **Digital Seal Generator:** Computes an append-only SHA-256 cryptographic hash chain across all mutating database operations using Canonical JSON formatting.

* **Offline Sync Consumer:** Accepts batch uploads from field tablets when they regain connectivity, verifying file hashes and resolving data conflicts.

### Layer 4: AI & Analytics Microservice (Python & FastAPI)

* **Poverty Classifier (LightGBM):** Evaluates observable demographic features (family size, dependency ratio, education, wall/roof materials) to predict the household's actual SWDI level (Level 1, 2, or 3). Includes **SHAP explainability** to generate feature attribution summaries for field workers.

* **Rule-Based Discrepancy Engine:** Compares the predicted tier against external records, evaluating power usage, water consumption, vehicle registrations, and telecom contracts to calculate a **Composite Risk Score (`S_i ∈ [0, 100]`)**.

* **ATM Telemetry Anomaly Detector:** Processes LandBank ATM transaction switch logs using sliding-window pattern matching. Evaluates withdrawal speed, time of day, and card groupings to identify predatory *Sangla-ATM* loan-shark batching without inspecting private balances.

### Layer 5: Database Layer (MongoDB)

* Persists data across six core collections: `users`, `beneficiaries`, `external_records`, `verification_tasks`, `audit_logs`, and `system_configs`.
* Uses `2dsphere` spatial indexing to support proximity and boundary queries.
* Operates under strict schema validation rules (`strict: true`) and restricts database credentials to append-only operations on the `audit_logs` collection.

### Layer 6: Secure File Storage

* Stores high-resolution field verification photos outside the database engine to prevent document bloat and query degradation.
* Associates each stored image with a **SHA-256 file fingerprint** and embedded EXIF/hardware GPS metadata stored in the database, ensuring uploaded evidence cannot be swapped or manipulated.

---

## 3. Technology Stack Justification & Tradeoffs

| Technology                | Architectural Role          | Why Selected                                                                                       | Tradeoffs Accepted                                                                               |
| :------------------------ | :-------------------------- | :------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **React + Vite**          | Desktop Web Client          | Fast component rendering, rapid build pipeline, rich dashboard ecosystem.                          | Requires client-side bundle management; not SEO-optimized (unnecessary for internal MIS).        |
| **React PWA + IndexedDB** | Field Tablet Client         | Runs on standard Android tablets; offline-first capability avoids native Android/Java code.        | Limited hardware access compared to native apps; browser-controlled storage limits.              |
| **Node.js & Express**     | Application Service         | Event-driven I/O ideal for API routing, JSON serialization, and workflow orchestration.            | Single-threaded nature is unsuitable for heavy ML calculations (mitigated by Python service).    |
| **Python & FastAPI**      | AI & Analytics Microservice | High-performance async microservice; native access to Python ML libraries (LightGBM, Pandas).      | Introduces cross-service HTTP overhead (mitigated via internal container networking).            |
| **LightGBM**              | Socioeconomic Classifier    | High accuracy on tabular data, low memory footprint, native support for SHAP explainability.       | Requires feature engineering to align synthetic data distributions with official SWDI standards. |
| **MongoDB**               | Primary Persistence         | Flexible JSON document structure fits semi-structured external utility records and GeoJSON points. | Lacks native SQL relational integrity constraints (enforced via Mongoose schema validators).     |
| **Nginx**                 | Reverse Proxy Gateway       | Industry-standard TLS termination, rate-limiting, and static file delivery.                        | Adds another infrastructure component to configure and monitor.                                  |

---

## 4. Failure Modes & Architectural Resilience

* **Python ML Service Outage:** If the ML service times out (**> 2.5 seconds**), the Node.js backend catches the failure and falls back to a deterministic heuristic rule engine based on raw utility thresholds. Flagged records are tagged `EVALUATED_VIA_FALLBACK` for subsequent ML reprocessing.

* **Network Loss in Remote Areas (GIDAs):** The field tablet app operates completely offline using `IndexedDB`. Reports, interviews, and photo fingerprints are stored locally and batch-uploaded once Wi-Fi is restored.

* **Direct Database Manipulation:** If an unauthorized user modifies a record directly in MongoDB, the resulting SHA-256 hash mismatch invalidates the hash chain, alerting auditors to the exact record and timestamp that was compromised.