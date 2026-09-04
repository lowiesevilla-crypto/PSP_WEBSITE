# Hostinger Production Deployment Runbook

## Production Target

- Application: Psi Sigma Phi Philippines Inc. Digital Membership Platform
- Repository: `lowiesevilla-crypto/PSP_WEBSITE`
- Hosting: Hostinger managed Next.js / Node.js web application
- Canonical URL: `https://psp.hoahub.tech`
- Production branch: `main`
- Runtime: Node.js 22+
- Database: dedicated PSP MySQL database, completely separate from HOAHub

## Current Deployment Status — 2026-09-04

Production automated readiness is **GREEN** through PR #11.

Current production main commit:

```text
1ab1d49512eadab99fe78fc378b7b8f3ea4b1647
```

Evidence:

- PR #11 exact head `bd5f7dc3fd013867964d024251632de12ea00a87` passed PSP CI #317.
- PR #11 merged to `main` at `1ab1d49512eadab99fe78fc378b7b8f3ea4b1647`.
- PSP Production Smoke #3 (run `33824762794`) passed against the real Hostinger site.
- `/api/health` served deployment generation `2026-09-04-schema-bootstrap-v1`.
- `/api/health/ready` returned HTTP 200 with `database=ok`, `authSchema=ok`, `baseline=ok`, and `authConfig=ok`.
- PSP home, privacy, registration, PWA manifest, security headers, canonical-origin invalid-login behavior, and malicious cross-site rejection passed.

The remaining P0 is manual verification that the intended real System Administrator successfully reaches `/admin`.

## Hostinger Application Setup

Required production configuration:

```text
Repository: lowiesevilla-crypto/PSP_WEBSITE
Branch: main
Node.js: 22 or later compatible LTS
Build command: npm run build
Canonical URL: https://psp.hoahub.tech
```

The repository still provides:

```text
Start command: npm run start
```

but Hostinger's managed Next.js deployment may control the runtime start process itself. For this reason, PSP no longer depends exclusively on the custom start hook for first-time production initialization.

## Greenfield Production Schema Initialization

PR #11 added `scripts/production-build-init.mjs`, invoked by `npm run build` before `next build`.

The initializer runs only when:

```text
APP_ENV=production
```

### Safety rules

1. It requires `DATABASE_URL`.
2. It queries only `information_schema` to inspect the connected database.
3. If the database has **zero tables**, it is treated as a new dedicated PSP greenfield database and the approved Prisma schema is applied with `prisma db push --skip-generate`.
4. If the database is non-empty but does not contain the complete required PSP baseline table set, the build **fails closed** and refuses automatic schema push.
5. If the PSP schema already exists, automatic greenfield schema push is skipped.
6. After schema readiness, the existing idempotent `scripts/production-init.mjs` runs.
7. If baseline or configured System Admin/member synchronization fails, the build fails and Hostinger must not publish that deployment.

This is a **greenfield-only bootstrap mechanism**, not the migration strategy for a populated production system.

Once real member/financial data exists:

- do not rely on automatic `prisma db push` for schema evolution;
- use reviewed Prisma migrations/change plans;
- take a verified backup first;
- document rollback/recovery before applying schema-changing releases.

## Production Environment Variables

### Core runtime

```text
NODE_ENV=production
APP_ENV=production
NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech
DATABASE_URL=mysql://<user>:<password>@<host>:3306/<dedicated_psp_database>
AUTH_SECRET=<strong-random-secret-at-least-32-characters>
MEMBERSHIP_NUMBER_PREFIX=PSP
CERTIFICATE_REQUIRE_CURRENT_DUES=false
STORAGE_ROOT=<persistent-private-storage-path>
MAX_IMAGE_UPLOAD_BYTES=5242880
```

Requirements:

- `DATABASE_URL` must point to the dedicated PSP database, never HOAHub.
- credentials/special characters must be URL-safe/encoded as required by the connection string.
- `STORAGE_ROOT` must be persistent and private.
- no production secret belongs in GitHub or documentation.

### Overall System Admin bootstrap

Temporary runtime variables:

```text
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
BOOTSTRAP_ADMIN_NAME=
BOOTSTRAP_ADMIN_MEMBER_NO=
BOOTSTRAP_ADMIN_CHAPTER_CODE=
BOOTSTRAP_ADMIN_FIRST_NAME=
BOOTSTRAP_ADMIN_LAST_NAME=
```

Rules:

- email/password must be configured together;
- member number/chapter code must be configured together when member linkage is required;
- national `SYSTEM_ADMIN` remains unscoped (`chapterId=null`);
- optional chapter member identity also receives the chapter MEMBER role/history;
- membership-number collision causes bootstrap failure;
- bootstrap sets the user ACTIVE and email-verified and synchronizes the configured password hash.

### Bootstrap removal gate

**Do not remove any required `BOOTSTRAP_ADMIN_*` variables until the intended real administrator successfully logs in and reaches `/admin`.**

After successful `/admin` verification:

1. rotate/change the temporary password;
2. remove all `BOOTSTRAP_ADMIN_*` variables;
3. restart/redeploy;
4. verify `/api/health/ready` remains green;
5. reconfirm normal admin login without bootstrap variables.

## Email / SMTP

Canonical variables:

```text
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

Hostinger-compatible aliases accepted by the application:

```text
SMTP_USERNAME=<alias for SMTP_USER>
MAIL_FROM_ADDRESS=<alias for SMTP_FROM>
MAIL_FROM_NAME=<optional>
MAIL_REPLY_TO=<optional>
SMTP_ENCRYPTION=ssl   # optional; port 465 also enables implicit TLS
```

`SMTP_PASSWORD` is mandatory for authenticated SMTP. It was not visibly confirmed in the latest configuration evidence and email delivery remains an open production gate until a real activation/recovery message is successfully delivered.

## PayMongo

Canonical configuration:

```text
PAYMONGO_SECRET_KEY=<test key first>
PAYMONGO_WEBHOOK_SECRET=<matching endpoint signing secret>
PAYMONGO_PAYMENT_METHODS=qrph
PAYMONGO_LIVE_ENABLED=false
```

Accepted alias:

```text
PAYMONGO_CHECKOUT_METHODS=<alias for PAYMONGO_PAYMENT_METHODS>
```

Production webhook URL:

```text
https://psp.hoahub.tech/api/webhooks/paymongo
```

### Live-payment gate

A live key being present is not authorization to process live payments.

The application rejects live checkout and live webhook acceptance while `PAYMONGO_LIVE_ENABLED` is absent or false.

Set `PAYMONGO_LIVE_ENABLED=true` only after all test-mode checks pass:

1. checkout session creation;
2. success/cancel flow;
3. correct webhook signing secret;
4. raw-body `Paymongo-Signature` validation;
5. authoritative `checkout_session.payment.paid` handling;
6. duplicate webhook/idempotency verification;
7. ledger posting;
8. receipt generation;
9. reconciliation;
10. explicit approval for live activation.

Then run only one controlled low-value live validation first.

## Production Health / Readiness

### Liveness

```text
GET https://psp.hoahub.tech/api/health
```

Current production evidence includes:

```text
status=ok
service=psi-sigma-phi-digital-platform
release=2026-09-04-r2
deploymentGeneration=2026-09-04-schema-bootstrap-v1
```

### Datastore/auth readiness

```text
GET https://psp.hoahub.tech/api/health/ready
```

HTTP 200 is required with:

```text
status=ready
database=ok
authSchema=ok
baseline=ok
authConfig=ok
```

No database URL, password, secret, or internal schema detail is returned by the endpoint.

## Production Smoke Automation

`.github/workflows/production-smoke.yml` runs after `main` pushes.

It verifies:

1. exact deployment generation is live;
2. datastore/auth readiness is green;
3. PSP public pages and PWA manifest load;
4. production security headers are present;
5. canonical-origin invalid credentials produce controlled HTTP 401 JSON;
6. malicious cross-site login is rejected with HTTP 403.

Production Smoke #3 passed all of these against PR #11 production deployment.

The workflow deliberately does **not** contain production admin credentials or PayMongo secrets.

## Admin Login Closure

Automated readiness being green does not close the real-admin incident.

Required manual evidence:

1. intended administrator opens `https://psp.hoahub.tech/login`;
2. login succeeds with the currently configured temporary credential;
3. browser reaches `/admin`;
4. administrator has national/System Admin capability;
5. linked Rho Alpha member identity is correct;
6. temporary password is changed;
7. bootstrap variables are removed;
8. app is restarted and admin login is repeated successfully.

## Secret Exposure / Rotation

Any secret visible in a screenshot/chat/log must be treated as compromised even if the screenshot was shared only for troubleshooting.

Rotate affected values before final production signoff, including as applicable:

- temporary admin/bootstrap password;
- `AUTH_SECRET`;
- production DB user password and resulting `DATABASE_URL`;
- PayMongo API/webhook secrets;
- internal cron/shared secrets;
- SMTP password if exposed.

After rotations:

- redeploy/restart;
- confirm `/api/health/ready` remains green;
- repeat real administrator login;
- repeat applicable payment/email tests.

Never record replacement values in GitHub docs.

## PWA Production Checks

Automated public PWA manifest checks have passed. Physical-device validation remains required:

- Android install/standalone launch;
- iOS Add to Home Screen behavior;
- mobile/tablet responsive layouts;
- portrait/landscape;
- safe-area handling;
- no uncontrolled horizontal overflow;
- auth/payment API responses not cached as false offline state.

## Certificate QR Gate

Production certificate validation remains open until a real generated certificate QR is scanned and resolves under:

```text
https://psp.hoahub.tech
```

Public verification must expose only appropriate minimal data.

## Backup / Recovery Gate

Before final operational release:

1. create/confirm a current production MySQL backup;
2. document the restore procedure;
3. verify a recovery/restore method is actually available;
4. retain last known-good Git release SHA;
5. do not perform destructive schema rollback after member/financial records exist without a reviewed recovery plan.

## Current Post-Deployment Checklist

- [x] canonical domain / HTTPS
- [x] exact Hostinger deployment generation
- [x] production database connectivity
- [x] PSP auth schema present
- [x] PSP baseline present
- [x] auth runtime configuration ready
- [x] public PSP pages
- [x] PWA manifest public smoke
- [x] security headers
- [x] canonical invalid-login behavior
- [x] cross-site login rejection
- [ ] real System Admin reaches `/admin`
- [ ] verify linked Rho Alpha member identity in real session
- [ ] rotate temporary/exposed credentials and remove bootstrap variables
- [ ] reconfirm admin login after bootstrap removal
- [ ] SMTP activation/recovery delivery
- [ ] MySQL backup/restore evidence
- [ ] Android/iOS PWA physical-device checks
- [ ] PayMongo test-mode E2E
- [ ] live certificate QR verification
- [ ] controlled PayMongo live validation after explicit approval

See `STATUS.md` for authoritative operational state.
