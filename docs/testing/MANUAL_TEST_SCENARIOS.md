# KilosUnlad: scenarios to test yourself

Thirteen scenarios you can run by hand, in the browser, from a clean start, plus a 15-minute live-demo run order for the panel (§D). Each scenario lists:
- the account to use;
- the steps;
- what you should see;
- what it proves.

They run on the local Docker stack. (The free-hosting files in `deploy/` are kept but are not used for the demo.)
- A few actions have no button in the UI: the risk assessment, the calamity declaration, the early-graduation check and the tamper steps. For those, the scenario gives one `curl` or `docker exec` command.
- **Every scenario starts from §0 (clean start)** unless it says "continue".

---

## 0. Clean start

**Local (Docker):**
```bash
docker compose up -d
docker compose run --rm reset-demo                     # users, indexes, 5 test households, empty ledger
for f in add_int02_case_a_fixture add_int03_notice_fixture add_dispatch_test; do
  docker cp data-pipeline/scripts/$f.js kilosunlad-db:/tmp/$f.js
  docker exec kilosunlad-db mongosh "mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin" --quiet /tmp/$f.js
done
```
- Open <http://localhost>.
- To use the 80,000-household baseline instead, run `docker compose run --rm -e RESET_BASELINE=1 reset-demo` (or `seed-ingest`) before the fixtures. Totals then show 80,007 households; every other number below stays the same.

**Demo dataset (for presenting to the panel):** one command loads the 80,000-household baseline, the test fixtures, and realistic activity created through the API. About 1,500 households are assessed by the model (each flag sealed in the ledger), and 30 flagged households are dispatched to the test caseworker. It takes about a minute and gives the same result every time.
```bash
bash data-pipeline/scripts/load_demo_data.sh     # Docker Compose v1: COMPOSE=docker-compose bash ...
```
- **Expected (Director):** 80,007 households; **627** flagged (score ≥ 70; average 91.2); **31** under investigation; **33** field tasks; 653 ledger blocks.
- **Triggers:** AI Predicted Level 3 (603), Water > 25 cu.m (432), Meralco > 200 kWh (405), 4-wheel vehicle (168), postpaid telecom (149).
- **Map:** every household in scope as light navy shading (the 'All households in scope (80,007)' layer). On top are 628 households under review, coloured flagged / open field task / report submitted / notice and grouped into numbered bubbles; click a bubble, or zoom in, to reach single households. Each layer can be switched off.
- **Smaller variant:** `SAMPLE_PAGES=1 DISPATCH=10 node data-pipeline/scripts/populate_demo.js` on the bare baseline gives about 26 flagged, 11 under investigation and 12 tasks in about 3 seconds.
- **Live demo:** Case A (`DEMO-4PS-GRAD-0001`) and the fixtures are left untouched, so S4, S7 and S8 can be performed live on this dataset.
- The scenario numbers below (S2 and so on) are for the small set. On the demo dataset every flow still works, but the totals are the ones above.

**Helper for the `curl` steps** (paste into Git Bash or WSL):
```bash
API=http://localhost:5000/api/v1
tok() { curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"$2\"}" | sed -E 's/.*"access_token":"([^"]+)".*/\1/'; }
ADMIN=$(tok super_admin_test SuperAdminTest2026!); DIR=$(tok director_test DirectorTest2026!)
COA=$(tok auditor_test AuditorTest2026!); CW=$(tok case_worker_test CaseWorkerTest2026!)
```
Tokens expire after 15 minutes; re-run the last two lines if a `curl` returns 401.

### What the clean data contains (small set)

| Household | Name | Barangay | Status | Score |
| --- | --- | --- | --- | --- |
| TEST-4PS-0001 | Juan Dela Cruz | Palingon | Active, compliant | 25 |
| TEST-4PS-0002 | Maria Santos | Lecheria | Flagged for review | 82 |
| TEST-4PS-0003 | Pedro Reyes | Real | Under investigation (report submitted) | 75 |
| TEST-4PS-0004 | Rosa Villanueva | Palingon | Flagged for review, task assigned | 68 |
| TEST-4PS-DISPATCH-0001 | Dispatch TestSubject | Palingon | Flagged for review, no task | 72 |
| TEST-4PS-NOTICE-0001 | Lorna Bautista | Palingon | Notice of ineligibility (15-day window open) | — |
| DEMO-4PS-GRAD-0001 | Case A (graduation drift) | Real | Active, compliant, not yet assessed | — |

The ledger is empty. Every block you see later was created by your own actions.

---

