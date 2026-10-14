# Free hosting: Vercel + Render + MongoDB Atlas

| Part | Host | Plan | Files in this repo |
| --- | --- | --- | --- |
| Client (React PWA) | Vercel | Hobby (free) | `client/vercel.json` |
| API (Express) | Render web service | Free | `render.yaml` (`kilosunlad-api`) |
| ML service (FastAPI, model v2) | Render web service, Docker | Free | `render.yaml` (`kilosunlad-ml`), `ml-service/Dockerfile` |
| Database | MongoDB Atlas | M0 (free) | `deploy/atlas_seed.sh` |

You create the three accounts and paste the secrets. Nothing secret is committed. Follow the steps in this order, because each step needs a URL from the step before it.

---

## 0. What the free plans mean for this system (read first)

| Limit | Effect on KilosUnlad | What to do |
| --- | --- | --- |
| A free Render service sleeps after 15 minutes without traffic. Waking takes up to about a minute. | The first login after a pause fails with "Cannot reach the API" (the client waits 8 s). The first risk assessment after a pause may use the rule-based fallback (`EVALUATED_VIA_FALLBACK`), because the API waits only 2.5 s for the ML service. | Before a demo, open `https://<api>/health` and `https://<ml>/health` and wait for both to answer. Then use the app. |
| The free Render filesystem is ephemeral (no disk). | Uploaded evidence photos are lost when the API restarts or sleeps. The SHA-256 hash, GPS and EXIF data stay in MongoDB and in the audit ledger. | Acceptable for a demo. Production needs a paid disk or object storage, which is out of scope. |
| Render gives 750 free instance hours per month, shared by all free services. | Two services running all day use about 1,440 hours. Because they sleep when idle, normal demo use fits. | Do not ping them to keep them awake. |
| Atlas M0: about 512 MB of storage, shared CPU, no backups. | Measured: the deployment dataset (the default) is 40,010 documents before activity, a 2.2 MB compressed dump. The optional 80k baseline is 160,015 documents, about 102 MB plus indexes (8.4 MB dump). Both fit. | Re-run `deploy/atlas_seed.sh` to reset the demo. |
| The dashboard map loads street tiles from OpenStreetMap ("Streets", the default) or CARTO ("Light"). Both are free with the on-map attribution, which is shown. They are meant for light, non-commercial use; a capstone demo is fine, heavy production traffic is not. | The map needs internet. Offline, the dots still show on a plain background. | Nothing to configure. |
| Render free services have no fixed outbound IP. | Atlas must accept connections from anywhere (`0.0.0.0/0`). | The connection is TLS and password-protected. Use long random passwords. |

These limits were checked against Render's [free-tier documentation](https://render.com/docs/free) and Atlas's [free-cluster limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) (October 2026). Re-check them if a step behaves differently.

---

## 1. MongoDB Atlas (database)

1. Sign up at <https://www.mongodb.com/cloud/atlas>. Create a project, then **Create cluster → M0 Free**. A Singapore region (`ap-southeast-1`) is the closest to the Philippines.
2. **Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`). Render needs this, see §0.
3. **Database Access → Custom Roles → Add New Custom Role.** Name it `kilosUnladAppRole`. Add these collection actions on database `kilosunlad`. This is the same append-only role as `docker/mongo/init-mongo.js` (DECISION-005/006):

   | Collection | Actions |
   | --- | --- |
   | `users`, `beneficiaries`, `external_records`, `verification_tasks`, `system_configs` | `find`, `insert`, `update`, `remove`, `createIndex` |
   | `audit_logs` | `find`, `insert`, `createIndex`, `listIndexes` (**no** `update`, **no** `remove`) |

   > **Stop here if the Atlas UI does not let you create a custom role on M0.** The documentation I could check does not say clearly whether free clusters support custom roles.
   >
   > Do not work around it by giving the app the built-in `readWrite` role. That would let the API account edit or delete audit blocks, and DECISION-005 forbids it. The hash chain would still *detect* tampering, but the database would no longer *prevent* it.
   >
   > Bring the choice back to the team. The options are a paid tier with custom roles, or accepting `readWrite` as a written, documented exception.

4. **Database Access → Add New Database User**, twice:
   - `kilosunlad_app`: password authentication, a long random password, custom role `kilosUnladAppRole`. The API uses this account.
   - `kilosunlad_admin`: a long random password, built-in role **Read and write to any database**. Only the seeding step (§2) uses it.
5. **Connect → Drivers** shows the host, for example `cluster0.abcde.mongodb.net`. Your two connection strings are:

   ```text
   APP   : mongodb+srv://kilosunlad_app:<APP_PW>@<HOST>/kilosunlad?retryWrites=true&w=majority&authSource=admin
   ADMIN : mongodb+srv://kilosunlad_admin:<ADMIN_PW>@<HOST>/?retryWrites=true&w=majority
   ```

   If a password contains `@ : / ? # %`, URL-encode it, or choose a password made only of letters and digits.

