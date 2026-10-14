# KilosUnlad: scenarios to test yourself

Manual tests for every role, run by hand in the browser. The document has three parts:
- **§R, tests by role** (Director, Caseworker, COA Auditor, Super Admin) on the 20,000-household **deployment dataset**. Start here.
- **S1–S15**, the same flows written step by step on a small 7-household set, for when you need exact numbers.
- **§D**, an 18-minute live-demo run order for the panel.

Each test lists:
- the account to use;
- the steps;
- what you should see;
- what it proves.

Each test's ID (DIR, CW, COA, ADM, X; S1–S15; D1–D11) and its automated equivalent (TC, CAP, UT) are indexed in `MASTER_TEST_CATALOG.md` §9.

They run on the local Docker stack, or on the hosted copy (`deploy/HOSTING_GUIDE.md`): there, replace `http://localhost` with your site's address and skip the `docker` steps.
- A few actions have no button in the UI: the risk assessment, the calamity declaration, the early-graduation check and the tamper steps. For those, the scenario gives one `curl` or `docker exec` command.
- **Every run starts with §0** (current build, then a data reset). §0.6 says which reset each scenario needs.
- If something looks wrong, check §T (Troubleshooting) before filing a bug: most reports come from an out-of-date image.

---

## 0. Before every run

Do these four steps every time you start a test session. Steps 0.1 and 0.2 matter most: an out-of-date image is the usual reason a scenario "fails" (see §T, Troubleshooting).

### 0.1 Get the current code and rebuild the images
```bash
git checkout main && git pull origin main
docker compose up -d --build          # --build is required: plain "up" reuses old images
docker compose restart gateway        # nginx keeps old container addresses after a rebuild
```
Docker Compose v1: write `docker-compose` instead of `docker compose` everywhere in this document.

### 0.2 Check that the running build is the current one
```bash
git log -1 --oneline
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/v1/insights/overview
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost/api/v1/tasks/X/retain
```
- **Both print `401`** (the route exists and needs a sign-in): the build is current. Continue.
- **Either prints `404`:** the server image is older than the code. Repeat 0.1 (if needed, `docker compose build --no-cache server client` then `docker compose up -d`).
- **`502`:** the gateway is pointing at old containers: `docker compose restart gateway`.

### 0.3 Windows (Git Bash) only: run these two lines once per terminal
```bash
export MSYS_NO_PATHCONV=1   # stop Git Bash rewriting /tmp and /app paths in docker commands
set +H                      # stop "!" in passwords from triggering "event not found"
```
The scripts in `data-pipeline/scripts/` already do this for themselves. WSL, Linux and macOS need nothing.

### 0.4 Reset the data
**Deployment dataset (for §R and §D):**
```bash
bash data-pipeline/scripts/load_deployment_data.sh
node data-pipeline/scripts/test_deployment_dataset.js     # optional: 12 checks, all [OK]
```
About a minute. It loads 20,000 households in Calamba (Palingon, Lecheria, Real) plus Case A, adds a caseworker for every barangay, and then creates the activity **through the API**, as real users would: the model assesses households until 32 are flagged (range 25–40), 12 are dispatched, 4 field reports come back with a photo, and the director issues one notice and keeps one family on the program. Expect the last lines `ledger 1-50 valid: true` and `[SUCCESS] Deployment dataset populated.`

**Small set (for S1–S15):**
```bash
bash data-pipeline/scripts/reset_test_data.sh
```
Expect the last lines: `households: 7, tasks: 3, ledger blocks: 0` and `Ready.` It runs `reset-demo` (users, indexes, 5 test households, empty ledger) and loads the three fixtures (Case A, Lorna Bautista under notice, Dispatch TestSubject). Then open <http://localhost>.

**80k demo dataset (optional, a larger load):**
```bash
bash data-pipeline/scripts/reset_test_data.sh demo
```
It loads the 80,000-household baseline, the fixtures, and realistic activity created through the API (about 1,500 households assessed, each flag sealed; 30 dispatched). About a minute; the same result every time.
- **Expected (Director):** 80,007 households; **627** flagged (score ≥ 70; average 91.2); **31** under investigation; **33** field tasks; 653 ledger blocks.
- **Triggers:** AI Predicted Level 3 (603), Water > 25 cu.m (432), Meralco > 200 kWh (405), 4-wheel vehicle (168), postpaid telecom (149).
- **Map:** every household in scope as light navy shading (the 'All households in scope (80,007)' layer). On top are 628 households under review, coloured by stage and grouped into numbered bubbles; click a bubble, or zoom in, to reach single households. Each layer can be switched off.
- **Live demo:** Case A (`DEMO-4PS-GRAD-0001`) and the fixtures are left untouched, so S4, S7 and S8 can be performed live on this dataset.
- The numbers in S2 and later are for the small set. On the demo dataset every flow still works, but the totals are the ones above.