## S1. Sign-in and role routing
1. Sign in as each account in turn (usernames and passwords are in the helper at the end of §0). Each lands on its own screen:
   - **Director:** Executive Overview.
   - **Super Admin:** Executive Overview, plus Audit Verification in the menu.
   - **Case Worker:** Assigned Tasks.
   - **COA:** Audit Overview.
2. Sign in with a wrong password.

**Expect:**
- Each menu shows only that role's screens.
- A wrong password shows "Incorrect username or password." and does not sign you in.

**Proves:** role-based access (RBAC) and safe login.

## S2. The dashboard reflects the data (Director)
1. As `director_test`, open **Executive Overview**.

**Expect:**
- Regional snapshot cards: **7** households in scope, **4** flagged by risk score, **1** open field task, **0** graduated.
- *Flagged* tab:
  - triggers Meralco > 200 kWh (2), AI Predicted Level 3 (2), Registered Motorcycle (1);
  - severity 2 critical / 2 high / 3 below 70.
- The map is a road map like Google Maps (main roads in yellow and orange, parks, water, street labels) that you can drag and zoom (buttons at the top right). Switch **Streets / Light** at the top left; the round button at the bottom right fits the map to the data. Layers, each with its own tick box:
  - **All households in scope (7)**: light navy shading, darker where more households live.
  - Households under review, one dot each, coloured by stage: rose = **Flagged, awaiting dispatch** (pulsing halo), amber = **Open field task**, teal = **Report submitted**, blue = **Notice of ineligibility**. On the 80k demo data, nearby dots group into numbered bubbles; click one to zoom in. Click a dot for the name, score and a button to the Triage Queue. Tick **Municipalities** to see the Calamba circle. The inspector shows 7 households.
- "Current workload → High-risk beneficiaries" also says **4**. Both come from the server with the same scope.
- No "Sample data" label anywhere.

**Proves:** the dashboard is computed from the database, not hard-coded.

## S3. Triage queue and model explanation
1. Director → **Triage Queue**. Three flagged households are listed: Dispatch TestSubject, Maria Santos, Rosa Villanueva.
2. Open a household's evidence drawer.
3. Sign in as `auditor_test` and open **Triage & Flagged Queue**.

**Expect:**
- The drawer shows the trigger badges. A household with no sealed assessment yet says so; it does not show an invented explanation.
- The COA auditor sees the same list with **no dispatch button** (read-only).

**Proves:** the triage feed and the COA read-only rule.

## S4. Dispatch with the caseworker picker (continue in S5)
1. Director → Triage Queue → **Dispatch TestSubject** → Dispatch.
2. In **Caseworker**, choose *Test Case Worker*. The list contains only active caseworkers who cover Palingon. Fill in the instructions, a deadline in the future, and a priority. Confirm.
3. Open **Caseworker Dispatch**.
4. Go back to **Executive Overview** and reload.

**Expect:**
- "Task dispatched" with a task ID and **audit sequence 1**.
- The household leaves the flagged queue.
- Caseworker Dispatch lists it first: *Awaiting visit*, with Test Case Worker. The "Field staff" panel shows Test Case Worker with **2 open tasks**.
- Executive Overview shows Open Field Tasks **2**, and the Field Dispatched tab includes the new task.

**Proves:** the full dispatch flow, the jurisdiction guard, and the sealed ledger receipt.

**Negative check:** dispatching Maria Santos (Lecheria) to Test Case Worker is refused: the worker does not cover Lecheria (`OUT_OF_JURISDICTION`). The picker already explains that no caseworker covers that barangay.

## S5. Field visit with geotagged evidence (continue from S4)
1. Sign in as `case_worker_test` → **Assigned Tasks**. Rosa Villanueva and Dispatch TestSubject are listed.
2. The geofence needs you to "stand" within 250 m of the household. In Chrome, open **DevTools → ⋮ → More tools → Sensors → Location → Other** and set latitude **14.2120**, longitude **121.1660** (Dispatch TestSubject).
3. Start the visit, complete the 5 steps, and attach a photo (any JPEG). Submit.
4. Repeat with the location set to Manila (14.5995, 120.9842).

**Expect:**
- With the Calamba location, the report is accepted and the task leaves your list.
- The director's Caseworker Dispatch shows *Report submitted*.
- The COA ledger shows a **REPORT_SUBMITTED** block.
- With the Manila location, the server rejects the submission (outside the 250 m geofence). The report stays saved on the device.

**Proves:** geofencing, the SHA-256 photo check, and the audit trail. The director can now open this report and its photo (S13).

## S6. Offline visit (airplane mode)
1. As the caseworker, with a task in the list, open **DevTools → Network → Offline** (or use the in-app *Work Offline* toggle).
2. Fill in and save the report. It appears in **Saved Drafts** as pending, and the Field Overview card shows **1 Pending**.
3. Go back online.

