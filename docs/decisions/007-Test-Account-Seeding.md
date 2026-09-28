# DECISION-007: Test Account Seeding for Integration Testing
**Author:** Dustin Martinez (Database Architecture Lead)
**Status:** PROPOSED
**Date Created:** 2026-09-29
**Date Resolved:** —

---

## 1. Context & Problem Statement

Mae and Markie need synthetic test accounts to run live integration tests against
the backend and frontend. Specifically:

- 4 user accounts, one per role (`SUPER_ADMIN`, `REGIONAL_DIRECTOR`, `CASE_WORKER`, `COA_AUDITOR`)
- A small set of sample beneficiaries and verification tasks to exercise the UI
- Credentials shared privately with Markie

**Scope issue:** user account seeding is not assigned in any roadmap:

- Dustin's roadmap Task 3.1 covers `seed_beneficiaries.json` and
  `seed_external_records.json` — beneficiaries and external records only.
  No user accounts.
- Mae's roadmap covers backend controllers and services, not database seeding.
- Renz's roadmap covers synthetic data generation for beneficiaries, not accounts.
- No contract requires test accounts — they are dev/testing only.

The gap surfaced during integration testing when Markie needed to log in as
different roles. Without accounts, role-based UI testing cannot proceed.

This decision is raised to formally assign ownership and prevent unassigned work
from silently becoming Dustin's responsibility.

---

## 2. Options Considered

**Option A — Dustin delivers test accounts as ad-hoc integration support.**

Dustin writes a single mongosh script (`data-pipeline/scripts/seed_test_data.js`)
that:

- Creates 4 user accounts (one per role) with bcrypt-hashed passwords
- Creates approximately 5 sample beneficiaries across Calamba barangays
- Creates approximately 3 sample verification tasks assigned to the case worker
- Prints credentials to console for private sharing

Documented as integration support, not a Phase 3 deliverable.

- Pros: Fast (~30 min). Unblocks Markie immediately. Script is self-contained.
- Cons: Outside Dustin's formal scope. Sets a precedent for unassigned work.

**Option B — Raise the decision and formally assign ownership.**

Renz assigns an owner. Either Dustin or another team member delivers it under
a formal decision.

- Pros: Clean scope record. Ownership explicit.
- Cons: Adds a decision cycle for a small task.

---

## 3. Developer's Recommendation

Adopt **Option A**.

Rationale:

- The task is small and time-sensitive — Markie is blocked now.
- Account seeding sits inside Dustin's technical domain (database + bcrypt).
- Documentation of the task as integration support keeps the scope record clean.
- A formal decision doc for a 30-minute support task is overhead.

If Renz prefers strict scope control, adopt Option B. Dustin is willing to own
the task either way.

**Proposed script contents:**

| Item | Count | Notes |
|------|-------|-------|
| User accounts | 4 | One per role, bcrypt-hashed passwords |
| Sample beneficiaries | 5 | Across Calamba barangays, varied `program_status` |
| Sample verification tasks | 3 | Assigned to `case_worker_test` |
| Sample external records | 2 | Linked to beneficiaries for ML feature testing |

**Credentials will not be committed to the repository.** They will be shared
privately with Markie via a private channel.

---

## 4. Official PM / Tech Lead Resolution (Filled by Renz)

* [ ] Decision: [ACCEPTED / REJECTED / MODIFIED]
* [ ] Owner of test account seeding: [Dustin / Other / TBD]
* [ ] Documentation format: [Phase 3 report note / Separate section]
* [ ] Action Items:
  - [ ] Dustin: Write `data-pipeline/scripts/seed_test_data.js`
  - [ ] Dustin: Run script against local DB
  - [ ] Dustin: Share credentials with Markie privately
  - [ ] Dustin: Note in `docs/PHASE_3_REPORT.md`

---

## 5. Impact Assessment

- **Files affected:** New file `data-pipeline/scripts/seed_test_data.js`
- **Contracts affected:** None
- **Schemas affected:** None
- **Phases affected:** Not a Phase 3 deliverable — integration support only
- **Risk:** Low — dev/test data only, credentials not committed
- **Effort:** ~30 minutes

---

## 6. References

- Dustin's roadmap Task 3.1 — Phase 3 seed ingestion scope
- Mae's integration review (2026-09-28) — synthetic accounts request
- DECISION-005 — append-only role (data writes must respect role permissions)
- DECISION-006 — replica set (seeding runs against replica set `rs0`)

---

**End of Document**