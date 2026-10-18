# KilosUnlad

**Smart 4Ps Welfare Auditing and Fraud Detection System**

KilosUnlad helps the DSWD find families in the Pantawid Pamilyang Pilipino Program (4Ps) who may have already outgrown the program. A machine-learning model and simple record checks raise a flag; a caseworker visits the house and sends a report with a geotagged photo; and a director decides. Every step is saved in an audit log that cannot be quietly edited.

**The system never removes a family on its own.** The model only raises flags. A person always decides, and the family can always appeal.

Made for CCSFEN1L (Software Engineering 1), National University Manila, S.Y. 2026–2027.

---

## Live system

| Part | Where it runs | Link |
| --- | --- | --- |
| Web app (React PWA) | Vercel | **https://kilos-unlad-33qx7w3d9-yuidevs.vercel.app/** |
| API (Node.js + Express) | Render | linked from the web app |
| ML service (Python + FastAPI) | Render | called by the API only |
| Database (MongoDB) | MongoDB Atlas | not public |

> **First load can be slow.** The API and ML service run on Render's free plan, which goes to sleep after 15 minutes without visitors. If sign-in says it cannot reach the server, wait about a minute and try again. If the live site still does not work, [run it on your own computer](#if-the-live-site-is-not-working-run-it-on-your-own-computer) in 7 steps.

### Test accounts

| Role | Username | Password | What this account can do |
| --- | --- | --- | --- |
| Regional Director | `director_test` | `DirectorTest2026!` | See the dashboard and map, review flagged households, send a caseworker, review reports, issue notices, keep a family on the program, record appeal outcomes |
| Caseworker (Municipal Link) | `case_worker_test` | `CaseWorkerTest2026!` | See assigned visits, fill in the 5-step visit form with a photo, work offline |
| Caseworker, Palingon | `cw_palingon_1` / `cw_palingon_2` | `FieldStaff2026!` | Same as above, for Palingon households |
| Caseworker, Lecheria | `cw_lecheria` | `FieldStaff2026!` | Same as above, for Lecheria households |
| Caseworker, Real | `cw_real` | `FieldStaff2026!` | Same as above, for Real households |
| COA Auditor | `auditor_test` | `AuditorTest2026!` | Read-only: check that the audit log has not been changed |
| Super Admin | `super_admin_test` | `SuperAdminTest2026!` | Everything the director sees, plus declaring a calamity freeze |

These are demo accounts with demo passwords. All households in the system are **synthetic** (made up); no real person's data is used.

### Try it in 5 minutes

1. Sign in as **`director_test`**. The Executive Overview shows how many households are in scope and how many the model flagged.
2. Open **Triage Queue**. Click **Details** on the top household to see why it was flagged.
3. Click **Dispatch**, pick a caseworker who covers that barangay, and confirm. You get a task ID and an audit block number.
4. Sign out and sign in as that **caseworker**. Open **Assigned Tasks** and start the visit. (On a laptop, the photo step needs a location: see *GPS on a laptop* below.)
5. Sign in as **`auditor_test`**, open **Audit Verification**, and verify the whole range. It should say the chain is valid.

---

## What the system does

| Feature | In plain words |
| --- | --- |
| Risk scoring | The model guesses each family's real SWDI level (1 Survival, 2 Subsistence, 3 Self-sufficiency). Electricity, water, phone plan and vehicle records add points. A score of 70 out of 100 or more raises a flag, with the reasons shown. |
| Triage queue | Flagged households, highest score first, with search and filters. |
| Dispatch | The director sends a caseworker. Only caseworkers who cover that barangay can be picked. |
| Offline field visit | A 5-step form on the phone. The report and photo are saved on the phone and sent when the signal comes back. Nothing is lost or sent twice. |
| Photo proof | Each photo gets a SHA-256 fingerprint on the phone. The server rejects it if the fingerprint does not match or if it was taken more than 250 m from the house. |
| Decision | The director reads the report and either **keeps the family on the program** or **issues a notice**. |
| Due process | A notice opens a 15-day appeal window, and grants continue during it. An appeal pauses graduation until the hearing outcome is recorded. |
| Calamity freeze | A Super Admin can declare a calamity (RA 10121). Dispatch and new flags stop in that area. |
| Re-flag cooldown | A family kept on the program cannot be flagged again for 180 days. |
| Audit ledger | Every change is saved with a SHA-256 hash of the change before it. Editing an old record breaks the chain at exactly that record, and the COA auditor sees it. |
| Sangla-ATM detection | A separate check on ATM log windows looks for many cards swiped quickly at one machine late at night. |

---

## How it is built

