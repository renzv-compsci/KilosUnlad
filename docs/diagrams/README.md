# KilosUnlad Diagrams and Visual Deliverables

These are the visual deliverables listed in `DIAGRAM_INTEGRATION.md`, built as JPG images. Each diagram was checked against the code on branch `claude/clever-albattani-8ikzld` (models, routes, services, compose file). Where the integration spec and the code differ, the diagram follows the code, and the difference is listed under [Corrections to the spec](#corrections-to-the-spec).

## Index

| Template section | Figure | File | Owner (per spec) |
| --- | --- | --- | --- |
| 6.1 | Figure 1. Use Case Diagram | [`fig1_use_case_diagram.jpg`](fig1_use_case_diagram.jpg) | Markie Angelo |
| 6.2 | Figure 2. Activity Diagram (audit lifecycle, 4 swimlanes) | [`fig2_activity_diagram.jpg`](fig2_activity_diagram.jpg) | Renz Viloria |
| 6.3 | Figure 3. Class Diagram (6 Mongoose models + services) | [`fig3_class_diagram.jpg`](fig3_class_diagram.jpg) | Mae Santos |
| 6.4 (optional) | Sequence Diagram: transactional task dispatch | [`fig6_sequence_task_dispatch.jpg`](fig6_sequence_task_dispatch.jpg) | Mae Santos |
| 7.0 | Figure 4. System Architecture (6 layers) | [`fig4_system_architecture.jpg`](fig4_system_architecture.jpg) | Renz Viloria |
| 8.1 | Figure 5. Entity Relationship Diagram | [`fig5_entity_relationship_diagram.jpg`](fig5_entity_relationship_diagram.jpg) | Dustin Martinez |
| 8.2 | Database Collections Table | [below](#section-82-database-collections-table) | Dustin Martinez |
| 9.1 | Login page | [`ui/ui_9_1_login.jpg`](ui/ui_9_1_login.jpg) | Markie Angelo |
| 9.2 | Executive dashboard | [`ui/ui_9_2_dashboard.jpg`](ui/ui_9_2_dashboard.jpg) | Markie Angelo |
| 9.3 | Transaction page: Task Dispatch modal | [`ui/ui_9_3_dispatch_modal.jpg`](ui/ui_9_3_dispatch_modal.jpg) | Markie Angelo |
| 9.4 | Triage queue (with risk scores and trigger badges) | [`ui/ui_9_4a_triage_queue.jpg`](ui/ui_9_4a_triage_queue.jpg), [`ui/ui_9_4b_triage_shap_drawer.jpg`](ui/ui_9_4b_triage_shap_drawer.jpg) | Markie Angelo |
| 9.4 | Tablet PWA: assigned tasks and field checklist (photo, GPS, SHA-256) | [`ui/ui_9_4c_tablet_assigned_tasks.jpg`](ui/ui_9_4c_tablet_assigned_tasks.jpg), [`ui/ui_9_4d_tablet_field_checklist.jpg`](ui/ui_9_4d_tablet_field_checklist.jpg) | Markie Angelo |
| 9.4 | COA cryptographic chain inspector | [`ui/ui_9_4e_coa_chain_inspector.jpg`](ui/ui_9_4e_coa_chain_inspector.jpg) | Markie Angelo |
| 11.0 | Transaction Processing walkthrough plus confirmation screenshot | [below](#section-11-transaction-processing) and [`ui/ui_11_dispatch_confirmation.jpg`](ui/ui_11_dispatch_confirmation.jpg) | Mae Santos |
| 12 / App. D | Confusion matrix | [`appendix-d/fig_d1_confusion_matrix.jpg`](appendix-d/fig_d1_confusion_matrix.jpg) | Charles Cabatian |
| 12 / App. D | ROC-AUC (one-vs-rest) | [`appendix-d/fig_d2_roc_auc.jpg`](appendix-d/fig_d2_roc_auc.jpg) | Charles Cabatian |
| 12 / App. D | Global SHAP beeswarm (one panel per class) | [`appendix-d/fig_d3_shap_beeswarm.jpg`](appendix-d/fig_d3_shap_beeswarm.jpg) | Charles Cabatian |
| 12 / App. D | Sangla-ATM velocity chart | [`appendix-d/fig_d4_sangla_atm_velocity.jpg`](appendix-d/fig_d4_sangla_atm_velocity.jpg) | Charles Cabatian |

The UI screenshots come from the running system with real API data (Demo Case A, the test accounts). They are not mockups. The dashboard's "Regional snapshot" tiles are labelled *Sample data* in the app itself.

## Figure captions (ready to paste)

- **Figure 1:** Figure 1 illustrates the functional interactions between system actors and the KilosUnlad platform. It shows the role-based boundaries that enforce the Human-in-the-Loop workflow:
  - administrators assess and dispatch cases, review field reports, issue notices, keep households on the program and record appeal hearing outcomes;
  - field workers conduct verified inspections that sync from offline tablets;
  - the COA auditor independently verifies the continuity of the cryptographic ledger.

  Every state-changing use case includes sealing a SHA-256 audit block.
- **Figure 2:** The audit lifecycle from external-record ingestion to graduation or retention, in four swimlanes:
  - **Calamity check and cooldown:** an active calamity moratorium, or a retention in the last 180 days, stops the assessment.
  - **Flagging:** the composite risk score S_i ≥ 70 raises the flag.
  - **Field visit:** the field report is accepted only when the photo hash matches and the GPS fix is within 250 m.
  - **Director decision:** after reviewing the report and its hash-verified photos, the director either keeps the household on the program (`BENEFICIARY_RETAINED`) or issues the notice.
  - **Appeal window:** grants continue for 15 days. With no appeal, graduation is completed; with an appeal, the hearing outcome decides (granted: back to active; denied: graduated).
- **Figure 3:** The six Mongoose domain models with their real attributes, enums and relationships. The services that hold the operations are shown too: `AuthService.login`, `authenticate` token verification, `computeEntryHash`, `WorkflowPersistence` and `Resolution` (report review, notice, retention, hearing outcome, graduation). `AuditAction` includes `BENEFICIARY_RETAINED`, the single documented addition to the frozen list (DECISION-012).
- **Figure 4:** The six-layer decoupled engine as deployed by `docker-compose.yml`, with the ports, versions and guards of each layer.
- **Figure 5:** The six MongoDB collections, their keys and indexes, the embedded `{_id:false}` sub-documents and the cross-collection references. `audit_logs` is append-only, and each block links to the previous one by hash.
- **Sequence diagram:** Task dispatch from the desktop client through the gateway and the guards into one MongoDB transaction. The task insert, the beneficiary update and the audit block either all commit or all roll back.
- **Appendix D:** Evaluation of the deployed LightGBM v1 on the untouched synthetic 20,001-row test split:
  - macro F1 **0.7771**, per-class F1 0.719 / 0.822 / 0.791;
  - ROC-AUC 0.953 / 0.900 / 0.946.

  This is below the ≥ 0.85 objective in Section 12.1.1. All figures are synthetic-partition benchmarks; see `F1_DISPOSITION_MEMO.md`.

## Section 8.2 Database Collections Table

| Collection Name | Storage Model | Purpose in KilosUnlad |
| :--- | :--- | :--- |
| **`users`** | Document (Mongoose) | User credentials (bcrypt password hashes), system roles (SUPER_ADMIN, REGIONAL_DIRECTOR, CASE_WORKER, COA_AUDITOR) and assigned municipal jurisdictions. |
| **`beneficiaries`** | Document (Mongoose + GeoJSON `2dsphere`) | Household profiles, address with coordinates, demographics including the 6 proxy-means features, enrolled SWDI level, program status and composite risk assessment (score, flag, badges). |
| **`external_records`** | Document (Mongoose) | The simulated external data lake: Meralco power, water meters, telecom plan, LTO vehicles and LandBank ATM telemetry, matched by household ID and national ID. |
| **`verification_tasks`** | Document (Mongoose + references) | Field inspection tickets: dispatch metadata (priority, due date, instructions), offline findings, LandBank card checks, geotagged photo evidence with SHA-256, and admin resolution. |
| **`audit_logs`** | Append-only document ledger | The Digital Seal: chained SHA-256 hashes, sequence index, timestamps, actor, action and state deltas. `app_user` can only find, insert and manage indexes here. |
| **`system_configs`** | Document (Mongoose) | System-wide parameters, risk and lifeline thresholds, feature flags and active Calamity Moratorium Zones (RA 10121). |

## Section 11 Transaction Processing

```text
Transaction Name: Task Dispatch & Investigation State Lock
(POST /api/v1/tasks/dispatch, contract docs/contracts/admin-web/admin-task-dispatch.json)

• Input:
  - Administrator JWT Bearer token (Authorization header)
  - household_id: "DEMO-4PS-GRAD-0001"            (Demo Case A, flagged with S_i = 100)
  - assigned_worker_id: "<24-hex user id of case_worker_test>"
  - assignment_notes: "Verify MoveIt delivery asset and LandBank cash card."
  - priority: "HIGH"
  - due_date: "2026-10-24T23:59:59.000Z"

• Validation:
  - authenticate: HS256 JWT verified against JWT_SECRET; 401 UNAUTHORIZED / TOKEN_EXPIRED.
  - allowRoles: actor must be SUPER_ADMIN or REGIONAL_DIRECTOR; otherwise 403 FORBIDDEN.
  - scopeJurisdiction + requireJurisdiction: the household's stored address must be inside
    the director's province, municipality and barangays; otherwise 403 OUT_OF_JURISDICTION.
  - Joi schema (convert:false, no unknown fields): 400 INVALID_DISPATCH_REQUEST.
  - Household exists: 404 HOUSEHOLD_NOT_FOUND.
  - No active calamity moratorium for the municipality: 409 CALAMITY_MORATORIUM_ACTIVE.
  - No open task for the household: 409 ACTIVE_TASK_EXISTS.
  - Worker is an active CASE_WORKER: 400 INVALID_ASSIGNED_WORKER.
  - Household is FLAGGED_FOR_REVIEW (state machine): 409 WORKFLOW_CONFLICT.

• Processing:
  - Opens a MongoDB session; session.withTransaction() with snapshot read concern and
    majority write concern.
  - Generates the task identifier "TSK-2026-<uuid>".
  - Reads the head block H(n-1) from audit_logs.
  - Serialises the state delta with canonical JSON (stable key order).
  - Computes H(n) = SHA-256(seq : H(n-1) : timestamp : actor_id : action : canonical_delta).

• Database Update (atomic commit):
  1. Insert into verification_tasks (task_status "PENDING_DISPATCH", priority, due_date, notes).
  2. Update beneficiaries: program_status FLAGGED_FOR_REVIEW -> "UNDER_INVESTIGATION".
  3. Insert the audit_logs block (action "TASK_DISPATCHED").
  - Commit. Any failure rolls back all three; a duplicate sequence_index retries the transaction.

• Confirmation / Output:
  - HTTP 201 Created with task_id, household_id, assigned_worker_id, task_status,
    household_status "UNDER_INVESTIGATION", dispatched_at and audit_receipt
    {sequence_index, entry_hash}.
  - Screenshot: ui/ui_11_dispatch_confirmation.jpg ("Task dispatched: Assignment confirmed
    by the server", task TSK-2026-c9b2f09d-..., audit sequence 2).
  - Proven in Section 12 TC-05 (atomic write, receipt hash = stored block) and TC-06 (409, zero writes).
```

## Corrections to the spec

The diagrams follow the code. Where `DIAGRAM_INTEGRATION.md` says something different:

| Spec says | Code says (and the diagram shows) |
| --- | --- |
| Toggle Calamity Moratorium: actor Director | `POST /calamity/toggle` allows **SUPER_ADMIN only**. Figure 1 adds a Super Admin actor (a specialisation of Director). |
| Verify Hash Chain: Auditor and Director | `GET /audit/verify-chain` allows **COA_AUDITOR and SUPER_ADMIN**. |
| Initiate 15-Day Appeal Notice (Director) | Issued from the report review after the director sees the hash-verified photos (`POST /tasks/:id/resolve`, DECISION-011), sealed as `BENEFICIARY_GRADUATED` with `decision: APPROVED_GRADUATION`. |
| Activity: "Transition to GRADUATED" after 15 days | `POST /beneficiaries/:id/graduate` (no appeal, window ended) or a denied appeal (`POST /appeals/:docket/decide`). The spec has no retention path; the code adds one (`POST /tasks/:id/retain`, `BENEFICIARY_RETAINED`, DECISION-012), shown in Figures 1 and 2. |
| Status `UNDER_APPEAL_HEARING` | This is the **docket status**, derived from the sealed `APPEAL_FILED` block. `program_status` keeps `NOTICE_OF_INELIGIBILITY`, because the schema enum is frozen. |
| `User.login()`, `verifyToken()`, `AuditLog.computeHash()` as model methods | These live in `auth.service.js`, `auth.middleware.js` and `utils/cryptoHelper.js` (`computeEntryHash`). Figure 3 shows them as service and utility classes linked to the models. |
| `SystemConfig.threshold_configs` only | The model also has `feature_flags` and `updated_by` (shown). |
| Gateway: "Port 80/443, SSL termination" | `docker/nginx/default.conf` listens on **80 only**; TLS is not configured in the repository. |
| AI service: Python 3.10 | Matches `ml-service/Dockerfile` (`python:3.10-slim`). |
| Sangla-ATM: "38-second cluster" | Matches the Proof 3 demo window: 12 withdrawals, 02:14:10 to 02:21:08, 38 s apart, scored 85.0. |
| Confusion matrix "demonstrating classification accuracy" | Shown honestly: Level 1 recall 69.0 %, and the Level 1 to Level 2 confusion (26.8 %) is the main error. |

## Rebuilding

The sources live in [`src/`](src/):
- PlantUML (`.puml`), using Graphviz for layout;
- `fig1_use_case.py` (hand-placed SVG);
- `fig4_architecture.html`;
- `ml_plots.py`;
- `capture_ui.js` (needs the running stack and fixtures);
- `render_diagrams.js` (SVG or HTML to JPG through Chromium).

`src/build_all.sh` runs all of them.