**Expect:** the draft syncs by itself, and the pending count returns to 0. No data is lost, and nothing is sent twice.

**Proves:** the offline-first PWA (STR-02).

## S7. Case A: the model catches graduation drift (API step)
```bash
curl -s -X POST $API/beneficiaries/DEMO-4PS-GRAD-0001/assess -H "Authorization: Bearer $DIR" \
  -H 'Content-Type: application/json' -d '{}'
```
**Expect:**
- `predicted_swdi_level: 3` (enrolled Level 1), `composite_risk_score` ≥ 70, and the household becomes `FLAGGED_FOR_REVIEW`.
- Reload Triage Queue: Case A appears. Its drawer shows the **sealed explanation**: the SHAP indicators and the ledger block number.
- Executive Overview: flagged **5**.

**Proves:** the ML model (v2), explainability, and the INT-05 audit seal.

## S8. Due process and appeal
1. Director → **15-Day Due Process**. Lorna Bautista shows a 15-day countdown with grants continuing.
2. File an appeal with a docket reference (for example `APP-CAL-2026-0001`), a hearing date in the future, and at least 10 characters of grounds.
3. Try to file a second appeal for the same notice.
4. As COA, look at Audit Overview → Latest ledger blocks.

**Expect:**
- The first appeal succeeds and the countdown shows as paused.
- The second appeal is refused: "An appeal is already docketed…".
- COA sees an **APPEAL FILED** block.

**Proves:** RA 11310 §12 due process and its audit seal.

## S9. Calamity moratorium (API step; RA 10121)
```bash
curl -s -X POST $API/calamity/toggle -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d '{"province":"Laguna","municipality":"Calamba","is_active":true,"ndrrmc_reference":"NDRRMC-MANUAL-001"}'
```
**Expect:**
- Executive Overview shows the **"Calamity moratorium active: Calamba"** banner. The map and matrix tag Calamba "RA 10121 Moratorium".
- Policy Settings lists the declaration as Active.
- Dispatching any Calamba household is refused: "Dispatch is frozen…".

Then lift it:
```bash
curl -s -X POST $API/calamity/toggle -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d '{"province":"Laguna","municipality":"Calamba","is_active":false}'
```
**Expect:** the banner disappears and dispatch works again.

**Negative check:** the same declaration with the director's token returns **403**. Only a Super Admin can declare.

## S10. Audit chain verification and tamper detection (local only)
1. As `auditor_test` → **Audit Verification**. Verify range 1 to the last block number shown on Audit Overview. Result: valid.
2. Tamper with block 1 directly in the database, as an insider would:
   ```bash
   docker exec kilosunlad-db mongosh "mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin" \
     --quiet --eval 'db.audit_logs.updateOne({sequence_index:1},{$set:{"state_delta.after.tampered":true}})'
   ```
3. Verify again.

**Expect:**
- The verification reports the chain broken at **sequence 1**.
- The app's own database account cannot do this edit: its role is append-only on `audit_logs`. Only the root admin can.
- Reset (§0) afterwards.

**Proves:** the SHA-256 hash chain (STR-01).

## S11. Security guards hold
Each command must be refused. The guard is doing its job.
```bash
curl -s -o /dev/null -w "%{http_code}\n" $API/insights/overview -H "Authorization: Bearer $CW"        # 403: worker
curl -s -o /dev/null -w "%{http_code}\n" $API/audit/blocks -H "Authorization: Bearer $DIR"            # 403: director
curl -s -o /dev/null -w "%{http_code}\n" "$API/beneficiaries/triage-queue?municipality=Santa%20Rosa" -H "Authorization: Bearer $DIR"  # 403: outside jurisdiction
curl -s -o /dev/null -w "%{http_code}\n" "$API/tasks?limit=500" -H "Authorization: Bearer $DIR"         # 400: invalid query
curl -s -o /dev/null -w "%{http_code}\n" $API/system/policy                                           # 401: no token
curl -s -o /dev/null -w "%{http_code}\n" -X POST $API/calamity/toggle -H "Authorization: Bearer $COA" -H 'Content-Type: application/json' -d '{}'  # 403: COA cannot write
```

## S12. Phone, tablet and desktop
1. In Chrome DevTools, open the **device toolbar** (Ctrl+Shift+M). Try *iPhone 12 Pro* (390 px), *iPad Air* (820 px), then full width.
2. Visit every screen of each role. On a phone, use the ☰ button to open the menu.

**Expect:**
- No sideways scrolling on any screen.
- Cards stack on phones; charts and the map stay readable.
- Selecting a menu item closes the menu on a phone.
- The automated version of this check is `data-pipeline/scripts/test_ui_live_data.js`: 117 checks on the small set, 121 on the demo dataset, at 390, 834 and 1440 px.

