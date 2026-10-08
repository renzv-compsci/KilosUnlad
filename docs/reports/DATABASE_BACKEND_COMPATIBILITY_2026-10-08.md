# Database/backend compatibility verification - October 8, 2026

## Docker follow-up - October 8

After Docker became available, its server reported version 29.8.0. Dustin's
Compose database/initializer ran in project mae-dustin-reset-20261008 with unique
container names, separate volumes and loopback port 27022. Existing kilosunlad-db
was preserved. Only the temporary reset copy's DB_CONTAINER value was retargeted
to mae-dustin-reset-db; no committed owner source changed.

Authenticated startup and PRIMARY election passed. The actual reset-demo service
completed successfully in 4 seconds as measured by the script, within its
10-second target. Full Compose invocation including service setup took about
5.15 seconds. Official mongo:6.0 and docker:cli images were used.

Reset produced four users, five beneficiaries, one external record, two tasks,
zero audit logs and zero configs. The restricted app account could read those
counts and inspect the unique audit sequence index, while update/delete attempts
on audit_logs were denied with MongoDB code 13. The reset leaves no audit range;
seed audit entries separately in an approved demo/test environment before
verification. It does not establish live model/graduation acceptance.

The first container invocation failed due to CRLF line endings introduced by
this review's Windows temporary-file retargeting. The harness restored LF endings
and the rerun passed. This was a harness issue, not a finding against the committed
reset script. An obsolete Compose version warning was non-fatal.

The disposable Compose containers, network and volumes were removed afterward;
existing kilosunlad-db remained running. These results establish isolated
authenticated startup, reset execution and the tested audit permissions only.
Shared deployment and the 5,000-record benchmark remain unverified. The ingestion
schema-enforcement gap remains open.


**Author:** Mae Santos - Backend Engineering Lead
**Database source:** origin/database-phase5 at `67449a2` (includes Phase 3/4)
**Backend source:** backend-mae at `86f7977`
**Scope:** Independent isolated compatibility tests, not database-owner task signoff.

## Environment and isolation

Dustin's source was extracted with git archive into a temporary directory without
switching or modifying branches. Python 3.13 with PyMongo 4.18.2 ran in a temporary
virtual environment; Node 20.20.0 and MongoDB 8.3 were used locally. A fresh
loopback-only replica set on port 27021 had its own temporary data directory.

The unchanged seed_test_data.js was evaluated through a temporary collection
adapter to load the four synthetic users, four households and two tasks; current
Mongoose indexes plus the checked-in compound index were initialized. Dustin's
Python modules were imported unchanged, with MONGO_URI overridden in memory to
the disposable database. No shared database, credentials, roles or Docker volumes
were modified. These native Python/backend tests used an unrestricted local
test DB. The separate Docker follow-up above verified authenticated Compose
startup, reset execution and restricted app_user audit permissions.

## Reproduced results

| Check | Result |
| --- | --- |
| Seed ingestion | 50 beneficiaries and 50 external records inserted, 0 skipped; 0.07 s |
| Repeat ingestion | 0 inserted, 50 duplicates skipped per collection; counts unchanged; 0.12 s |
| Compound index script | IXSCAN, no COLLSCAN; 18 keys/documents examined, 18 returned |
| Python audit chain seeder | Five entries, sequences 1 through 5 |
| Backend authenticated verifier | Admin and auditor: HTTP 200, intact five-block chain |
| Denied roles | Director and case worker: HTTP 403 |
| Tamper probe | Altered sequence 3 detected exactly; original document restored |
| Reseed protection | Seeder exits 1 on nonempty ledger; five existing entries preserved |
| Integrity audit | All six collection checks pass; 115 total documents, zero issues |
| Integrity negative case | Injected orphan task produces nonzero exit; probe removed |
| Demo Case A documents | Both JSON documents pass current Mongoose validation |
| reset_demo.sh syntax | bash -n passes, exit 0 |
| Isolated authenticated Docker startup | Replica-set initializer exits 0; writable PRIMARY confirmed |
| reset-demo service | Passed; script timing 4 s, full invocation about 5.15 s |
| Restricted Docker app account | Reads expected counts and audit index; audit update/delete denied |

After negative tests, the integrity audit passed again with four users, 54
beneficiaries, 50 external records, two tasks, five audit logs and zero system
configs. Temporary HTTP listeners were closed. The disposable MongoDB was stopped.

## Confirmed schema-enforcement gap

Direct PyMongo ingestion accepted a probe beneficiary containing only a household
ID and head-of-household national ID, despite other required Mongoose fields
being absent. The test collection has no MongoDB validator, matching the current
initialization script, which creates collections without validators. The probe
was removed immediately after the check.

Mongoose strict/required rules do not enforce shape on direct Python writes.
Decision 008's database-enforces-schema assumption needs correction by its owners.
Before using untrusted/real ingestion data, Dustin/Renz should select explicit
Python validation or approved MongoDB collection validators and test rejection.
The integrity script checks selected keys/references; it is not complete schema
validation. Passing it does not close this gap.

The ingestion script groups duplicate and validation write errors as skipped and
returns success; its under-15-second output for 50 records is not proof of the
5,000-record performance DoD. That benchmark remains unverified here.

## Unverified work and operational limits

Docker startup, reset execution and the tested restricted audit permissions
passed in a separate disposable Compose project. The measured reset was 4 seconds;
Dustin's earlier seven-second result describes his own run. These checks do not
certify the shared deployment, every database permission, or the complete system.

The 5,000-record ingestion benchmark remains unverified; only 50 placeholder
beneficiaries and 50 external records were ingested. The confirmed ingestion
schema-enforcement gap above remains unresolved.

reset_demo.sh targets the fixed kilosunlad-db container and drops collections.
Our temporary copy was retargeted to the isolated test container. Do not run the
original script against existing application data to repair Markie's verifier
404 or discover an audit range. Reset leaves the ledger empty; seed a valid chain
separately only in an approved test/demo environment.

Case A validation does not prove a live graduation/model workflow. Case B payload
execution against Charles's service remains untested. The compound-index result
applies to Dustin's tested is_flagged/municipality query, not every backend triage
query or the full filtered/sorted workload.

Sequences 1 through 5 were valid in this disposable test database only. They are
not evidence of the range present in Markie's existing database. The successful
Python-seed verification confirms hash-format compatibility; it does not diagnose
his running process's 404.

No owner files or task checkboxes were changed. Follow-up requirements are to
resolve ingestion validation, run the real dataset benchmark, and record
shared/frontend acceptance separately. Isolated Docker reset verification is done.
