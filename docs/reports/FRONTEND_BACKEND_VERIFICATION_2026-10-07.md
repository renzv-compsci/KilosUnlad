# Frontend/backend verification - October 7, 2026

**Author:** Mae Santos - Backend Engineering Lead
**Frontend:** `b36361cfcfe54af7d63b863103a2e66ca3da1966`
**Backend:** `4dcba9a91b12d0bb6f27169394ecb28dd66fd0ff`
**Result:** Automated frontend checks and real login/read-feed adapter checks passed.
**Limit:** No interactive browser acceptance; no browser was connected to the UI tool.

## Isolation and commands

I extracted the frontend source with git archive into a temporary directory.
I did not modify Markie's branch or repository files. Official Node 20.20.0
was downloaded from nodejs.org after the old cached npm runtime proved incomplete.
Dependencies were installed from the frontend lockfile with npm ci --no-audit
--no-fund. This did not perform a dependency security audit. Installation warned
about deprecated glob 11.1.0.

Commands ran from the isolated client:

```text
node --test test/auth.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
```

| Check | Result |
| --- | --- |
| Frontend regression | 40 passed, 0 failed, 0 skipped |
| TypeScript | Passed, exit 0 |
| Vite production build | Passed, exit 0; 1,578 modules |
| Main bundle | 511.81 kB, gzip 146.32 kB; existing over-500-kB warning |
| Real API/adapter and component checks | 15 checks passed |

## Real integration checks

A new loopback-only MongoDB replica set on port 27020 used a separate temporary
data directory. The unchanged current synthetic seed was evaluated through a
temporary MongoDB-shell-compatible collection adapter and inserted into this
fresh database; no shared application records were used. Mongoose model indexes
were initialized. This harness does not verify Docker seed execution or the
restricted shared database role. The backend ran on port 5003 with mocks disabled,
a generated signing secret, and allowed origin http://127.0.0.1:3003.

A temporary esbuild harness bundled Markie's actual services/api.ts,
authSession.ts and task component. Session storage/window events were shimmed;
Axios used real HTTP against the backend, not fabricated responses. React static
rendering used actual API-returned tasks. This is component rendering in Node,
not observation of the screen in a browser.

The 15 checks comprise:

- Four successful logins with recognized real sessions, one per role.
- Three admin/director/auditor triage checks: two flagged records and valid mapping.
- Three denials of those roles on the worker assigned-task endpoint.
- Worker feed check: exactly TEST-TSK-0001 for TEST-4PS-0004; out-of-scope
  and submitted samples excluded.
- Worker task component rendered the returned task ID and Palingon address.
- Worker triage access rejected with 403.
- Invalid login rejected with 401 and the stored frontend session cleared.
- OPTIONS preflight allowed the configured frontend origin.

An initial component harness failed because the harness omitted the required
user prop. After correcting the temporary harness, all checks passed; no frontend
implementation change was needed.

## Acceptance limits and continuation

This independently verifies the latest frontend's tests/build and actual
login/read-feed adapter compatibility with the current backend. It supplements
Markie's earlier reported local browser acceptance; it does not replace current
browser checks of navigation, interaction, responsive layout or session lifecycle.
CORS preflight passed through HTTP; browser enforcement was not observed.

Dispatch UI remains a disabled preview, submission synchronization remains
disabled, and the audit screen still simulates verification. None was tested as
a live frontend workflow. Shared deployment/migration, restricted database
permissions, concurrency/rollback acceptance and model/appeal integration remain
separate. No phase/task checkbox was closed by this run.

Continue using the [compatibility review](../handoffs/FRONTEND_BACKEND_COMPATIBILITY.md)
and [dispatch acceptance checklist](../handoffs/BACKEND_DISPATCH_ACCEPTANCE.md).