## 2. Load the data into Atlas (from your computer)

This needs the local Docker stack (validation guide, Step 1) and **Node.js 20.15 or later** on your computer (the activity script uses `zlib.crc32`). The script builds the database locally with the project's own reset, seed and fixture scripts, then copies the `kilosunlad` database to Atlas with `mongodump`/`mongorestore`. It does not create or change any schema: collections and indexes arrive exactly as they are locally.

The default is the **deployment dataset**: 20,000 households in Calamba plus Case A, a caseworker for every barangay, and activity created through the API (the model flags 25–40 households, 12 are dispatched, 4 reports come back with a photo, one notice, one retention). See `docs/testing/MANUAL_TEST_SCENARIOS.md` §0.4.

There are two ways to create the activity. Choose **B** if you want the report photos to open on the hosted site.

**A. Everything in one step (activity made locally).** Simplest. The 4 seeded reports' photos stay on your computer, so on the hosted site those reports say "The photo is not in storage". New visits made on the hosted site have their photos.
```bash
docker compose up -d
ATLAS_ADMIN_URI='mongodb+srv://kilosunlad_admin:<ADMIN_PW>@<HOST>/?retryWrites=true&w=majority' \
  bash deploy/atlas_seed.sh
```

**B. Households now, activity through the hosted API after §3 (recommended).**
```bash
ACTIVITY=hosted ATLAS_ADMIN_URI='...' bash deploy/atlas_seed.sh
# after §3, with both /health URLs answering:
BASE_URL=https://kilosunlad-api.onrender.com/api/v1 node data-pipeline/scripts/populate_deployment.js
```
The second command must end with `ledger 1-50 valid: true` and `[SUCCESS] Deployment dataset populated.` If it reports a rule fallback, the ML service was still waking up: re-seed with the first command and run it again once `/health` answers.

Other datasets: `DATASET=small` (the 7 test households of the manual scenarios S1–S15) or `DATASET=demo` (the 80k baseline).

**Expect:** `[OK] Atlas now holds the seeded kilosunlad database (deployment).` A rehearsal of path B against a local stand-in restored 40,010 documents with all indexes; the activity step then produced 32 model flags and a valid 50-block ledger, and `test_deployment_dataset.js` passed 12/12. In Atlas, **Browse Collections** shows the six collections.

> `--drop` replaces the `kilosunlad` database on Atlas. Run it again whenever you want a clean demo.

## 3. Render: ML service and API

1. Push this branch to GitHub (already done if you are reading this from GitHub).
2. On Render, go to **New → Blueprint**, choose the repository and branch. Render reads `render.yaml` and proposes `kilosunlad-ml` and `kilosunlad-api`.
3. When asked for the `sync: false` values, enter:

   | Service | Key | Value |
   | --- | --- | --- |
   | kilosunlad-api | `MONGO_URI` | the **APP** string from §1.5 |
   | kilosunlad-api | `CORS_ORIGIN` | temporarily `http://localhost`. You replace it in §5 |
   | kilosunlad-api | `ML_SERVICE_URL` | `https://kilosunlad-ml.onrender.com` (the ML service URL Render shows; use the exact one) |

   Render generates `JWT_SECRET`. Do not reuse the development secret.
4. Wait for both deploys. The ML image takes the longest, about 5 to 10 minutes.
5. Check:

   ```bash
   curl https://kilosunlad-ml.onrender.com/health    # {"status":"online","model_loaded":true,...}
   curl https://kilosunlad-api.onrender.com/health   # {"status":"online","environment":"production",...}
   curl -X POST https://kilosunlad-api.onrender.com/api/v1/auth/login \
     -H 'Content-Type: application/json' -d '{"username":"director_test","password":"DirectorTest2026!"}'
   ```

   The login must return an `access_token`.
   - **The API log says `MongoServerSelectionError`:** check the Atlas network access (§1.2) and the `MONGO_URI` password.
   - **The API log says `not authorized`:** check the custom role (§1.3).

