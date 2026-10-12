# ADR-001: Production Seed Baseline Selection

Status: APPROVED 
Date: 2026-10-12
Scope: data-pipeline/seeds, seed-ingest tooling, MASTER_TURNOVER.md Domain 6 Step 2

## Context
1. Original contract (RENZ_DATA_PROMPT.md Section 3; RENZ_DATA.md Task 2.3): 5,000 synthetic households.
2. Executed work (Tasks 2.4 and 3.3): 100,000 households generated and partitioned into an
   80,000-record application set and a 20,000-record test set; both passed offline schema,
   referential-integrity, and cohort-preservation validation.
3. MASTER_TURNOVER.md Domain 6 Step 2 still directs ingestion of "the full 5,000-record seed"
   and cites a 15-second ingestion DoD that was measured on 50 placeholder records (Domain 2.2).

## Decision
The production ingestion baseline is the 80,000-record application set
(seed_beneficiaries_app_80k.json and seed_external_records_app_80k.json).
The 20,000-record test set remains isolated for QA and adversarial testing and is never
ingested into the demo database. ML training remains on the empirical
features_swdi_clean.parquet (Sprint 2) and never on synthetic sets.

## Rationale
1. Operational realism: triage pagination, compound-index behavior, and dispatch concurrency
   must be demonstrated at a credible roster volume, not at 5,000 records.
2. Environment isolation: production demo data and QA data must not share records.
3. Proven integrity: the 80k set already satisfies the 1:1 beneficiary-to-external invariant.

## Re-Benchmark Plan (binding)
1. Measure wall-clock time of `docker-compose run --rm seed-ingest` at 80k; record the value
   in docs/integration/evidence/sprint-3/ingestion-timing.log.
2. The 15-second figure is retired as a DoD. Replacement acceptance criteria: zero insert
   errors, recorded timing, and seed-verify IXSCAN assertions passing at 80k.
3. If ingestion exceeds 60 seconds, file a performance task (batch size, index build order);
   Sprint 3 is not blocked on it.
4. reset_demo.sh must be re-verified at the new baseline (Sprint 3, DAT-05); its 10-second
   DoD is re-measured, not assumed.

## Consequences and Mitigations
1. Repository size: keep the 100k master files out of Git (gitignore or LFS); commit only the
   80k/20k partitions if size permits, otherwise deliver via release artifact.
   Current .gitignore treatment of seeds/ requires verification before commit.
2. Documentation debt: MASTER_TURNOVER.md Domain 6 Step 2 and any slide citing 5,000 records
   or 15 seconds must be updated after Sprint 3 (DAT-06).

## Alternatives Considered
A. Ingest 5,000 per original contract. Rejected: understates operational volume and
   contradicts the executed Task 3.3 partitions already validated and reported.
B. Ingest the full 100,000. Rejected: destroys demo/QA isolation and doubles ingestion cost
   with no demonstration benefit.

## Revisit Conditions
A panel or DSWD stakeholder mandates a specific roster size, or 80k ingestion proves
operationally unwieldy on the target hardware.