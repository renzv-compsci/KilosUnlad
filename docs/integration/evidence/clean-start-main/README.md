# Clean-start verification of `main` (2026-10-13, after PR #33)

Fresh clone of `main` (`219b180`), `docker compose up -d --build` (ML service on the **v2** model),
reset → 80k ingest → snapshot, then both runners from clean resets.

| Run | Result |
| --- | --- |
| `run_capstone_proofs.sh --full` (`capstone/`) | 15/16 on first run; **E2E-03 failed only because its check hard-coded the v1 model's prediction** (score 75 with an SWDI term of 0). v2 predicts one level higher, so the score is 100 with an SWDI term of 40; the published weights are unchanged. Check fixed to derive the SWDI term from the response; E2E-03 then **PASS** on the same stack. |
| `run_section12_plan.sh` (`section12/`) | **14/14** |

v2 checks done by hand: Demo Case A is still predicted Level 3 (p = 0.998), so Proof 1 holds; the
metadata reports 0 empirical-test rows in training.
