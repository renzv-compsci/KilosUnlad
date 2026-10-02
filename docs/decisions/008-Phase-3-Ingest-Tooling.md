# DECISION-008: Phase 3 — Seed Ingest Tooling, Python Runtime, and Placeholder Data Strategy
**Author:** Dustin Martinez (Database Architecture Lead)
**Status:** PROPOSED
**Date Created:** 2026-10-02
**Date Resolved:** —

---

## 1. Context & Problem Statement

Phase 3 Task 3.1 requires building `/data-pipeline/scripts/seed_db.py` — a
Python script that bulk-ingests `seed_beneficiaries.json` and
`seed_external_records.json` into MongoDB.

Several implementation details are not specified in the roadmap or any existing
decision:

1. **Where the JSON input files live.** The roadmap names the files but not
   their directory. The script must know where to find them.
2. **How Python runs.** The MongoDB instance runs inside `kilosunlad-db`
   (Docker). Python must reach it. Options span host execution, dedicated
   Docker container, or a Compose service.
3. **Placeholder data.** Renz directed that placeholder data is acceptable
   until his real 5,000-record dataset is delivered. Where placeholders live
   and how they are marked is unspecified.
4. **Connection string details.** Since DECISION-006, MongoDB runs as a
   single-node replica set (`rs0`). The Python connection URI must include
   `?replicaSet=rs0` or `pymongo` will fail with `ServerSelectionTimeoutError`.
5. **DoD verification timing.** The DoD requires ingesting 5,000 records in
   under 15 seconds. Placeholder data may not contain 5,000 records. Whether
   the DoD can be verified now or must wait for Renz's data is undefined.
6. **Validation strategy.** The roadmap says "ingest" but does not specify
   whether the script pre-validates records before insert or relies on
   MongoDB's schema enforcement.

This decision formalizes the implementation choices so the tooling is
consistent, reproducible, and handed off cleanly to Renz and Charles.

---

## 2. Options Considered

### Concern A — JSON file location

**Option A1 — Same directory as script.**

    /data-pipeline/scripts/seed_db.py
    /data-pipeline/scripts/seed_beneficiaries.json
    /data-pipeline/scripts/seed_external_records.json

- Pros: Simple relative paths. Renz drops replacement files in one place.
- Cons: Mixes code and data.

**Option A2 — Sub-folder.**

    /data-pipeline/scripts/seed_db.py
    /data-pipeline/data/seed_beneficiaries.json
    /data-pipeline/data/seed_external_records.json

- Pros: Clean separation of code and data.
- Cons: Adds a folder not mentioned in the roadmap.

**Option A3 — CLI-configurable paths.**

    python seed_db.py --beneficiaries path1 --external path2

- Pros: Flexible.
- Cons: More complex for Renz to run.

### Concern B — Python runtime

**Option B1 — Python on host.**

Runs on the developer's machine, connects to `localhost:27018`.

- Pros: No Docker overhead.
- Cons: Every developer needs Python + PyMongo installed. Different setups across machines.

**Option B2 — Standalone `docker run` command.**

Runs Python in a container, connects via Docker network.

- Pros: No local Python install needed.
- Cons: Long command line, easy to get wrong.

**Option B3 — Dedicated `seed-ingest` service in `docker-compose.yml`.**

    seed-ingest:
      image: python:3.11-slim
      volumes:
        - ./data-pipeline:/app
      working_dir: /app
      command: bash -c "pip install pymongo jsonschema && python scripts/seed_db.py"
      networks:
        - kilosunlad-network

- Pros: Team consistency. `docker-compose run seed-ingest` works on any machine. No local Python.
- Cons: Adds one service to `docker-compose.yml`.

### Concern C — Placeholder data location

**Option C1 — Same folder as script** (matches A1).

**Option C2 — Dedicated `placeholder/` sub-folder.**

    /data-pipeline/placeholder/seed_beneficiaries.json

- Pros: Clearly marked as placeholder.
- Cons: Renz must copy his real files into `scripts/` or update the script path.

**Option C3 — Same paths as real data; marked only in the handoff doc.**

- Pros: Renz drops replacements in place. No code change.
- Cons: No visual distinction between placeholder and real.

### Concern D — DoD verification

**Option D1 — Generate 5,000 placeholder records and verify DoD now.**

- Pros: DoD proven immediately.
- Cons: Large placeholder file to commit.

**Option D2 — Small placeholder (~50 records); note DoD pending Renz's data.**

- Pros: Lightweight.
- Cons: DoD unverified until Renz delivers.

**Option D3 — Both: small placeholder + separate performance test script.**

- Pros: DoD proven without committing 5,000-record JSON.
- Cons: Additional script to maintain.

---

## 3. Developer's Recommendation

### Recommendation for Concern A — **Option A1 (same directory as script)**

Simplest. Renz drops his real JSON into `/data-pipeline/scripts/` and re-runs
the script. No path changes, no CLI arguments. The roadmap says "ingest
`seed_beneficiaries.json` and `seed_external_records.json`" — putting them
next to the script that ingests them is the most literal interpretation.