### 0.5 Accounts and the helper for the `curl` steps
| Role | Username | Password |
| --- | --- | --- |
| Regional Director | `director_test` | `DirectorTest2026!` |
| Super Admin | `super_admin_test` | `SuperAdminTest2026!` |
| Case Worker (Municipal Link) | `case_worker_test` | `CaseWorkerTest2026!` |
| COA Auditor | `auditor_test` | `AuditorTest2026!` |
| Caseworkers, deployment dataset only | `cw_palingon_1`, `cw_palingon_2`, `cw_lecheria`, `cw_real` | `FieldStaff2026!` |

Paste this into the same terminal (passwords and the database address are in single quotes on purpose):
```bash
API=http://localhost/api/v1
MONGO_ADMIN='mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin'
tok() { curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"$2\"}" | sed -E 's/.*"access_token":"([^"]+)".*/\1/'; }
ADMIN=$(tok super_admin_test 'SuperAdminTest2026!'); DIR=$(tok director_test 'DirectorTest2026!')
COA=$(tok auditor_test 'AuditorTest2026!'); CW=$(tok case_worker_test 'CaseWorkerTest2026!')
echo "${DIR:0:20}..."      # should start with eyJ; empty means the login failed
```
Tokens expire after 15 minutes; re-run the last three lines if a `curl` returns 401.

### 0.6 Which reset each scenario needs
| Scenario | Start from | Notes |
| --- | --- | --- |
| §R (DIR, CW, COA, ADM, X) | 0.4 deployment dataset | run in the order written; reload after COA-05 (it breaks the ledger on purpose) |
| S1, S2, S3, S11, S12 | 0.4 small set | read-only; can run one after another without a reset |
| S4 → S5 | 0.4 small set | S5 continues from S4 (the task you dispatched) |
| S6 | 0.4 small set | uses Rosa Villanueva's existing task; reset between part A and part B |
| S7 | 0.4 small set | Case A must not have been assessed yet |
| S8 | 0.4 small set | Lorna Bautista's notice must not have an appeal yet |
| S9, S10 | 0.4 small set | reset afterwards (S9 leaves a calamity record; S10 breaks the ledger on purpose) |
| S13 | 0.4 small set | chains S7 → S4 → S5 for Case A |
| S14 | 0.4 small set | chains S7 → S4 → S5 for Case A, with a "retain" report |
| S15 | 0.4 small set | uses Lorna Bautista; reset between "Granted" and "Denied" |
| D1–D11 | 0.4 deployment dataset | in the order of §D |

### What the clean data contains (small set)

| Household | Name | Barangay | Status | Score |
| --- | --- | --- | --- | --- |
| TEST-4PS-0001 | Juan Dela Cruz | Palingon | Active, compliant | 25 |
| TEST-4PS-0002 | Maria Santos | Lecheria | Flagged for review | 82 |
| TEST-4PS-0003 | Pedro Reyes | Real | Under investigation (report submitted) | 75 |
| TEST-4PS-0004 | Rosa Villanueva | Palingon | Flagged for review, task assigned | 68 |
| TEST-4PS-DISPATCH-0001 | Dispatch TestSubject | Palingon | Flagged for review, no task | 72 |
| TEST-4PS-NOTICE-0001 | Lorna Bautista | Palingon | Notice of ineligibility (15-day window open) | — |
| DEMO-4PS-GRAD-0001 | Miguel Villanueva ("Case A", graduation drift) | Real | Active, compliant, not yet assessed | — |

The ledger is empty. Every block you see later was created by your own actions.

## R. Tests by role (deployment dataset)

These tests run on the **deployment dataset** (§0.4). Nothing in them is a fixed answer written into the app: every number and name comes from the database, so the steps tell you **where to read the expected value** instead of printing it. The figures in *italics* are what a standard load (`load_deployment_data.sh`) produces; if you assessed or dispatched something yourself, your numbers move with it, and that is the point.

