# Test Data Seeding — Handoff for Markie

**Author:** Dustin Martinez (Database Architecture Lead)
**Date:** 2026-10-02
**Related:** DECISION-007, `data-pipeline/scripts/seed_test_data.js`
**Audience:** Markie Angelo (Frontend Lead)

---

## 1. Purpose

This handoff explains how to set up the test data needed for frontend
integration testing. It includes:

- Test account credentials
- Test data references
- How to fix an existing database where the pending task is linked to the
  wrong household

---

## 2. Test Accounts

| Role | Username | Password |
|------|----------|----------|
| SUPER_ADMIN | `super_admin_test` | `SuperAdminTest2026!` |
| REGIONAL_DIRECTOR | `director_test` | `DirectorTest2026!` |
| CASE_WORKER | `case_worker_test` | `CaseWorkerTest2026!` |
| COA_AUDITOR | `auditor_test` | `AuditorTest2026!` |

---

## 3. Test Data

| Entity | ID | Location | Status |
|--------|----|---------| -------|
| Beneficiary | `TEST-4PS-0001` | Palingon | ACTIVE_COMPLIANT |
| Beneficiary | `TEST-4PS-0002` | Lecheria | FLAGGED_FOR_REVIEW |
| Beneficiary | `TEST-4PS-0003` | Real | UNDER_INVESTIGATION |
| Beneficiary | `TEST-4PS-0004` | Palingon | FLAGGED_FOR_REVIEW |
| Task | `TEST-TSK-0001` | Linked to `TEST-4PS-0004` (Palingon) | PENDING_DISPATCH |
| Task | `TEST-TSK-0002` | Linked to `TEST-4PS-0003` (Real) | SUBMITTED |

**Notes:**

- `case_worker_test` is scoped to **Palingon only**.
- `TEST-TSK-0001` is the only pending task in her jurisdiction.
- `TEST-TSK-0002` (Real) is out of her jurisdiction — should not appear in her
  assigned tasks feed.
- CASE_WORKER cannot access the triage endpoint (expected HTTP 403). Check
  worker jurisdiction through the assigned-task feed instead.

---

## 4. Setting Up Test Data

### 4.1 First-time setup

If your database is empty or you are starting fresh:

1. Make sure the Docker stack is running:
docker-compose up -d

2. Copy the seed script into the container:
docker cp data-pipeline/scripts/seed_test_data.js kilosunlad-db:/tmp/seed_test_data.js

3. Run the seed script:
docker exec -it kilosunlad-db mongosh -u admin_user -p RootAdminSecret2026! --authenticationDatabase admin /tmp/seed_test_data.js


4. Expected output — all items should say `[OK]`:
[1] Seeding test users...
[OK] super_admin_test (SUPER_ADMIN)
...
[2] Seeding sample beneficiaries...
[OK] TEST-4PS-0001 (ACTIVE_COMPLIANT)
[OK] TEST-4PS-0002 (FLAGGED_FOR_REVIEW)
[OK] TEST-4PS-0003 (UNDER_INVESTIGATION)
[OK] TEST-4PS-0004 (FLAGGED_FOR_REVIEW)
[3] Seeding sample verification tasks...
[OK] TEST-TSK-0001 (PENDING_DISPATCH)
[OK] TEST-TSK-0002 (SUBMITTED)


### 4.2 Existing database — relink the pending task

**Only needed if you already ran the seed script before 2026-10-02.**

The seed script is idempotent — it skips records that already exist. If your
database has an old `TEST-TSK-0001` linked to `TEST-4PS-0002` (Lecheria), the
script will not overwrite it. You need to either delete and re-insert, or
update in place.

**Delete and re-run the script:**
db.verification_tasks.deleteOne({ task_id: 'TEST-TSK-0001' })

Then re-run the seed script (step 4.1, items 2–3).

## 5. Verifying the Fix
confirm the task points to the correct household:

docker exec -it kilosunlad-db mongosh "mongodb://app_user:AppUserPassword2026!@localhost:27017/kilosunlad?replicaSet=rs0&authSource=kilosunlad" --eval "const t = db.verification_tasks.findOne({ task_id: 'TEST-TSK-0001' }); print('Task household:', t.household_id);"


Expected:
Task household: TEST-4PS-0004
---

## 6. Frontend Testing Checklist

Once the data is set up, log in as `case_worker_test` and verify:

- [ ] Assigned tasks feed shows `TEST-TSK-0001` (PENDING_DISPATCH)
- [ ] `TEST-TSK-0002` (Real) does **not** appear — out of jurisdiction
- [ ] Triage endpoint rejects CASE_WORKER access with HTTP 403
- [ ] Assigned task `TEST-TSK-0001` displays household `TEST-4PS-0004` in Palingon

If any of these fail, send the actual result + browser console output to Mae
so she can verify the backend filtering.

---

## 7. Credentials Sharing

These are **test accounts only**. Do not use them for anything beyond local
integration testing. Do not commit them to the repository.

If credentials need to be shared with another team member, send them privately
— not in the group chat.

---

## 8. References

- Seed script: `data-pipeline/scripts/seed_test_data.js`
- Decision: `docs/DECISION-007-Test-Account-Seeding.md`
- Non-scope report: `docs/database-phase-3-nonscope.md`
- Backend handoff: `docs/handoffs/FRONTEND_AUTH_HANDOFF.md`
- Server setup: `server/README.md`

---

**End of Document**