---

## S13. Review a report, issue the notice, graduate (DECISION-011)
1. Do S7 (Case A flagged), S4 (dispatch Case A to Test Case Worker) and S5 (the caseworker submits a report with a photo; set the location to Case A: 14.2215, 121.1875).
2. Director → **Caseworker Dispatch**. Case A shows **Review report**. Open it.
3. Write the grounds (at least 10 characters) and click **Approve graduation and issue notice**.
4. Open **15-Day Due Process**.
5. Try to graduate early:
   ```bash
   curl -s -X POST $API/beneficiaries/DEMO-4PS-GRAD-0001/graduate -H "Authorization: Bearer $DIR" -H 'Content-Type: application/json' -d '{}'
   ```
6. *Optional, local only:* to see the end of the window without waiting 15 days, move the notice back in the test data. Then reload Due Process:
   ```bash
   docker exec kilosunlad-db mongosh "mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin" --quiet \
     --eval 'db.verification_tasks.updateOne({household_id:"DEMO-4PS-GRAD-0001","admin_resolution.decision":"APPROVED_GRADUATION"},{$set:{"admin_resolution.finalized_at":new Date(Date.now()-16*864e5)}})'
   ```

**Expect:**
- The report shows the caseworker's findings and the photo with **"Hash verified"**.
- The notice receipt shows the appeal window (15 days) and a ledger block number. The task now shows **View report**.
- Due Process lists Case A with the 15-day countdown, grants protected.
- The early graduation call returns `APPEAL_WINDOW_OPEN`.
- After step 6, a **Complete graduation** button appears. Clicking it graduates Case A and seals another `BENEFICIARY_GRADUATED` block.
- Filing an appeal instead (S8) blocks graduation (`APPEAL_HOLD`).

**Negative checks:**
- A report that recommends retaining the household cannot be turned into a notice; the dialog explains why.
- A seeded report whose photo was never uploaded says "The photo is not in storage."

**Tamper check (local):** alter the stored photo, then reopen the report. The photo is refused ("no longer matches its recorded hash"). Restore it, and it shows again.
```bash
# alter (keeps a backup)
docker exec kilosunlad-server sh -c 'f=/app/uploads/evidence/$(ls /app/uploads/evidence | head -1); cp $f /tmp/photo.bak; printf X >> $f'
# restore
docker exec kilosunlad-server sh -c 'f=/app/uploads/evidence/$(ls /app/uploads/evidence | head -1); cp /tmp/photo.bak $f'
```

**Proves:** notice issuance, the due-process timer, and tamper-evident evidence storage.

---

## D. Live demo run order (about 15 minutes, demo dataset)
Load the demo dataset first (§0, `load_demo_data.sh`). Case A and the fixtures stay untouched for this.

| # | Show | Scenario | Pass when |
| --- | --- | --- | --- |
| D1 | Sign in as Director; the dashboard and map are populated | S1, S2 | 80,007 households, 627 flagged, map shading + bubbles |
| D2 | Assess Case A live; it is flagged with its SHAP explanation | S7 | Level 3 predicted, score ≥ 70, sealed block number |
| D3 | Dispatch Case A to Test Case Worker | S4 | Task ID and ledger receipt |
| D4 | Caseworker visit on a phone width, with a photo, inside the 250 m geofence; then outside it | S5, S12 | Accepted in Calamba, refused in Manila |
| D5 | Offline visit syncs on reconnect | S6 | Pending goes 1 → 0, nothing duplicated |
| D6 | Director reviews the report and photo, issues the notice | S13 | "Hash verified", 15-day window starts |
| D7 | Early graduation refused; appeal pauses the window | S13, S8 | `APPEAL_WINDOW_OPEN`; APPEAL FILED block |
| D8 | Calamity moratorium freezes dispatch | S9 | Banner shown, dispatch refused, director cannot declare |
| D9 | Tamper with the ledger and a photo; both are caught | S10, S13 | Chain broken at the edited block; photo refused |
| D10 | Guards hold | S11 | 403 / 400 / 401 as listed |

Reset (§0) before a second run. After a session with real users, record their ratings in `docs/testing/uat/` (form + `score_uat.py`).

---

### Record your results
| Scenario | Date | Tester | Pass / Fail | Notes |
| --- | --- | --- | --- | --- |
| S1 | | | | |
| S2 | | | | |
| S3 | | | | |
| S4 | | | | |
| S5 | | | | |
| S6 | | | | |
| S7 | | | | |
| S8 | | | | |
| S9 | | | | |
| S10 | | | | |
| S11 | | | | |
| S12 | | | | |
| S13 | | | | |