```
Browser / phone (React PWA)
        │  HTTPS
        ▼
API (Node.js + Express) ──► ML service (FastAPI, LightGBM v2 + SHAP)
        │
        ▼
MongoDB (6 collections, append-only audit log)
```

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS. Installable PWA with IndexedDB for offline reports.
- **Backend:** Node.js 20, Express 4, Mongoose 8, Joi validation, JWT sign-in (15 minutes), bcrypt passwords.
- **ML:** Python 3.10, FastAPI, LightGBM v2 trained on 29,080 real households from the PSA 2015 Family Income and Expenditure Survey. On 6,232 households it never saw: macro F1 0.6244, ROC-AUC 0.902.
- **Database:** MongoDB 6 replica set (transactions). Every status change and its audit block are saved together, or not at all.
- **Local:** one `docker compose up` starts the gateway (nginx), client, API, ML service and database.
- **Hosted:** Vercel (client), Render (API and ML), MongoDB Atlas (database). See [`deploy/HOSTING_GUIDE.md`](deploy/HOSTING_GUIDE.md).

Diagrams (use case, activity, class, state, sequence, architecture, deployment, ERD) are in [`docs/diagrams/`](docs/diagrams/).

---

## If the live site is not working: run it on your own computer

Follow these steps in order. They take about 10 minutes the first time (most of it is Docker building the images).

### Step 1. Install the tools (one time)

| Tool | Why | Get it |
| --- | --- | --- |
| Docker Desktop (Windows / macOS) or Docker Engine + Compose (Linux) | Runs the whole system | https://www.docker.com/products/docker-desktop/ |
| Git | Downloads the code | https://git-scm.com/downloads |
| Node.js 20.15 or newer | Needed by the data-loading step and the test scripts | https://nodejs.org/ |

Open Docker Desktop and wait until it says it is running.

**Windows:** use **Git Bash** for every command below, and first run these two lines once in each new Git Bash window:

```bash
export MSYS_NO_PATHCONV=1
set +H
```

### Step 2. Download the code

```bash
git clone https://github.com/renzv-compsci/KilosUnlad.git
cd KilosUnlad
```

### Step 3. Start the system

```bash
docker compose up -d --build
docker compose restart gateway
```

The first time, this builds five containers (gateway, client, API, ML service, database). Wait until it finishes, then check that all of them are running:

```bash
docker compose ps
```

No `.env` file is needed; the defaults in `docker-compose.yml` work as they are. If your computer only has the older `docker-compose` command, type `docker-compose` wherever this guide says `docker compose`.

### Step 4. Check that the server is ready

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/v1/insights/overview
```

| It prints | Meaning | What to do |
| --- | --- | --- |
| `401` | Ready (the page exists and asks for a sign-in) | Go to Step 5 |
| `502` | The gateway started before the API | `docker compose restart gateway`, then try again |
| `404` | Old images are still running | `docker compose up -d --build`, then try again |
| nothing / connection refused | Docker is still starting | Wait 30 seconds and try again |

### Step 5. Load the data (seeding)

The database starts empty, so load a dataset. **Use the first command to get the same data as the live site.**

```bash
bash data-pipeline/scripts/load_deployment_data.sh
```

It takes about a minute and prints five steps:

1. Reset: empties the database and creates the test accounts.
2. Ingest: loads 20,000 households in Calamba (Palingon, Lecheria, Real).
3. Removes the small hand-made test households, but keeps Case A (`DEMO-4PS-GRAD-0001`) for the demo.
4. Adds a caseworker for every barangay (`cw_palingon_1`, `cw_palingon_2`, `cw_lecheria`, `cw_real`).
5. Creates real activity **through the API**, like real users would: the model assesses households until about 32 are flagged, 12 are sent to caseworkers, 4 reports come back with photos, the director issues 1 notice and keeps 1 family on the program.

It is done when the last lines say `ledger 1-50 valid: true` and `[SUCCESS] Deployment dataset populated.`

Optional check (12 checks, all should say `[OK]`):

```bash
node data-pipeline/scripts/test_deployment_dataset.js
```

Other datasets (each one clears the database first):

| Command | What you get | Use it for |
| --- | --- | --- |
| `bash data-pipeline/scripts/reset_test_data.sh` | 7 small test households | The step-by-step manual tests S1–S15 |
| `bash data-pipeline/scripts/reset_test_data.sh demo` | 80,000 households | A bigger load |

If you use the older `docker-compose` command, put `COMPOSE=docker-compose` in front, for example `COMPOSE=docker-compose bash data-pipeline/scripts/load_deployment_data.sh`.

### Step 6. Open the app and sign in

Open **http://localhost** in Chrome or Edge and sign in with any account from the [test accounts](#test-accounts) table. Then follow [Try it in 5 minutes](#try-it-in-5-minutes).

### Step 7. Stop it when you are done

```bash
docker compose stop       # stops the system, keeps the data
docker compose start      # starts it again later (then: docker compose restart gateway)
```

To start completely fresh, run Step 5 again.

### GPS on a laptop

Laptops have no GPS, so the photo step can time out. In Chrome, open DevTools (F12) and keep it open. Go to **⋮ → More tools → Sensors → Location → Other** and type the household's latitude and longitude. A real phone outdoors does not need this.

### Common problems

| Problem | Fix |
| --- | --- |
| `Cannot connect to the Docker daemon` | Open Docker Desktop and wait until it is running |
| `bash: !@localhost: event not found` (Git Bash) | Run `set +H` (Step 1) |
| A `docker` command cannot find `/tmp/...` (Git Bash) | Run `export MSYS_NO_PATHCONV=1` (Step 1) |
| Sign-in says it cannot reach the server | Step 4 must print `401`; if not, follow its table |
| The dashboard shows 0 households | The data was not loaded: run Step 5 |
| Port 80 is already in use | Close the other program using it (often IIS, Skype or another web server) and run Step 3 again |

More help: [`docs/testing/MANUAL_TEST_SCENARIOS.md`](docs/testing/MANUAL_TEST_SCENARIOS.md) §T.

---

## Tests

| What | Command | Result on the final build |
| --- | --- | --- |
| Client unit tests | `cd client && npm test` | 69 pass |
| Server tests (needs a MongoDB replica set) | `cd server && npm test` | 175 pass |
| Model and UAT scorer tests | `python -m pytest -q data-pipeline/scripts/test_section12_ml_unit.py data-pipeline/scripts/test_score_uat.py` | 15 pass |
| Whole test plan, Section 12 (Docker stack) | `bash data-pipeline/scripts/run_section12_plan.sh` | 17 / 17 steps pass |
| Full rehearsal of every integration script | `bash data-pipeline/scripts/run_capstone_proofs.sh --full` | 19 / 19 steps pass |
| Deployment dataset check (local or hosted) | `node data-pipeline/scripts/test_deployment_dataset.js` | 12 / 12 checks pass |
| Browser test at phone, tablet and desktop width (small set) | `CLIENT_URL=http://localhost node data-pipeline/scripts/test_ui_live_data.js` | all checks pass |

