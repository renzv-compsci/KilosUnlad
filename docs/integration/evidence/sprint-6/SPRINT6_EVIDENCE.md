# Sprint 6 Evidence — Defense Packaging (DEF-01 … DEF-05)

Date: 2026-10-12, Docker runs added 2026-10-13.

- **2026-10-12:** the first results were produced against real local processes, because no Docker daemon was available that day: a MongoDB 8.0 replica set, the Node server, the FastAPI ML service with the shipped LightGBM artifact, the project's Nginx `default.conf`, the Vite client and Chromium.
- **2026-10-13:** a Docker daemon became available, and DEF-02 and DEF-03 were re-run on the real Compose stack (`mongo:6.0`, the four built images).

## DEF-01 / DEF-02 — Capstone proofs scripted and rehearsed
`data-pipeline/scripts/run_capstone_proofs.sh [--full]` resets before every scenario, applies the
scenario's fixtures, times it, and writes `SUMMARY.md` plus one log per scenario.
Local rehearsal (`rehearsal-local/`): **15/15 PASS**.

| Proof | Seconds (incl. reset) |
| --- | --- |
| 1 Graduation Drift (via gateway) | 6.4 |
| 2 Offline Field Visit (airplane mode) | 12.6 |
| 3 Sangla-ATM (85.0/100) | 4.2 |
| 4 Audit Proof (tamper at block 3) | 5.5 |

**Docker rehearsal (`rehearsal-docker/`): 16/16 PASS** (2026-10-13). This was `run_capstone_proofs.sh --full` on the Compose stack of a fresh clone, with the default reset (`docker-compose run --rm reset-demo`), fixtures through `docker exec kilosunlad-db mongosh`, and the gateway on `http://localhost`. The 80k steps used the DAT-05 snapshot restore.

| Proof (Docker) | Seconds (incl. reset) |
| --- | --- |
| 1 Graduation Drift (via gateway) | 5.0 |
| 2 Offline Field Visit (airplane mode, Chromium) | 10.1 |
| 3 Sangla-ATM (85.0/100) | 3.6 |
| 4 Audit Proof (tamper at block 3) | 5.0 |

Two earlier Docker attempts failed. Neither was a system defect:
1. The first attempt failed with `MODULE_NOT_FOUND`: the host had no `server/node_modules` (documented prerequisite).
2. The second failed DAT-01's index check. That check ran as `app_user`, and the role grants `listIndexes` only on `audit_logs`, so the check read `Unauthorized` as "index missing". This was fixed in the test (commit `23e6a9f`); the role is unchanged.

## DEF-03 — Clean clone

**Docker boot (2026-10-13): DONE** (`clean-clone-docker/`).
- A fresh `git clone` of the branch was followed by `docker compose up -d --build`.
- `client`, `db`, `gateway`, `ml-service` and `server` came up; `replset-init` exited 0.
- Server, ML and gateway answered 17 s after `up` on cached images. No container restarted during either full run.
- **Defect found and fixed (`5f02a04`):** `up` also started the five one-shot jobs. They failed only because the database was still starting; against a running database, `reset-demo` would have wiped it on every `up`. The jobs are now in the `tools` profile, and `docker-compose run --rm <job>` still works.
- **Sandbox note:** this environment blocks the Debian and Alpine mirrors and re-terminates TLS. Builds therefore used `sandbox-override.yml.txt`, which is not part of the repo: host networking, the sandbox CA, and `libgomp` copied from the host for the ML image. The repository's Dockerfiles were built unmodified apart from that override.
- A run on ordinary hardware with no override is still yours to do (turnover §6 Step 1).

### Earlier local-only checks (2026-10-12)
Fresh `git clone` of the branch into an empty directory. Install was from lockfiles only, with no
files copied from the working tree:
- `docker compose config`: valid (warning only: the obsolete `version:` key).
- All 15 files referenced by compose or the reset (Dockerfiles, nginx conf, init-mongo, ML
  artifact and metadata, 80k seeds, demo seeds, reset and seed scripts) are present.
- Server `npm ci` + `npm test` (replica-set suites and `TEST_MONGO_URI`): **152 pass, 0 fail**.
  The 2 skips are the Docker-only suites.
- Client `npm ci` + tests **66/66**, typecheck, production build, PWA tests **2/2**.
- `test_seed_mapping.py` OK; all pipeline Python compiles; all scripts parse.



## DEF-04 — Slide deck: DONE (v1)
"KilosUnlad Capstone Defense" is a 14-slide private artifact; the link is in turnover §6 Step 8. Its slides cover:
- the problem and the approach;
- the architecture;
- the four proofs, each with its screenshot or chart;
- the safeguards and data at volume;
- the reconciled model metrics (0.7771, per-class, ROC-AUC, confusion matrix);
- the verification summary;
- a limitations slide: synthetic-only training, 0.85 not met, no notice-issuance route, UAT ratings pending, no TLS.

Each slide's speaker notes name the evidence file behind its numbers. The v2 provenance (ML-06) is still blocked on the FIES input; update the model and limitations slides once v2 exists.

## DEF-05 — Documentation closure
`docs/integration/CHANGELOG_TRACEABILITY.md` (change log, traceability matrix, flag register),
`docs/decisions/009-ml-vector-and-assessment-contracts.md`, backlog rev 5, turnover API surface,
and the scrum plan change log.
