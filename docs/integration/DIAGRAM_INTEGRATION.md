Based on the official **CCSFEN1L (Introduction to Software Engineering)** project documentation template from National University, here is your complete visual deliverables breakdown.

We will **not overengineer this**. We will satisfy every mandatory figure and table in the template, add **only one high-value optional diagram** that fits KilosUnlad, and assign each deliverable to the exact team member, domain, and Git branch.

---

# 1. Master Visual Deliverables Matrix

| Template Section | Figure / Artifact Name | Diagram / Visual Type | Purpose in KilosUnlad | Assigned Owner | Subsystem Domain | Working Git Branch |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Section 6.1** | **Figure 1** | **Use Case Diagram** | Maps user roles (Director, Worker, Auditor) to system capabilities. | **Markie Angelo** | Frontend / UX | `frontend-markie` |
| **Section 6.2** | **Figure 2** | **Activity Diagram** | Illustrates the step-by-step audit lifecycle from ingestion to graduation. | **Renz Viloria** | Project Lead / Systems | `data-renz` |
| **Section 6.3** | **Figure 3** | **Class Diagram** | Maps Mongoose models, attributes, methods, and relationships. | **Mae Santos** | Backend Core | `backend-mae` |
| **Section 6.4** | **Figure (Optional)** | **Sequence Diagram** | Traces the transactional task dispatch across Frontend, Backend, and DB. | **Mae Santos** | Backend Core | `backend-mae` |
| **Section 7.0** | **Figure 4** | **System Architecture** | Displays the 6-layer decoupled engine (Client, Nginx, Express, FastAPI, Mongo). | **Renz Viloria** | Systems Architecture | `main` |
| **Section 8.1** | **Figure 5** | **Entity Relationship Diagram (ERD)** | Visualizes the 6 MongoDB collections, embedded schemas, and references. | **Dustin Martinez** | Database | `database-dustin` |
| **Section 8.2** | **Table** | **Database Collections Table** | Lists all 6 collections, storage models, and functional purposes. | **Dustin Martinez** | Database | `database-dustin` |
| **Section 9.1–9.4** | **Screenshots** | **User Interface Design** | Captures Login, Dashboard, Dispatch Modal, Tablet PWA, and COA Inspector. | **Markie Angelo** | Frontend / UX | `frontend-markie` |
| **Section 11.0** | **Walkthrough** | **Transaction Processing** | Demonstrates `Input → Validation → Processing → DB Update → Output`. | **Mae Santos** | Backend / Architecture | `backend-mae` |
| **Section 12.0 / App. D**| **Plots / Charts** | **Model Evaluation Plots** | Confusion Matrix, ROC-AUC, and Global SHAP Beeswarm summary plots. | **Charles Cabatian**| Machine Learning | `ml-charles` |

---

# 2. Detailed Diagram Specifications & Descriptions

---

### 2.1 Use Case Diagram (Section 6.1 — Figure 1)
* **Assigned To:** Markie Angelo (Frontend Lead)
* **Branch:** `frontend-markie`
* **What to Draw:**
  * **Actors (Stick figures):**
    1. `Regional Director` (Admin)
    2. `Municipal Link` (Field Social Worker)
    3. `COA State Auditor` (Independent Auditor)
    4. `Automated Scheduler` (System Actor for Ingestion & Cron)
  * **Core Use Cases (Ovals):**
    * *Authenticate & Manage Session* (Shared)
    * *View Triage Queue & Filter Anomalies* (Director, Auditor)
    * *Dispatch Field Investigation Task* (Director)
    * *Download Assigned Tasks Offline* (Municipal Link)
    * *Complete Field Checklist & Capture Geotagged Evidence* (Municipal Link)
    * *Sync Offline Reports* (Municipal Link)
    * *Initiate 15-Day Appeal Notice* (Director)
    * *Verify Cryptographic Hash Chain* (Auditor, Director)
    * *Toggle Calamity Moratorium* (Director)
* **Template Description Text:**  
  *"Figure 1 illustrates the functional interactions between system actors and the KilosUnlad platform. It depicts role-based boundaries enforcing the Human-in-the-Loop workflow, where administrators dispatch cases, field workers conduct verified inspections, and external auditors verify cryptographic ledger continuity."*

