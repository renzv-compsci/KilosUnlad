# Audit endpoint diagnosis - October 8, 2026

**Author:** Mae Santos - Backend Engineering Lead
**Backend tested:** `86f7977` on backend-mae
**Scope:** Targeted audit/workflow regression and isolated mode/CORS reproduction.
I could not inspect Markie's running backend, container or browser.

## Results

With Node 20.20.0 and MongoDB 8.3, the following command ran with
RUN_WORKFLOW_MONGO_TESTS=1 and MONGOD_PATH pointing to the local executable:

```text
node --test test/hashChain.test.js test/app.test.js test/workflowPersistence.test.js
```

**26 passed, 0 failed, 0 skipped.** Coverage includes audit route authorization,
query errors, missing ranges and storage failures; real auditor login and persisted
dispatch-ledger verification; concurrency/rollback; and 1,000 stored blocks with
exact tamper detection at sequence 451. The real database suite uses and cleans
up a disposable replica set. This is not a full-system or current frontend test.

Temporary HTTP listeners reproduced these cases:

| Configuration | Result |
| --- | --- |
| Real mode, valid signing-secret configuration, no Bearer token | 401; route exists |
| Mock mode, same route/query | 404; route is not registered |
| Configured origin http://127.0.0.1:3003 | Preflight allows that origin |
| Origin http://localhost:3003 with only 127.0.0.1 allowed | No allow-origin header; browser would block access |

The first standalone mode probe omitted a valid secret and returned 503, as the
authentication middleware fails closed on invalid configuration. The probe was
corrected to supply an explicit test secret and rerun successfully. No backend
implementation change was needed. Temporary listeners were closed.

## Interpretation for Markie's 404

The earlier backend `1b185d9` has no `/audit/verify-chain` route. Current main
`dc55600` includes the verifier introduced at `4d0f5bc`. Updating source without
restarting the host process or rebuilding/recreating the backend container can
leave the old router running. Mock mode also reproduces the exact 404.

An empty/missing audit range returns 409 for an authorized request, not 404.
An invalid query returns 400; valid but denied roles return 403; missing/invalid
tokens return 401 when signing-secret configuration is valid. Thus audit data
must not be reset to fix a route-level 404. CORS mismatch is a separate failure
and does not explain absence of the backend route.

The exact cause on Markie's machine remains unconfirmed. Obtain the running
backend commit, startup method, mock-mode value and actual request URL, without
secrets. For Docker, also verify the image/container was refreshed after source
update. Preserve the existing database and volumes.

Quick route-presence probe against the actual API host, with no token:

```text
GET /api/v1/audit/verify-chain?start_sequence=1&end_sequence=1
```

401 means the current protected route is present; 404 suggests old/mock routing,
wrong API host/path, or proxy/container mismatch. 503 requires configuration/service
diagnosis. For authenticated testing, use an existing contiguous sequence range
from that database, with the predecessor present when start_sequence is above 1.
No range from the disposable tests is valid evidence for Markie's database.

No shared database, frontend files, runtime implementation or other branch was
changed. This report records the isolated diagnosis for backend handover.
