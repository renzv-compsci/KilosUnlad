# Database — Phase 3 Non-Scope: Test Account Seeding

**Author:** Dustin Martinez (Database Architecture Lead)
**Date:** 2026-09-29
**Status:** COMPLETE
**Related:** DECISION-007
**Scope:** Integration support — NOT a Phase 3 deliverable

---

## 1. Purpose

Seed test accounts and minimal sample records so Mae and Markie can run live
integration testing against the backend and frontend.

Delivered as ad-hoc integration support. User account seeding is not assigned
to any roadmap; Dustin's Task 3.1 covers only `seed_beneficiaries.json` and
`seed_external_records.json` (both pending delivery from Renz).

---

## 2. Deliverables

| Item | Count |
|------|-------|
| User accounts | 4 (one per role) |
| Sample beneficiaries | 3 |
| Sample verification tasks | 2 |

**Script:** `data-pipeline/scripts/seed_test_data.js`
**Decision doc:** `docs/DECISION-007-Test-Account-Seeding.md`

**Accounts:**

| Role | Username |
|------|----------|
| SUPER_ADMIN | `super_admin_test` |
| REGIONAL_DIRECTOR | `director_test` |
| CASE_WORKER | `case_worker_test` |
| COA_AUDITOR | `auditor_test` |

Passwords are bcrypt-hashed (cost 10) at insert time. Credentials shared
privately with Markie and Mae.

---

## 3. Database Verification

    Users: 4
    Beneficiaries: 3
    Tasks: 2

All documents inserted per schema. No duplicate inserts (idempotent script).

---

## 4. Scope Note

**This is integration support, not a Phase 3 deliverable.**

- **Task 3.1 (Phase 3):** Ingest `seed_beneficiaries.json` and
  `seed_external_records.json` — pending Renz's delivery.
- **This task:** Ad-hoc account seeding for live integration testing.
- Formalized via DECISION-007 to keep the scope record clean.

---

## 5. Files

- New: `data-pipeline/scripts/seed_test_data.js`
- New: `docs/DECISION-007-Test-Account-Seeding.md`
- New: `docs/database-phase-3-nonscope.md` (this file)

Contracts unchanged. Schemas unchanged.

---

**End of Report**