---

### 2.2 Activity Diagram (Section 6.2 — Figure 2)
* **Assigned To:** Renz Viloria (PM / Systems Architect)
* **Branch:** `data-renz`
* **What to Draw (Swimlanes):**
  * Use 4 Swimlanes: `External Feeds / AI Engine`, `Regional Director`, `Municipal Link (Tablet)`, `Backend & Database`.
  * **Flow Steps:**
    1. *Start:* Scheduled sync pulls utility & LTO data.
    2. AI classifies SWDI level and computes Composite Risk Score ($S_i$).
    3. Decision diamond: Is $S_i \ge 70$?
       * *No:* Beneficiary remains `ACTIVE_COMPLIANT` $\to$ End.
       * *Yes:* Transition status to `FLAGGED_FOR_REVIEW`.
    4. Director reviews triage queue and assigns task with instructions.
    5. Municipal Link downloads task to tablet `IndexedDB`.
    6. Municipal Link visits house offline: inspects livelihood assets, inspects physical LandBank ATM card, captures photo with GPS coordinates.
    7. Worker returns to Wi-Fi $\to$ Tablet auto-syncs report.
    8. Director reviews report $\to$ Approves graduation.
    9. Status transitions to `NOTICE_OF_INELIGIBILITY` (15-day countdown starts).
    10. Decision diamond: Appeal filed within 15 days?
        * *Yes:* Schedule grievance hearing $\to$ Resolve.
        * *No:* Transition to `GRADUATED` $\to$ Append SHA-256 block to `audit_logs` $\to$ End.

---

### 2.3 Class Diagram (Section 6.3 — Figure 3)
* **Assigned To:** Mae Santos (Backend Lead)
* **Branch:** `backend-mae`
* **What to Draw:**
  * Rather than drawing hundreds of internal helper methods, draw the **6 Core Domain Entities** and their relationships:
    1. `User` (`username`, `email`, `role`, `jurisdiction`, `last_login_at`, `login()`, `verifyToken()`)
    2. `Beneficiary` (`household_id`, `head_of_household`, `address`, `demographics`, `enrolled_swdi_level`, `program_status`, `risk_assessment`)
    3. `ExternalRecord` (`matched_household_id`, `national_id`, `power_utility`, `water_utility`, `transport_registry`, `landbank_telemetry`)
    4. `VerificationTask` (`task_id`, `household_id`, `assigned_worker_id`, `task_status`, `field_findings`, `admin_resolution`)
    5. `AuditLog` (`sequence_index`, `previous_entry_hash`, `timestamp`, `actor`, `action`, `state_delta`, `entry_hash`, `computeHash()`)
    6. `SystemConfig` (`config_key`, `calamity_moratorium_zones`, `threshold_configs`)
  * **Relationships:**
    * `User` 1 $\longrightarrow$ * `VerificationTask` (assigned to)
    * `Beneficiary` 1 $\longrightarrow$ 1 `ExternalRecord` (matched by national_id)
    * `Beneficiary` 1 $\longrightarrow$ * `VerificationTask` (associated tasks)
    * All mutations generate $\longrightarrow$ `AuditLog` entries.

---

### 2.4 Other UML Diagrams: Sequence Diagram (Section 6.4)
* **Assigned To:** Mae Santos (Backend Lead)
* **Branch:** `backend-mae`
* **Why Sequence Diagram?** Section 11 of the template requires documenting *Transaction Processing*. A Sequence Diagram for **Task Dispatching** satisfies both Section 6.4 and Section 11 without drawing duplicate charts.
* **Objects / Lifelines:**
  `Desktop Client (React)` $\longrightarrow$ `API Gateway (Nginx)` $\longrightarrow$ `Task Controller (Express)` $\longrightarrow$ `Transaction Session (MongoDB)` $\longrightarrow$ `Audit Service`
* **Messages:**
  1. `POST /api/v1/tasks/dispatch` with Bearer JWT.
  2. Gateway authenticates and proxies request.
  3. Controller starts `session.withTransaction()`.
  4. Write 1: Create `VerificationTask` (`PENDING_DISPATCH`).
  5. Write 2: Update `Beneficiary` status (`UNDER_INVESTIGATION`).
  6. Write 3: Compute SHA-256 hash and append to `AuditLog`.
  7. Commit Transaction.
  8. Return HTTP `201 Created` with task details and audit receipt.

