# Sprint 6 Evidence — Defense Packaging (DEF-01 … DEF-05)

Date: 2026-10-12 | No Docker daemon was available in this session. Every result below was
produced against real processes: MongoDB 8.0 replica set, Node server, FastAPI ML service with
the shipped LightGBM artifact, the project's Nginx `default.conf`, the Vite client and Chromium.
Docker-stack runs are still to be recorded.

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

Docker run: `bash data-pipeline/scripts/run_capstone_proofs.sh --full` with the defaults
(`docker-compose run --rm reset-demo`, fixtures through `docker exec kilosunlad-db mongosh`, gateway
`http://localhost/api/v1`). Proof 2 needs `npm install playwright-core` and a Chromium path.

## DEF-03 — Clean clone (partial)
Fresh `git clone` of the branch into an empty directory. Install was from lockfiles only, with no
files copied from the working tree:
- `docker compose config`: valid (warning only: the obsolete `version:` key).
- All 15 files referenced by compose or the reset (Dockerfiles, nginx conf, init-mongo, ML
  artifact and metadata, 80k seeds, demo seeds, reset and seed scripts) are present.
- Server `npm ci` + `npm test` (replica-set suites and `TEST_MONGO_URI`): **152 pass, 0 fail**.
  The 2 skips are the Docker-only suites.
- Client `npm ci` + tests **66/66**, typecheck, production build, PWA tests **2/2**.
- `test_seed_mapping.py` OK; all pipeline Python compiles; all scripts parse.

Not yet verified: `docker compose up` booting all five containers on foreign hardware.

## DEF-04 — Slide deck: BLOCKED
The DoD requires the single reconciled Macro F1 (ML-01) and v2 provenance (ML-06). Both are
Sprint 2 outputs owned by Charles. Every other deck input is measured and cited in this folder,
`sprint-3/`, `sprint-4/` and `CHANGELOG_TRACEABILITY.md`.

## DEF-05 — Documentation closure
`docs/integration/CHANGELOG_TRACEABILITY.md` (change log, traceability matrix, flag register),
`docs/decisions/009-ml-vector-and-assessment-contracts.md`, backlog rev 5, turnover API surface,
and the scrum plan change log.
