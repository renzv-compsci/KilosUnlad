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
| Atlas M0: about 512 MB of storage, shared CPU, no backups. | Measured: the 80k baseline is 160,015 documents, about 102 MB of data plus indexes (8.4 MB compressed dump). It fits. The national overview took 0.35 s locally on 80k; expect a few seconds on shared M0. `SEED_80K=0` gives a small, fast demo database. | Re-run `deploy/atlas_seed.sh` to reset the demo. |
| The dashboard map loads street tiles from CARTO (OpenStreetMap data). Free use requires the on-map attribution, which is shown, and is meant for non-commercial projects. | The map needs internet. Offline, the dots still show on a plain background. | Nothing to configure. |
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

This needs the local Docker stack (validation guide, Step 1). The script seeds the database locally with the project's own reset, seed and fixture scripts, then copies the `kilosunlad` database to Atlas with `mongodump`/`mongorestore`. It does not create or change any schema: collections and indexes arrive exactly as they are locally.

```bash
docker compose up -d
ATLAS_ADMIN_URI='mongodb+srv://kilosunlad_admin:<ADMIN_PW>@<HOST>/?retryWrites=true&w=majority' \
  bash deploy/atlas_seed.sh                 # 80k baseline + test fixtures
# or, for a small demo database:
SEED_80K=0 ATLAS_ADMIN_URI='...' bash deploy/atlas_seed.sh
```

**Expect:** `[OK] Atlas now holds the seeded kilosunlad database.` A rehearsal against a local stand-in restored 160,015 documents with all indexes in about 40 s. In Atlas, **Browse Collections** shows the six collections.

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

Wake both services (§0), then run the same integration script used locally against the hosted URLs. It reads, dispatches one fixture household, and walks every persona at phone, tablet and desktop width:

```bash
npm install --prefix /tmp/kt playwright-core && export NODE_PATH=/tmp/kt/node_modules
export CHROMIUM_PATH="<path to chrome or chromium>"
BASE_URL=https://kilosunlad-api.onrender.com/api/v1 CLIENT_URL=https://kilosunlad.vercel.app \
  node data-pipeline/scripts/test_ui_live_data.js
```

**Expect** `[SUCCESS] UI live-data routes and screens verified.` It needs a freshly seeded database (§2), because it dispatches `TEST-4PS-DISPATCH-0001`. Re-seed before running it again.

Optional: the full chain through the hosted API.

```bash
BASE_URL=https://kilosunlad-api.onrender.com/api/v1 node data-pipeline/scripts/test_e2e01_full_chain.js
```

## 7. Test accounts

| Role | Username | Password |
| --- | --- | --- |
| Super Admin | `super_admin_test` | `SuperAdminTest2026!` |
| Regional Director (Calamba: Palingon, Real, Lecheria) | `director_test` | `DirectorTest2026!` |
| Case Worker (Calamba: Palingon) | `case_worker_test` | `CaseWorkerTest2026!` |
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