## 4. Vercel: client

1. On Vercel, go to **Add New → Project** and import the repository.
2. Set **Root Directory** to `client`. Vercel reads `client/vercel.json` (Vite build, `dist`, single-page-app rewrite, no-cache for the service worker).
3. Under **Environment Variables**, add `VITE_API_URL` = `https://kilosunlad-api.onrender.com/api/v1`. It is read at build time, so redeploy after changing it.
4. Deploy. Note the production URL, for example `https://kilosunlad.vercel.app`.

## 5. Connect the client and the API (CORS)

On Render, open `kilosunlad-api` → **Environment** and set `CORS_ORIGIN` to the exact Vercel production URL, for example `https://kilosunlad.vercel.app`. Use no trailing slash; separate several URLs with commas. Save; Render redeploys.

> Vercel *preview* URLs differ per deployment, so they are blocked by CORS. Test on the production URL, or add a preview URL to `CORS_ORIGIN` while you need it.

## 6. Prove the hosted system works (Iron Law 1)

Wake both services (§0), then check the hosted data through the hosted API (12 checks: 20,001 households, 25–40 model flags, a caseworker for every barangay, every lifecycle stage, valid ledger):

```bash
BASE_URL=https://kilosunlad-api.onrender.com/api/v1 node data-pipeline/scripts/test_deployment_dataset.js
```

**Expect** `[SUCCESS] Deployment dataset verified.` Then run the role tests in `docs/testing/MANUAL_TEST_SCENARIOS.md` §R on the Vercel URL.

The browser check below walks every persona at phone, tablet and desktop width. It dispatches the fixture household `TEST-4PS-DISPATCH-0001`, so it needs the small set (`DATASET=small`, §2) and a re-seed before each run:

```bash
npm install --prefix /tmp/kt playwright-core && export NODE_PATH=/tmp/kt/node_modules
export CHROMIUM_PATH="<path to chrome or chromium>"
BASE_URL=https://kilosunlad-api.onrender.com/api/v1 CLIENT_URL=https://kilosunlad.vercel.app \
  node data-pipeline/scripts/test_ui_live_data.js
```

**Expect** `[SUCCESS] UI live-data routes and screens verified.`

Optional: the full chain through the hosted API.

```bash
BASE_URL=https://kilosunlad-api.onrender.com/api/v1 node data-pipeline/scripts/test_e2e01_full_chain.js
```

## 7. Test accounts

| Role | Username | Password |
| --- | --- | --- |
| Super Admin | `super_admin_test` | `SuperAdminTest2026!` |
| Regional Director (Calamba: Palingon, Real, Lecheria) | `director_test` | `DirectorTest2026!` |
| Case Worker (Calamba: Palingon, Real) | `case_worker_test` | `CaseWorkerTest2026!` |
| Case Workers, deployment dataset: Andrea Lim, Rafael Mendoza (Palingon); Benjo Ramos (Lecheria); Carmela Dizon (Real) | `cw_palingon_1`, `cw_palingon_2`, `cw_lecheria`, `cw_real` | `FieldStaff2026!` |
| COA Auditor | `auditor_test` | `AuditorTest2026!` |

> These passwords are public in this repository. Anyone who finds your URL can sign in. Share the link only with your panel and team, and delete or pause the services after the defense.

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Login says "Cannot reach the API…" | The API is asleep, or CORS rejects the request | Open `/health`, wait, retry. Check `CORS_ORIGIN` against the exact URL in the address bar. |
| Assessment shows `EVALUATED_VIA_FALLBACK` | The ML service was asleep (2.5 s timeout) | Open the ML `/health`, then assess again. |
| Evidence photo is missing after a while | Free Render disk is ephemeral (§0) | Expected on the free plan. The hash and the audit block remain. |
| A blank page after a redeploy | An old service worker is cached | Reload twice, or close every tab of the site. |
| `403 OUT_OF_JURISDICTION` | The account's jurisdiction does not cover the record | Expected: the guard is working. Use the account that covers the barangay. |