---

### 2.5 System Architecture Diagram (Section 7 — Figure 4)
* **Assigned To:** Renz Viloria (PM / Systems Architect)
* **Branch:** `main`
* **What to Draw:**
  * Clean architectural block diagram of your **6-layer decoupled engine**:
    1. **Presentation Layer:** Desktop Web Portal (React/Vite) & Mobile Tablet App (PWA + IndexedDB).
    2. **Edge Gateway:** Nginx Reverse Proxy (Port 80/443, SSL termination, 30MB upload limit, CORS elimination).
    3. **Application Server:** Node.js & Express (Port 5000, JWT/RBAC, state machine, hash chain).
    4. **AI Microservice:** Python 3.10 & FastAPI (Port 8000, LightGBM model, SHAP, Sangla-ATM detector).
    5. **Database Layer:** MongoDB 6.0 Replica Set (`rs0`, Port 27017, append-only `kilosUnladAppRole`, 2dsphere index).
    6. **Storage Layer:** Persistent volume for high-res evidence photos with SHA-256 validation.

---

### 2.6 Entity Relationship Diagram (ERD) & Table (Section 8.1 & 8.2 — Figure 5)
* **Assigned To:** Dustin Martinez (Database Lead)
* **Branch:** `database-dustin`
* **What to Draw:**
  * Clean document schema diagram showing all 6 collections, their primary keys (`_id`, `household_id`, `task_id`), embedded sub-documents (with `{ _id: false }`), and references.
* **Section 8.2 Database Tables Table (Ready to Copy):**

| Collection Name | Storage Model | Purpose in KilosUnlad |
| :--- | :--- | :--- |
| **`users`** | Document (Mongoose) | Stores user credentials, hashed passwords (bcrypt), system roles, and assigned municipal jurisdictions. |
| **`beneficiaries`** | Document (Mongoose + GeoJSON) | Stores household profiles, demographics (6 proxy-means features), enrolled SWDI levels, and composite risk assessments. |
| **`external_records`** | Document (Mongoose) | Serves as the simulated external data lake for Meralco power usage, LWUA water meters, LTO vehicles, and LandBank ATM telemetry. |
| **`verification_tasks`** | Document (Mongoose + Refs) | Manages field inspection tickets, offline findings, physical ATM card checks, geotagged evidence photos, and admin approvals. |
| **`audit_logs`** | Append-Only Document Ledger | The cryptographic Digital Seal ledger. Stores chained SHA-256 hashes, timestamps, actor IDs, and state deltas to guarantee non-repudiation. |
| **`system_configs`** | Document (Mongoose) | Stores system-wide parameters, dynamic risk score thresholds, and active Calamity Moratorium Zones (under RA 10121 [1]). |

---

### 2.7 User Interface Design Screenshots (Section 9.1–9.4)
* **Assigned To:** Markie Angelo (Frontend Lead)
* **Branch:** `frontend-markie`
* **Exact Screenshots to Capture:**
  * **9.1 Login Page:** The clean DSWD branded login screen (`/login`).
  * **9.2 Dashboard:** The Executive Dashboard showing metric ribbons (Active Beneficiaries, High Risk Count) and the regional map.
  * **9.3 Transaction Page:** The **Task Dispatch Modal Dialog** showing priority selection, assignment notes, and the Dispatch action.
  * **9.4 Other Major Interfaces:**
    1. *Triage Queue Table:* Showing flagged households with risk meters and colored trigger badges (`POWER_LIFELINE_BREACH`, `LTO_VEHICLE_MATCH`).
    2. *Mobile Field Checklist (Tablet PWA View):* Showing the single-hand offline inspection checklist with photo and GPS readout.
    3. *COA Cryptographic Chain Inspector:* Showing the green unbroken ledger shield and block sequence list.

---

### 2.8 Transaction Processing Specification (Section 11)
* **Assigned To:** Mae Santos (Backend Lead)
* **Branch:** `backend-mae`
* **Format Required by Template:** `Input → Validation → Processing → Database Update → Confirmation/Output`

