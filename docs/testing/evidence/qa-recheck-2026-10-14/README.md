# QA re-check of the "Independent QA Handoff Report" (2026-10-14)

**Build tested:** a fresh `git clone` of `main` at `0b69178` (PR #38), every image built with `docker compose build --no-cache`, then `bash data-pipeline/scripts/reset_test_data.sh` (small set: 7 households, 3 tasks, 0 ledger blocks).
**How:** `qa_repro.js` repeats the report's steps for S2, S4 and S5 in Chromium (Playwright) through the gateway at `http://localhost`. Result: **12 of 12 checks pass** (`qa_rerun.json`, screenshots here).

| Report item | Re-check on the current build | Verdict |
| --- | --- | --- |
| 1. Field report submission fails ("submission unavailable") | Caseworker completes the 5 steps at 14.2120, 121.1660 with a photo; the report syncs by itself; the server holds the task as `SUBMITTED` with the photo; the director sees *Report submitted* and **Review report** (`s5-after-sync.jpg`). The label "Submission unavailable" only appears in client builds from before commit `20085f0` (Sprint 5). | Not reproducible: out-of-date client image |
| 2. `GET /insights/overview` 404, 4,850 households, "Sample data" | 200; 7 households, 4 flagged, 1 open field task, 0 graduated; no sample label (`s2-dashboard.jpg`). The route was added in `7261d2c`; the 4,850 sample was removed in `77c0fd0` (DECISION-010). | Not reproducible: out-of-date server and client images |
| 3. No caseworker dropdown; "A staff directory is not available yet" | Dropdown with "Test Case Worker (1 open)"; dispatch returns audit sequence 1 (`s4-dispatch-picker.jpg`). That helper text was removed in `77c0fd0`. | Not reproducible: out-of-date client image |
| 4. Field operations shows 12 dispatches with *#ML-04* names | Caseworker Dispatch lists only seeded households; Field staff shows Test Case Worker with 2 open tasks (`item4-dispatch-view.jpg`). The *#ML-0x* names were sample data removed in `77c0fd0`. | Not reproducible: out-of-date client image |
| 5A. Git Bash rewrites `/tmp` paths in `docker cp` / `docker exec` | Real on Windows Git Bash. | Fixed: `reset_test_data.sh` and the runners export `MSYS_NO_PATHCONV=1`; manual §0.3 |
| 5B. `!` in the password triggers "event not found" | Real when the command is typed in an interactive Git Bash with double quotes. | Fixed: manual §0.3 (`set +H`) and §0.5 (single quotes, `$MONGO_ADMIN`) |

**Why the tester saw old screens:** `docker compose up -d` reuses images that already exist; it rebuilds only with `--build`. Manual §0.1 now requires `--build`, and §0.2 adds a check that prints `401` on the current build and `404` on an old one.