### Recommendation for Concern B — **Option B3 (`seed-ingest` service in `docker-compose.yml`)**

This is the most professional and team-consistent approach. Reasons:

- No developer needs Python or PyMongo installed locally.
- The same `docker-compose run seed-ingest` command works for Markie, Mae,
  Renz, and Charles.
- The service connects to `db:27017` over the Docker network — no host
  port dependency (`localhost:27018`), no WSL port conflict.
- Adding the service is a one-time change to `docker-compose.yml`.
- The service can be `restart: "no"` so it runs once and exits.

This matches the pattern already established by the `replset-init` service.

### Recommendation for Concern C — **Option C3 (same paths as real data)**

Because Concern A chose A1, the placeholders live at the same paths Renz's
real files will use:

    /data-pipeline/scripts/seed_beneficiaries.json
    /data-pipeline/scripts/seed_external_records.json

Renz replaces these files with his real data. No code or path changes.
The handoff doc clearly states these are currently placeholders.

### Recommendation for Concern D — **Option D2 (small placeholder; DoD pending)**

Generate ~50 placeholder records for immediate functional verification. Note
in the handoff doc that the "5,000 records in 15 seconds" DoD will be
verified once Renz delivers his real dataset.

Rationale:

- The tooling can be tested end-to-end with 50 records.
- The performance characteristic of `pymongo.insert_many()` on 5,000 records
  is well-known (typically <1 second against a local MongoDB).
- Committing 5,000-record JSON placeholders bloats the repo without adding
  value.

### Concern D Additional Note — Connection string

The Python script uses:

    mongodb://app_user:AppUserPassword2026!@db:27017/kilosunlad?replicaSet=rs0&authSource=kilosunlad

`?replicaSet=rs0` is **required** because MongoDB runs as a replica set per
DECISION-006. Omitting it causes `ServerSelectionTimeoutError`.

### Concern D Additional Note — Validation strategy

The script does **not** pre-validate records. MongoDB's `strict: true` schema
rejects malformed documents and reports them. This keeps the script simple and
lets the database remain the source of truth for shape enforcement.

Duplicate key errors are handled via `insert_many(ordered=False)` with
`BulkWriteError` reporting — inserted count and skipped count are printed.

---

## 4. Official PM / Tech Lead Resolution (Filled by Renz)

* [ ] **Concern A Decision:** [ACCEPTED / REJECTED / MODIFIED]
  - [ ] Confirm JSON path: same directory as script

* [ ] **Concern B Decision:** [ACCEPTED / REJECTED / MODIFIED]
  - [ ] Confirm Python runtime: dedicated `seed-ingest` service in `docker-compose.yml`

* [ ] **Concern C Decision:** [ACCEPTED / REJECTED / MODIFIED]
  - [ ] Confirm placeholder location: same paths as real data

* [ ] **Concern D Decision:** [ACCEPTED / REJECTED / MODIFIED]
  - [ ] Confirm ~50 placeholder records; DoD verification deferred to Renz's data
  - [ ] Confirm `?replicaSet=rs0` in connection URI
  - [ ] Confirm no pre-validation; MongoDB enforces

* [ ] **Action Items:**
  - [ ] Dustin: Write `/data-pipeline/scripts/seed_db.py`
  - [ ] Dustin: Generate placeholder `seed_beneficiaries.json` (~50 records)
  - [ ] Dustin: Generate placeholder `seed_external_records.json` (~50 records)
  - [ ] Dustin: Add `seed-ingest` service to `docker-compose.yml`
  - [ ] Dustin: Write `/data-pipeline/scripts/verify_compound_index.py` (Task 3.2)
  - [ ] Dustin: Write `/docs/handoffs/PHASE_3_DATABASE_HANDOFF.md`
  - [ ] Dustin: Run end-to-end verification
  - [ ] Renz: Replace placeholder JSON with real 5,000-record dataset
  - [ ] Renz: Verify 15-second DoD against real data

---

## 5. Impact Assessment

- **Files affected:**
  - New: `/data-pipeline/scripts/seed_db.py`
  - New: `/data-pipeline/scripts/verify_compound_index.py`
  - New: `/data-pipeline/scripts/seed_beneficiaries.json` (placeholder)
  - New: `/data-pipeline/scripts/seed_external_records.json` (placeholder)
  - Modified: `docker-compose.yml` (add `seed-ingest` service)
  - New: `/docs/handoffs/PHASE_3_DATABASE_HANDOFF.md`
- **Contracts affected:** None
- **Schemas affected:** None
- **Other services affected:** None — `seed-ingest` is a one-shot service, no dependencies touched
- **Risk:** Low — new tooling, no changes to existing services
- **Effort:** ~3 hours for script + placeholders + verification + handoff

---

## 6. References

- Engineering Task Roadmap (Database Architecture) — Phase 3, Tasks 3.1–3.2
- DECISION-006 — Transaction-Capable MongoDB Deployment
- DECISION-007 — Test Account Seeding (integration support precedent)
- Renz's directive (2026-10-02) — placeholder data acceptable; handoff `.md` required

---

**End of Document**