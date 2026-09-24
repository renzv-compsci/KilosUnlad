# Backend authentication handoff for Markie

Prepared 2026-09-24. This is a test plan, not a record of completed frontend tests.
Backend baseline: `backend-mae` at `5051624`. Authentication/RBAC also exists on
`main` through PR #3. Record the exact frontend/backend commits used when testing.

## Setup and ownership

- Follow [README.md](README.md) for Node 20, `npm ci`, MongoDB connection, a random
  JWT secret of at least 32 characters, and `npm start` from `server/`.
- Use `NODE_ENV=development` and `PHASE1_MOCK_MODE=false`. Disable frontend login
  fallback and mock role switching. Failed authentication must not open a mock session.
- Set frontend `VITE_API_URL=http://localhost:5000/api/v1`. The default CORS origins
  include `http://localhost:3000` and `http://localhost`; configure `CORS_ORIGIN`
  if the frontend uses another origin. Never put `JWT_SECRET` in frontend settings.
- Verify `GET http://localhost:5000/health` and `/api/v1` return 200. The backend
  must log a successful MongoDB connection before listening.
- Coordinate test-account/database setup with Dustin. Mae owns API behavior and
  integration checks; this handoff does not authorize shared database resets or
  schema changes. Dustin coordinates account provisioning; this handoff does not
  create accounts or modify database data.

## Account details to coordinate with Dustin

Request active synthetic accounts for all four roles below, with unique usernames,
emails, and bcrypt password hashes. Agree test credentials separately; do not put
passwords, tokens, or signing secrets in committed reports/screenshots.

For director and worker accounts, use complete jurisdiction information:
`region: "Region IV-A"`, `province: "Laguna"`, `municipality: "Calamba"`, and
`assigned_barangays` containing `"Palingon"`. Missing or empty scope is denied.

Use an agreed synthetic worker with pending/cached tasks assigned to its actual
MongoDB user ID. No hard-coded fixture identity is needed. Empty lists are valid.

| Role | GET `/beneficiaries/triage-queue` | GET `/tasks/assigned` |
| --- | --- | --- |
| SUPER_ADMIN | 200 | 403 FORBIDDEN |
| REGIONAL_DIRECTOR | 200, scoped | 403 FORBIDDEN |
| CASE_WORKER | 403 FORBIDDEN | 200, own scoped tasks |
| COA_AUDITOR | 200 | 403 FORBIDDEN |

Use these exact role strings. Frontend aliases such as `DSWD_DIRECTOR` and
`MUNICIPAL_LINK` must not accidentally route an unknown role to an admin screen.
The server's 403 response is authoritative even if the UI hides a link.

## Requests and expected results

All paths below are relative to `http://localhost:5000/api/v1`. Replace placeholders
using agreed test credentials. Examples can be entered in Postman or inspected in
browser Network tools; they are not real credentials.

```http
POST /api/v1/auth/login
Content-Type: application/json

{"username":"<test_username>","password":"<test_password>"}
```

Successful login: 200 with `access_token`, `token_type: "Bearer"`,
`expires_in_seconds: 900`, and safe `user` data matching
`docs/contracts/auth/auth-session.json`. No `password_hash` should be returned.
Use the returned token for protected calls:

```http
GET /api/v1/beneficiaries/triage-queue?municipality=Calamba
Authorization: Bearer <access_token>
```

```http
GET /api/v1/tasks/assigned
Authorization: Bearer <case_worker_access_token>
```

| Test | Expected backend result | Frontend check |
| --- | --- | --- |
| Correct credentials, each role | 200 with real JWT and correct role | Open only the appropriate role view |
| Wrong password or unknown username | 401 INVALID_CREDENTIALS | Show failure; no mock login |
| Missing credentials | 401 INVALID_CREDENTIALS | Remain unauthenticated |
| Inactive test account (coordinate with Dustin) | 403 ACCOUNT_DEACTIVATED | Show denial |
| Protected GET without Authorization | 401 UNAUTHORIZED | Require login |
| Protected GET with a corrupted token | 401 UNAUTHORIZED | Do not display mock success |
| Protected GET with an expired valid token | 401 TOKEN_EXPIRED | Prompt login; no silent fallback |
| Cross-role access | Follow permission matrix above | Handle 403, not a success screen |
| Director triage with `?municipality=OutsideTestScope` | 403 OUT_OF_JURISDICTION | Show scope denial |
| Worker assigned GET with `?barangay=OutsideTestScope` | 403 OUT_OF_JURISDICTION | Show scope denial |
| Director triage with no geography query | 200 filtered to current stored jurisdiction | No out-of-scope records/counts |
| Assigned GET with `?worker_id=<another_id>` | Still current worker's data, never another worker's | Do not infer selection from that query |

For expiry, retain a real token, wait beyond its 900-second expiry, then send it
again. Do not edit its payload: that tests a forged signature, not token expiry.
Do not change the system clock or share the signing secret to accelerate this test.
If a test account is unavailable, record the case as blocked rather than passed.

## What passing means

Login and the two GET feeds now read MongoDB in normal mode, including production.
No X-KilosUnlad-Mock header is expected. Empty authorized lists are valid. Confirm
seeded row values and scope, with frontend fallback disabled. Query worker_id
overrides are rejected. This auth/feed plan does not verify appeal submission,
refresh/logout or offline sync. A health response alone is not an auth test.
See README for pagination, summary and missing-value behavior.

## Result template

Backend commit: ___; frontend commit: ___; date: ___; test database label: ___

Frontend fallback disabled: ___; backend PHASE1_MOCK_MODE=false: ___

| Case / account role | Expected | Actual status and error code | UI behavior | PASS / FAIL / BLOCKED |
| --- | --- | --- | --- | --- |
| | | | | |

Attach redacted Network response evidence and relevant console errors. Include
failed and blocked cases; do not mark the whole integration passed from 200s alone.
