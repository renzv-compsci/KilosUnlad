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

* **Decision:** **ACCEPTED (Option A Approved)**
* **Owner of Test Account Seeding:** Dustin Martinez (Database Architecture Lead)
* **Scope Boundary:** 
  - Strictly integration/testing support; does not alter Renz's Phase 2/3 synthetic data generator (`generator.py`).
  - Restricted to exactly **4 user accounts** (one per system role), **5 sample households**, and **3 sample verification tasks**.
* **Security & Credential Policy:**
  - Passwords must be hashed using `bcrypt` / `bcryptjs`.
  - Plaintext passwords must **not** be committed to the public repository. They will be shared privately with Markie and Mae.

* **Action Items:**
  - [x] **Dustin:** Write the standalone script in `data-pipeline/scripts/seed_test_data.js`.
  - [x] **Dustin:** Run the script against the local database container to verify account creation.
  - [x] **Dustin:** Share the 4 test login credentials privately with Markie and Mae.
  - [x] **Dustin:** Document the script usage in `docs/tasks/DUSTIN_DATABASE.md` under integration support.