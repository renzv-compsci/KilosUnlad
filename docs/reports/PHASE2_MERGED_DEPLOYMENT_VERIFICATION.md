# Phase 2 merged deployment verification

**Author:** Mae Santos — Backend Engineering Lead

> Historical report: results and status refer to the dated baseline below.
> For current handoff and test status, use the [backend turnover](../handoffs/BACKEND_TURNOVER.md)
> and [latest verification](BACKEND_COMPOSE_ACCEPTANCE_2026-10-09.md).

**Date:** 2026-09-30

**Backend:** `1934549`; includes main `c030c77` via merge `4640351`.

## Result

The merged database configuration passed an isolated fresh-start and backend
dispatch smoke test. The previously reported listIndexes and PRIMARY-wait
blockers are resolved for this tested configuration.

| Check | Result |
| --- | --- |
| Fresh authenticated MongoDB startup with generated keyfile | Passed |
| Replica-set initializer completion | Exit 0; separate hello confirmed writable PRIMARY and rs0 |
| app_user inspection of unique audit sequence index | Passed |
| app_user audit update/delete | Both denied with MongoDB code 13 |
| Real director and worker login | Both HTTP 200 |
| Director dispatch to active in-scope worker | HTTP 201 |
| Persisted task and household status | Exactly one task; UNDER_INVESTIGATION |
| Audit receipt | Stored hash matches response and computeEntryHash recomputation |
| Assigned worker feed | HTTP 200 containing the dispatched task |
| Duplicate dispatch | HTTP 409; still one audit entry |

## Isolation and practical limits

Docker 29.8.0 ran MongoDB 6 using the merged db/replset-init service definitions
and checked-in initialization script. A separate Compose project
`mae-deploy-1934549` used unique volumes/network and a random localhost port;
fixed container names were removed. Only database services were started.

The backend ran under host Node 20 using its real Express app and restricted
app_user connection. Direct connection through the random localhost port was
used because the replica set advertises Docker hostname db. Model autoIndex was
disabled for this smoke test; indexes came from the checked-in initialization
script. Authentication used a temporary random JWT secret and mock mode false.
These are test-run settings, not proof that every default Compose server setting
is ready. No full server/client/gateway image rollout was tested here.

Synthetic director/worker and household records were created only in the isolated
database. Dustin's shared account seeder and privately supplied credentials were
not used. Test containers, network and disposable volumes were removed afterward.

## Remaining acceptance

- Verify the actual shared deployment and existing-volume migration; initialization
  script changes do not automatically migrate an existing application's roles.
- Run the complete Task 2.4 checklist against the agreed deployment, including
  concurrency and rollback. Earlier disposable workflow tests cover these behaviors,
  but this smoke run did not repeat them against the merged configuration.
- Coordinate frontend end-to-end checks with Markie and agreed in-scope seeded data.
- Retain Task 2.4 as pending full acceptance until remaining checklist items are
  resolved. This result confirms the two infrastructure fixes and the basic
  dispatch-to-feed path, not completion of all Phase 2 tasks.