All of these were run on the final build on 2026-10-18. Logs: [`docs/testing/evidence/final-2026-10-18/`](docs/testing/evidence/final-2026-10-18/).

To test the hosted API instead of your computer, put `BASE_URL=https://<your-render-api>/api/v1` in front of a `node` command.

- Every test case and its ID: [`docs/testing/MASTER_TEST_CATALOG.md`](docs/testing/MASTER_TEST_CATALOG.md)
- Tests you can do by hand, by role: [`docs/testing/MANUAL_TEST_SCENARIOS.md`](docs/testing/MANUAL_TEST_SCENARIOS.md)
- Unit test report: [`docs/testing/UNIT_TEST_REPORT.md`](docs/testing/UNIT_TEST_REPORT.md)
- Section 12 results: [`docs/testing/SECTION12_TEST_RESULTS.md`](docs/testing/SECTION12_TEST_RESULTS.md)

---

## Folder guide

| Folder | What is inside |
| --- | --- |
| `client/` | React PWA (screens, offline storage, styles) |
| `server/` | Express API (routes, guards, workflow, audit ledger) and its tests |
| `ml-service/` | FastAPI model service and the trained model files (`artifacts/v2/`) |
| `data-pipeline/` | Data generator, seeding, fixtures and all integration test scripts |
| `docker/` | nginx gateway and MongoDB setup |
| `deploy/` | Hosting guide and Atlas seeding script |
| `docs/` | Diagrams, API contracts, design decisions, test documents and reports |

Useful documents:
- [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md): the problem and the solution
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how the parts fit together
- [`docs/contracts/`](docs/contracts/): the exact request and response of every API route
- [`docs/decisions/`](docs/decisions/): why each design choice was made (DECISION-001 to 012)
- [`deploy/HOSTING_GUIDE.md`](deploy/HOSTING_GUIDE.md): how to put it on Vercel, Render and Atlas

---

## Limits (stated honestly)

- The model is right often, not always (macro F1 0.6244, below the 0.85 target). That is why a flag only schedules a visit and a person decides.
- All households and the electricity, water, vehicle and ATM records are synthetic. Live government and bank feeds are not connected.
- The pilot covers one city: Calamba, Laguna.
- On the free hosting plan, uploaded photos are lost when the API restarts. Their fingerprints and audit blocks stay in the database.
- Sign-in has no lockout after many wrong passwords yet.

## Laws the design follows

RA 11310 (4Ps Act), RA 10173 (Data Privacy Act), RA 1405 (Bank Secrecy), RA 9510 (Credit Information System Act), RA 10121 (Disaster Risk Reduction and Management Act), RA 11552 (Lifeline Rate).

## Team

| Member | Role |
| --- | --- |
| Renz Jerik C. Viloria | Project Manager, Data Pipeline |
| Charles John R. Cabatian | Machine Learning |
| Markie Angelo S. Mojica | Frontend |
| Ma. Mae S. Santos | Backend |
| Kit Dustin P. Martinez | Database |

Submitted to Mr. Rogel M. Labanan, COM-241.

## License

MIT. See [`LICENSE`](LICENSE).