How the dataset is built, so you know what to expect:
- 20,000 generated households plus Case A (`DEMO-4PS-GRAD-0001`), all in Calamba, Laguna, in the barangays Palingon, Lecheria and Real.
- The model assessed households barangay by barangay until **32** scored 70 or more (allowed range 25–40). Each flag is a `MODEL_FLAG_RAISED` ledger block with its SHAP explanation.
- 12 of them were dispatched, each to a caseworker who covers that barangay. Four reports came back with a geotagged photo (two recommend graduation, two recommend keeping the family). The director then issued one notice and kept one family on the program.

Test IDs: **DIR** = Regional Director, **CW** = Caseworker, **COA** = COA Auditor, **ADM** = Super Admin, **X** = across roles. The last column points to the detailed small-set scenario (S#) with the same flow.

### R.1 Regional Director (`director_test`)

| ID | Steps | Expect | Same flow |
| --- | --- | --- | --- |
| DIR-01 | Sign in. Open **Executive Overview**. | Lands on Executive Overview. *Households in Scope* reads *20,001*; *Flagged by Risk Score* is between 25 and 40 (*32*); *Open Field Tasks* *8*. The menu has Executive Overview, Triage Queue, Caseworker Dispatch, 15-Day Due Process, Policy Settings, and no audit screens. | S1, S2 |
| DIR-02 | On the same page, compare *Flagged by Risk Score* with **Current workload → High-risk beneficiaries**, then switch the tabs (Flagged, Field Dispatched, Caseload, Graduated). | The two flagged numbers are equal. The *Risk severity* ring adds up to the flagged number, and *Below threshold* is households minus flagged. The map shades all 20,001 households and marks the households under review. | S2 |
| DIR-03 | Open **Triage Queue**. Note the household at the top. Use the **Severity** and **Municipality** filters, then the search box with that household's ID. | The header shows the number of households still waiting for dispatch (*20*). The list is sorted by risk score, highest first. Search finds the household by name, household ID or PhilSys ID. | S3 |
| DIR-04 | Open **Details** on the top household. | The trigger badges (e.g. *Meralco > 200 kWh*, *AI Predicted Level 3*), the score, and the sealed model explanation with its ledger block number. | S3, S7 |
| DIR-05 | Click **Dispatch** on the top household. Open the **Caseworker** list. | Only active caseworkers who cover that household's barangay are listed: Palingon → Andrea Lim, Rafael Mendoza, Test Case Worker; Lecheria → Benjo Ramos; Real → Carmela Dizon, Test Case Worker. The busiest caseworker shows the most open tasks. | S4 |
| DIR-06 | Choose a caseworker, write instructions, set a future deadline, confirm. Open **Caseworker Dispatch**, then reload **Executive Overview**. | "Task dispatched" with a task ID and the next ledger sequence number (*51* on a fresh load). The household leaves the Triage Queue (count drops by 1) and appears first in Caseworker Dispatch as *Awaiting visit*. *Open Field Tasks* goes up by 1. **Write down the caseworker and household for CW-02.** | S4 |
| DIR-07 | In **Caseworker Dispatch**, open a task marked **Review report** whose report recommends graduation. Write grounds (10+ characters) and click **Approve graduation and issue notice**. | The photo shows **Hash verified**. The receipt shows the 15-day appeal window and a ledger block. The household now appears in **15-Day Due Process**. | S13 |
| DIR-08 | Open the other **Review report** task (the one recommending the family stays). Write grounds and click **Keep on the program**. | Only **Keep on the program** is offered. The receipt gives the date (180 days later) before the model may flag the family again. The task shows *Verified: retain*. | S14 |
| DIR-09 | Open **15-Day Due Process**. Pick the household under notice (*Leslie A. Thomas*, Lecheria, on a fresh load). **File Appeal** with a docket reference, a hearing date of **today**, and grounds. Then **Record hearing outcome** → **Granted**. | The countdown shows, then pauses when the appeal is filed. After the outcome, "Appeal … granted", a ledger block number, and the household is active again. Filing a second appeal on the same notice is refused. | S8, S15 |
| DIR-10 | Try to flag a household that was just kept on the program (DIR-08), using its household ID: `curl -s -X POST $API/beneficiaries/<ID>/assess -H "Authorization: Bearer $DIR" -H 'Content-Type: application/json' -d '{}'` | `RETENTION_COOLDOWN`: the model may not flag the family again for 180 days. | S14 |
| DIR-11 | Assess Case A live: `curl -s -X POST $API/beneficiaries/DEMO-4PS-GRAD-0001/assess -H "Authorization: Bearer $DIR" -H 'Content-Type: application/json' -d '{}'`. Reload Triage Queue. | `predicted_swdi_level: 3`, score ≥ 70, status `FLAGGED_FOR_REVIEW`. Case A (Miguel Villanueva) appears in the queue, and the flagged count on Executive Overview goes up by 1. | S7 |
| DIR-12 | Open **Policy Settings**. | The flag threshold (70), the 15-day appeal window, the 250 m geofence and any calamity declarations, read from the server. They are shown read-only ("cannot be edited here"). | S9 |

### R.2 Caseworker (Municipal Link)

Use the caseworker who covers the household you dispatched in DIR-06, or any of these (password `FieldStaff2026!`; `case_worker_test` keeps `CaseWorkerTest2026!`):

| Username | Name | Covers |
| --- | --- | --- |
| `cw_palingon_1` | Andrea Lim | Palingon |
| `cw_palingon_2` | Rafael Mendoza | Palingon |
| `cw_lecheria` | Benjo Ramos | Lecheria |
| `cw_real` | Carmela Dizon | Real |
| `case_worker_test` | Test Case Worker | Palingon, Real |

To stand "at" a household, you need its coordinates. Print them for the caseworker you are testing (the pairs are **longitude, latitude**):
```bash
CWX=$(tok cw_lecheria 'FieldStaff2026!')      # change to the caseworker you are testing
curl -s $API/tasks/assigned -H "Authorization: Bearer $CWX" | grep -o '"household_id":"[^"]*"\|"target_coordinates":\[[^]]*\]'
```

| ID | Steps | Expect | Same flow |
| --- | --- | --- | --- |
| CW-01 | Sign in as each caseworker in turn. Open **Field Overview**, then **Assigned Tasks**. | Each sees only tasks in the barangays they cover (Benjo Ramos: Lecheria only). *Assigned visits* on Field Overview equals the number of cards on Assigned Tasks and the `assigned_tasks_count` from the command above. The menu has no director or audit screens. | S1 |
| CW-02 | As the caseworker from DIR-06, open **Assigned Tasks**. | The household you dispatched is listed, with the instructions you wrote under **What to check** and your deadline. | S4, S5 |
| CW-03 | Open DevTools (F12) and keep it open. In ⋮ → More tools → **Sensors** → Location → *Other*, enter that household's **latitude** and **longitude** from the command above. Click **Start in-person visit** and complete the 5 steps with a photo; on step 5, click **Save Report on This Device**. | Step 4 shows the location and the photo fingerprint (SHA-256). The report sends by itself; *Saved drafts* returns to 0 and the task leaves the list. The director's Caseworker Dispatch shows **Review report** for it. | S5 |
| CW-04 | Repeat CW-03 on another task with Sensors set to Manila (14.5995, 120.9842). | The server refuses it (outside the 250 m geofence). The report stays on the device as **Rejected by server**; it is not retried forever. | S5 |
| CW-05 | Offline: on Assigned Tasks, set DevTools → Network → **Offline**, do a visit, save it. Then set the network back. | While offline: the report waits in **Saved drafts**, the Field Overview card *Saved on this phone* shows 1, and the button reads *Connect to the internet to send*. Back online: it sends once; the COA ledger gains exactly one `REPORT_SUBMITTED` block. | S6 |
| CW-06 | Server outage: start a visit, run `docker compose stop server`, save the report, then `docker compose start server` and `docker compose restart gateway`. | The report waits on the device and is sent after the server returns (*Send now* if it has not gone by itself). Nothing is lost or sent twice. | S6 |
| CW-07 | Open the app at phone width (DevTools device toolbar, 390 px). Visit Field Overview, Assigned Tasks and all 5 form steps. | No sideways scrolling; buttons are at least 44 px tall; typing in a field does not zoom the page. | S12 |

### R.3 COA Auditor (`auditor_test`)

| ID | Steps | Expect | Same flow |
| --- | --- | --- | --- |
| COA-01 | Sign in. Open **Audit Overview**. | Lands on Audit Overview. Ledger totals by action, on a fresh load: *MODEL_FLAG_RAISED 32* (equal to the director's flagged number), *TASK_DISPATCHED 12*, *REPORT_SUBMITTED 4*, *BENEFICIARY_GRADUATED 1* (the notice) and *BENEFICIARY_RETAINED 1*: 50 blocks. Every action you take in R.1 and R.2 adds one block. | S1, S10 |
| COA-02 | Open **Audit Verification**. Verify from 1 to the last sequence number shown on Audit Overview. | **Chain valid**, every block checked. | S10 |
| COA-03 | Open **Triage & Flagged Queue** and a household's details. | The same households the director sees, with **no Dispatch button** (read-only). | S3 |
| COA-04 | Open **Audit Sampling**. | A sample drawn from the real flagged households, each with its score and ledger reference; no placeholder names. | S12 |
| COA-05 | *Local only.* Tamper with block 1 (S10 step 2), then verify again. Reload the data afterwards (§0.4). | The chain is reported broken at sequence 1. | S10 |
| COA-06 | Try to write: `curl -s -o /dev/null -w "%{http_code}\n" -X POST $API/calamity/toggle -H "Authorization: Bearer $COA" -H 'Content-Type: application/json' -d '{}'` | **403**. COA can read everything in scope but cannot change anything. | S11 |

### R.4 Super Admin (`super_admin_test`)

| ID | Steps | Expect | Same flow |
| --- | --- | --- | --- |
| ADM-01 | Sign in. | Lands on Executive Overview with the same numbers as DIR-01, plus **Audit Verification** in the menu. | S1 |
| ADM-02 | Declare a calamity for Calamba (S9 command, with `$ADMIN`). Reload Executive Overview; as the director, try to dispatch any flagged household. | The *Calamity moratorium active: Calamba* banner. Policy Settings lists the declaration. Dispatch is refused ("Dispatch is frozen…"). Keeping a family on the program (DIR-08) is still allowed. | S9 |
| ADM-03 | Lift the declaration (S9 second command). | The banner disappears and dispatch works again. | S9 |
| ADM-04 | Send the same declaration with the director's token (`$DIR`). | **403**: only a Super Admin can declare a calamity. | S9 |

### R.5 Across roles

| ID | Steps | Expect | Same flow |
| --- | --- | --- | --- |
| X-01 | Run the six `curl` lines of S11. | 403, 403, 403, 400, 401, 403, in that order. | S11 |
| X-02 | Sign in with a wrong password. | "Incorrect username or password."; not signed in. | S1 |
| X-03 | Every role, every screen, at 390, 834 and 1440 px. | No sideways scrolling; the menu opens with ☰ on a phone and closes after a choice. | S12 |
| X-04 | Run the automated check of this dataset: `node data-pipeline/scripts/test_deployment_dataset.js` | 12 checks `[OK]` on a fresh load: 20,001 households, 25–40 flags all from the model, a caseworker for every barangay, every lifecycle stage present, ledger valid. | — |

---

## Detailed scenarios on the small set

## S1. Sign-in and role routing
1. Sign in as each account in turn (accounts in §0.5). Each lands on its own screen:
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
2. The geofence needs you to "stand" within 250 m of the household. **Before starting**, open Chrome DevTools (F12) on the app's tab and **keep it open for the whole visit** (the location override only works while DevTools is open). Then open **DevTools → ⋮ → More tools → Sensors → Location → Other** and set latitude **14.2120**, longitude **121.1660** (Dispatch TestSubject). Allow location when the browser asks.
3. Click **Start in-person visit** on Dispatch TestSubject and complete the 5 steps:
   - Step 1: pick one option for wall, roof and water.
   - Step 2: answer the vehicle question.
   - Step 3: answer the three LandBank card questions.
   - Step 4: attach a photo (any JPEG/PNG). Wait until its **Photo fingerprint** (SHA-256) is shown.
   - Step 5: choose the verified SWDI level and a recommendation, write the narrative, then click **Save Report on This Device** (it queues the report for sync).
4. The **Saved Drafts** panel opens. Online, the report syncs by itself within a few seconds (the button reads *Sending reports…*); if it is still waiting, click **Send now (1 waiting)**.
5. Repeat steps 3–4 for **Rosa Villanueva** with the location set to Manila (14.5995, 120.9842).

**Expect:**
- With the Calamba location, the report is accepted and the task leaves your list.
- The director's Caseworker Dispatch shows *Report submitted*.
- The COA ledger shows a **REPORT_SUBMITTED** block.
- With the Manila location, the server rejects the submission (outside the 250 m geofence). The report stays on the device as **Rejected by server**.
- The send button never reads *Submission unavailable*. If it does, the client image is out of date (§T).

**Proves:** geofencing, the SHA-256 photo check, and the audit trail. The director can now open this report and its photo (S13).

## S6. Offline visit (airplane mode) and a server outage
Both parts are real on localhost: in part A the browser itself has no network; in part B the server container is actually stopped. Use **Rosa Villanueva**'s task and set DevTools → Sensors → Location to **14.2130, 121.1680** (her house) before starting. Reset (§0.4) between A and B.

**Part A: the browser goes offline**
1. Sign in as `case_worker_test` and open **Assigned Tasks** while online (the tasks are cached on the device).
2. In DevTools → **Network**, change *No throttling* to **Offline**. (The in-app **Work Offline** button does the same inside the app.)
3. Start Rosa's visit, complete the 5 steps with a photo, and click **Save Report on This Device**.
4. Check: **Saved Drafts** shows the report as pending, the Field Overview card *Saved on this phone* shows **1**, and the button reads *Connect to the internet to send*. In DevTools → **Application → IndexedDB → kilosunlad_field**, the draft is stored with `PENDING_SYNC`.
5. Set Network back to **No throttling**.

**Part B: the server is down (stronger proof)**
1. Same as A1, but stay online.
2. Start Rosa's visit and fill in the 5 steps, but do **not** save yet.
3. In a terminal: `docker compose stop server`
4. Click **Save Report on This Device**. The sync attempt fails (DevTools → Network shows a 502 from the gateway); the report stays in **Saved Drafts** with **Send now (1 waiting)**.
5. `docker compose start server`, wait about 10 seconds, then `docker compose restart gateway`.
6. Click **Send now** if the report has not already gone by itself.

**Expect (both parts):**
- While offline or while the server is down, nothing is lost: the report waits on the device.
- When the connection or the server returns, the report uploads, the waiting count returns to **0**, and Rosa's task leaves Assigned Tasks.
- The director's Caseworker Dispatch shows *Report submitted* for Rosa, and the COA ledger gains **one** REPORT_SUBMITTED block (not two: nothing is sent twice).
- A report the server refuses for a reason that will not change (for example outside the geofence, S5 step 5) is kept on the device as **ERROR** instead of being retried forever.

**Proves:** the offline-first PWA (STR-02): local storage in IndexedDB, automatic retry on reconnect, no loss and no duplicates. Automated equivalent: `test_str02_airplane_sync.js` (TC-07, TC-10); part B was also re-checked by script on 2026-10-14 (`evidence/qa-recheck-2026-10-14/`).

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
   docker exec kilosunlad-db mongosh "$MONGO_ADMIN" \
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
   docker exec kilosunlad-db mongosh "$MONGO_ADMIN" --quiet \
     --eval 'db.verification_tasks.updateOne({household_id:"DEMO-4PS-GRAD-0001","admin_resolution.decision":"APPROVED_GRADUATION"},{$set:{"admin_resolution.finalized_at":new Date(Date.now()-16*864e5)}})'
   ```

**Expect:**
- The report shows the caseworker's findings and the photo with **"Hash verified"**.
- The notice receipt shows the appeal window (15 days) and a ledger block number. The task now shows **View report**.
- Due Process lists Case A with the 15-day countdown, grants protected.
- The early graduation call returns `APPEAL_WINDOW_OPEN`.
- After step 6, a **Complete graduation** button appears. Clicking it graduates Case A and seals another `BENEFICIARY_GRADUATED` block.
- Filing an appeal instead (S8) blocks graduation (`APPEAL_HOLD`) until the hearing outcome is recorded (S15).

**Negative checks:**
- A report that recommends retaining the household cannot be turned into a notice: the dialog offers only **Keep on the program** (S14).
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

## S14. Keep a household on the program (DECISION-012)
1. Do S7 (Case A flagged) and S4 (dispatch Case A to Test Case Worker).
2. As the caseworker, do S5 for Case A (location 14.2215, 121.1875), but choose **Level 2** and the recommendation **RETAIN**. Submit.
3. Director → **Caseworker Dispatch** → Case A → **Review report**.
4. Write the grounds (at least 10 characters) and click **Keep on the program**.
5. Try to flag Case A again:
   ```bash
   curl -s -X POST $API/beneficiaries/DEMO-4PS-GRAD-0001/assess -H "Authorization: Bearer $DIR" -H 'Content-Type: application/json' -d '{}'
   ```
6. As `auditor_test`, open Audit Overview → Latest ledger blocks.

**Expect:**
- The dialog offers only **Keep on the program**; there is no notice button for this report.
- The receipt says the household is back to active and compliant, gives the date the model may flag it again (180 days later), and a ledger block number. The task shows **Verified: retain** and **View report**.
- Executive Overview: Case A no longer counts as under investigation.
- Step 5 returns `RETENTION_COOLDOWN`.
- COA sees a **BENEFICIARY RETAINED** block, and Audit Verification still reports the chain valid.

**Negative checks:**
- A report that recommends graduation (S13) offers no **Keep** button. Through the API it is refused with `FIELD_REPORT_DOES_NOT_SUPPORT_RETENTION`.
- As `auditor_test` the same call returns **403**.
- A declared calamity (S9) does **not** block retention; keeping a family on the program is always allowed.

**Proves:** the retention path, the re-flag cooldown, and the one new ledger action.

## S15. Record an appeal hearing outcome (DECISION-012)
1. Director → **15-Day Due Process** → Lorna Bautista → **File Appeal** with **today** as the hearing date (docket e.g. `APP-CAL-2026-0002`).
2. The card now shows **Record hearing outcome**. Open it, choose **Granted**, write the grounds, and click **Record outcome**.
3. Reset (§0), then repeat with **Denied**.
4. *Optional:* file an appeal with a hearing date in the future. The button does not appear, and the API refuses early:
   ```bash
   curl -s -X POST $API/appeals/APP-CAL-2026-0003/decide -H "Authorization: Bearer $DIR" -H 'Content-Type: application/json' \
     -d '{"outcome":"DENIED","decision_notes":"Hearing upheld the notice grounds."}'
   ```

**Expect:**
- **Granted:** "Appeal … granted: Lorna Bautista stays on the program", a ledger block number, and the card leaves the docket. The household is active again, with the same 180-day cooldown as S14. COA sees **BENEFICIARY RETAINED**.
- **Denied:** "Appeal … denied: Lorna Bautista graduated". COA sees **BENEFICIARY GRADUATED**, and the household is **GRADUATED**.
- Step 4 returns `HEARING_NOT_YET_HELD`.
- Recording a second outcome for the same appeal returns `WORKFLOW_CONFLICT`. A COA auditor gets **403**. During a declared calamity (S9), **Denied** is refused (`CALAMITY_MORATORIUM_ACTIVE`) but **Granted** is allowed.

**Proves:** the appeal ends in a recorded, sealed decision, never in a stuck household.

---

## D. Live demo run order (about 18 minutes, deployment dataset)
Load the deployment dataset first (§0.4, `load_deployment_data.sh`). Case A stays unassessed for D2.

| # | Show | Scenario | Pass when |
| --- | --- | --- | --- |
| D1 | Sign in as Director; the dashboard and map are populated | DIR-01, DIR-02 | 20,001 households, 25–40 flagged, map shading + markers |
| D2 | Assess Case A live; it is flagged with its SHAP explanation | DIR-11 | Level 3 predicted, score ≥ 70, sealed block number |
| D3 | Dispatch Case A to Carmela Dizon (Real) | DIR-05, DIR-06 | Only Real's caseworkers offered; task ID and ledger receipt |
| D4 | `cw_real` visits Case A on a phone width (location 14.2215, 121.1875), with a photo; then a visit from Manila | CW-03, CW-04, CW-07 | Accepted at the house, refused in Manila |
| D5 | Offline visit sends on reconnect | CW-05 | Saved on this phone 1 → 0, one ledger block |
| D6 | Director reviews Case A's report and photo, issues the notice | DIR-07 | "Hash verified", 15-day window starts |
| D7 | Early graduation refused; appeal pauses the window; hearing outcome recorded | S13, DIR-09 | `APPEAL_WINDOW_OPEN`; appeal filed; granted → active |
| D8 | Calamity moratorium freezes dispatch | ADM-02 to ADM-04 | Banner shown, dispatch refused, director cannot declare |
| D9 | Tamper with the ledger and a photo; both are caught | COA-02, COA-05, S13 | Chain broken at the edited block; photo refused |
| D10 | Guards hold | X-01 | 403 / 400 / 401 as listed |
| D11 | A family that is still poor is kept on the program | DIR-08, DIR-10 | "Keep on the program"; BENEFICIARY RETAINED block; re-flag refused |

Reset (§0) before a second run. After a session with real users, record their ratings in `docs/testing/uat/` (form + `score_uat.py`).

---

## T. Troubleshooting (check this before filing a bug)

| What you see | Cause | Fix |
| --- | --- | --- |
| Dashboard shows **4,850** households, a **Sample data** label, or names such as *Municipal Link #ML-04* | Client image built before the live-data release (DECISION-010) | §0.1 then §0.2 |
| `GET /api/v1/insights/overview` returns **404** in the Network tab | Server image built before DECISION-010 | §0.1; §0.2 must print `401` |
| Dispatch dialog asks for a **Caseworker account ID** with "A staff directory is not available yet" | Old client image | §0.1 |
| Dispatch dialog asks for an account ID with "The caseworker directory could not be loaded" | Current client, but `GET /users/caseworkers` failed (server down or old) | §0.2; check `docker compose ps` |
| Send button reads **Submission unavailable** | Client image from before Sprint 5 (offline sync release) | §0.1 |
| A §R number differs from the italic figure | You (or an earlier test) assessed, dispatched or decided something; every action moves the numbers | Read the expected value where the step says; reload with §0.4 for the standard figures |
| A caseworker sees no tasks | That caseworker has none in the standard load, or is not the one for the household's barangay | Use the R.2 table; dispatch one to them (DIR-06) |
| Field operations list shows tasks that are not in the small set | Demo dataset loaded, or an old image with built-in samples | §0.4 small set; §0.1 |
| **502 Bad Gateway** after a rebuild | nginx still points at the old containers | `docker compose restart gateway` |
| `bash: !@localhost: event not found` | Git Bash history expansion on `!` inside double quotes | §0.3 (`set +H`) and single quotes as in §0.5 |
| `docker cp` / `docker exec` cannot find `/tmp/...` or `/app/...` | Git Bash rewrote the path to a Windows folder | §0.3 (`export MSYS_NO_PATHCONV=1`), or use `reset_test_data.sh` |
| `curl` returns **401** in the middle of a session | Tokens last 15 minutes | re-run the last three lines of §0.5 |
| A scenario's numbers differ from the document | Data from an earlier scenario, or the demo dataset | §0.6 and §0.4 |
| Photo step says **Location request timed out. Move to an open area, then retry.** (any image) | The browser got no GPS fix within 15 s. A laptop has no GPS, so without a location override Chrome waits on Windows location services and times out. The photo is fine. | Open DevTools (F12) **on that tab and keep it open**, ⋮ → More tools → **Sensors** → Location → *Other…* → 14.2120 / 121.1660 (S5), then capture again. Closing DevTools removes the override. |
| Photo step says **Location permission was denied** | Location blocked for the site | Click the icon left of the address bar → Location → Allow, then retry |
| Photo step says **Location is unavailable** | Sensors set to *Location unavailable*, or Windows location services off | Pick a location in Sensors, or turn on Windows Settings → Privacy & security → Location |

---

### Record your results
Write the build you tested (`git log -1 --oneline`, §0.2) at the top of every run:

**Build:** __________ **§0.2 printed 401 / 401:** yes / no **Dataset:** deployment / small / demo

| Test | Date | Tester | Pass / Fail | Notes |
| --- | --- | --- | --- | --- |
| DIR-01 | | | | |
| DIR-02 | | | | |
| DIR-03 | | | | |
| DIR-04 | | | | |
| DIR-05 | | | | |
| DIR-06 | | | | |
| DIR-07 | | | | |
| DIR-08 | | | | |
| DIR-09 | | | | |
| DIR-10 | | | | |
| DIR-11 | | | | |
| DIR-12 | | | | |
| CW-01 | | | | |
| CW-02 | | | | |
| CW-03 | | | | |
| CW-04 | | | | |
| CW-05 | | | | |
| CW-06 | | | | |
| CW-07 | | | | |
| COA-01 | | | | |
| COA-02 | | | | |
| COA-03 | | | | |
| COA-04 | | | | |
| COA-05 | | | | |
| COA-06 | | | | |
| ADM-01 | | | | |
| ADM-02 | | | | |
| ADM-03 | | | | |
| ADM-04 | | | | |
| X-01 | | | | |
| X-02 | | | | |
| X-03 | | | | |
| X-04 | | | | |
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
| S14 | | | | |
| S15 | | | | |