```text
Transaction Name: Task Dispatch & Investigation State Lock

• Input:
  - Administrator JWT Bearer Token (HTTP Header)
  - Target household_id: "TEST-4PS-0004"
  - assigned_worker_id: "<valid_case_worker_user_id>"
  - assignment_notes: "Verify MoveIt delivery asset and LandBank cash card."
  - priority: "HIGH"
  - due_date: "2026-10-24T23:59:59.000Z"

• Validation:
  - Token verified against JWT_SECRET; actor role confirmed as REGIONAL_DIRECTOR or SUPER_ADMIN.
  - Jurisdictional scope check: Director's region/municipality matches household address.
  - Target household existence check: Household exists in database.
  - State conflict check: Rejects with 409 ACTIVE_TASK_EXISTS if an open task already exists.
  - Worker validity check: Rejects with 400 if worker is inactive or not a CASE_WORKER.

• Processing:
  - Opens MongoDB multi-document transaction session (session.withTransaction()).
  - Generates unique natural task identifier: "TSK-2026-XXXXX".
  - Fetches head hash from audit_logs collection (H_{n-1}).
  - Serializes mutation delta using Canonical JSON (fast-json-stable-stringify).
  - Computes next SHA-256 block hash: H_n = SHA256(Seq + H_{n-1} + Timestamp + Actor + Action + Delta).

• Database Update (Atomic Commit):
  1. Inserts new document into verification_tasks (task_status: "PENDING_DISPATCH").
  2. Updates beneficiaries collection: sets program_status to "UNDER_INVESTIGATION".
  3. Inserts new immutable block into audit_logs (action: "TASK_DISPATCHED").
  - Commits transaction session.

• Confirmation / Output:
  - HTTP 201 Created response returned with task_id, household_status, and audit receipt hash.
  - Screenshot: Capture the successful dispatch toast confirmation on the frontend dashboard.
```

---

### 2.9 Machine Learning Testing Visuals (Section 12 / Appendix D)
* **Assigned To:** Charles Cabatian (ML Lead)
* **Branch:** `ml-charles`
* **Visuals to Provide:**
  1. **Confusion Matrix Plot:** Demonstrating classification accuracy across Level 1 (Survival), Level 2 (Subsistence), and Level 3 (Self-Sufficiency).
  2. **Global SHAP Beeswarm Plot:** Illustrating how features (`housing_material_score`, `head_education_level`, `dependency_ratio`) influence poverty classification.
  3. **Sangla-ATM Velocity Chart:** Scatter plot showing the 38-second transaction cluster during the 02:00 AM window.

---

# 3. Action Delegation Summary for Renz (PM)

Post this message in your team chat to assign these documentation sections:

> **@team Documentation Assignments for CCSFEN1L Final Submission!**
> 
> We have mapped out all diagrams and sections to match our official NU documentation template. Please prepare the deliverables assigned to your domain:
> 
> * **@Dustin (Database):** 
>   * Figure 5: Entity Relationship Diagram (ERD) in Section 8.1.
>   * Database Collections table in Section 8.2 (specs are ready in `docs/`).
> * **@Mae (Backend):** 
>   * Figure 3: Class Diagram in Section 6.3.
>   * Sequence Diagram in Section 6.4 & Transaction Processing walkthrough in Section 11.
> * **@Markie (Frontend):** 
>   * Figure 1: Use Case Diagram in Section 6.1.
>   * Screenshots for Section 9 (Login, Dashboard, Dispatch Modal, Tablet PWA, and Audit Inspector).
> * **@Charles (ML):** 
>   * Section 10 implementation tools (Python, FastAPI, LightGBM).
>   * Appendix D: Confusion Matrix and SHAP summary plots.
> * **@Renz (Me):** 
>   * Figure 2: Activity Diagram in Section 6.2.
>   * Figure 4: System Architecture Diagram in Section 7.
>   * Overall paper compilation, problem statements, and statutory references.
> 
> We are not overengineering—stick strictly to these specifications so our documentation matches our code 1:1!

---
*All visual deliverables are now assigned to their respective owners, domains, and Git branches.*