# Phase 4 — Database Handoff

**Author:** Dustin Martinez (Database Architecture Lead)
**Date:** 2026-10-08
**Status:** COMPLETE (local environment)
**Recipients:** Renz (PM), Charles (ML)
**Related:** DUSTIN_DATABASE.md Phase 4

---

## 1. Purpose

This handoff covers Phase 4 database work:

- **Task 4.1** — Adversarial tampering test on the audit chain
- **Task 4.2** — Data integrity and null constraint audit

It documents what was built, how to run it, what was verified, and known
limitations. It hands off to Renz and Charles for continuation.

---

## 2. Task 4.1 — Adversarial Tampering Test

### 2.1 What Was Built

Two files:

- `data-pipeline/scripts/seed_audit_chain.py` — seeds a valid N-entry
  hash chain into `audit_logs`
- `docker-compose.yml` — added `seed-audit` one-shot service

### 2.2 Why We Seeded It

`audit_logs` was empty because Mae's audit middleware is unmounted and
no workflow had triggered an audit write. To test tamper detection, we
needed a valid chain. No roadmap assigned the seed task. We built it and
validated it against Mae's own `verify-chain` endpoint — the endpoint is
the acceptance authority.

### 2.3 How to Run

**Prerequisite:** Database running, replica set PRIMARY, seeded test
accounts exist.

**Seed:**

```powershell
docker-compose run --rm seed-audit
```

**Verify (before tamper):**

```powershell
$body = @{ username = "super_admin_test"; password = "SuperAdminTest2026!" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $body
$token = $login.access_token
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/audit/verify-chain?start_sequence=1&end_sequence=5" -Headers @{ "Authorization" = "Bearer $token" }
```

Expected: `is_chain_valid: true`, `total_blocks_verified: 5`

**Tamper:**

```powershell
docker exec -it kilosunlad-db mongosh "mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin"
```

Inside:

```javascript
db.audit_logs.updateOne({ sequence_index: 3 }, { $set: { 'state_delta.after.status': 'TAMPERED' } })
exit
```

**Verify (after tamper):**

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/audit/verify-chain?start_sequence=1&end_sequence=5" -Headers @{ "Authorization" = "Bearer $token" }
```

Expected: `is_chain_valid: false`, `head_hash: INVALID_HASH_AT_SEQUENCE_3`,
`broken_blocks` contains `sequence_index: 3`.

### 2.4 Results

| Step | Result |
|------|--------|
| Seed 5 entries | ✅ |
| Verify before tamper | ✅ `is_chain_valid: true` |
| Tamper entry #3 | ✅ `modifiedCount: 1` |
| Verify after tamper | ✅ `is_chain_valid: false`, sequence 3 flagged |

### 2.5 DoD

> The system flags the exact sequence number and detects the broken hash chain.

✅ Met.

---

## 3. Task 4.2 — Data Integrity & Null Constraint Audit

### 3.1 What Was Built

- `data-pipeline/scripts/audit_integrity.py` — read-only audit
- `docker-compose.yml` — added `audit-integrity` one-shot service

### 3.2 What It Checks

Per-collection:

| Collection | Checks |
|-----------|--------|
| `users` | `username`, `email`, `role` non-null |
| `beneficiaries` | `household_id` non-null; `head_of_household.national_id` non-null |
| `external_records` | `matched_household_id` references real beneficiary; `national_id` non-null |
| `verification_tasks` | `task_id`, `household_id` non-null; `household_id` references real beneficiary; `assigned_worker_id` references real user |
| `audit_logs` | `sequence_index`, `entry_hash`, `previous_entry_hash` non-null |
| `system_configs` | `config_key` non-null |

### 3.3 How to Run

```powershell
docker-compose run --rm audit-integrity
```

Output shows per-collection document count and issue count, plus a
summary with PASS/FAIL.

### 3.4 Results

```
[PASS] users: 4 documents, 0 issues
[PASS] beneficiaries: 54 documents, 0 issues
[PASS] external_records: 50 documents, 0 issues
[PASS] verification_tasks: 2 documents, 0 issues
[PASS] audit_logs: 5 documents, 0 issues
[PASS] system_configs: 0 documents, 0 issues

Total documents: 115
Total issues: 0
```

### 3.5 DoD

> Confirms zero orphaned references across all 6 collections.

✅ Met.

---

## 4. Files Added or Modified

| File | Status | Purpose |
|------|--------|---------|
| `data-pipeline/scripts/seed_audit_chain.py` | New | Audit chain seeder |
| `data-pipeline/scripts/audit_integrity.py` | New | Data integrity audit |
| `docker-compose.yml` | Modified | Added `seed-audit`, `audit-integrity` services |

---

## 5. Continuation for Renz and Charles

### Immediate

Nothing — both tasks are complete within local scope.

### When the Data/ML Pipeline Arrives

Once Renz supplies the real `seed_beneficiaries.json` and
`seed_external_records.json` (Phase 3), re-run:

```powershell
docker-compose run --rm seed-ingest
docker-compose run --rm audit-integrity
```

The integrity audit will re-verify zero orphans against the real dataset.

### When Mae's Audit Middleware Is Mounted

Once `audit.middleware.js` is wired into mutation workflows, future
mutations will write audit entries automatically. The seed script
(`seed_audit_chain.py`) becomes only useful as a testing fixture for
fresh environments.

At that point, real production audit chains can be tested without
seeding.

### Verification in Shared Environment

Per Mae's handoff: "Deployment acceptance and audit coverage for future
mutations remain open." Re-run the tamper test in the shared deployment
once available.

---

## 6. Known Limitations

- **Local verification only.** No shared deployment acceptance yet.
- **Single-node replica set.** Per DECISION-006.
- **5-entry seed.** Not 1,000. Enough to prove tamper detection works.
- **Audit middleware unmounted.** Future mutations still won't write
  audit entries until Mae's Task 4.2 is wired in.

---

## 7. References

- `docs/reports/PHASE_4_DATABASE_REPORT.md` — full technical report
- `docs/handoffs/PHASE3_PHASE4_BACKEND_HANDOFF.md` — Mae's backend handoff
- `docs/contracts/admin-web/audit-chain-verification.json` — audit endpoint contract
- `server/src/services/hashChain.service.js` — chain verification logic
- `server/src/utils/cryptoHelper.js` — hash computation
- `server/src/utils/canonicalJson.js` — canonical JSON serialization

---

**End of Handoff**