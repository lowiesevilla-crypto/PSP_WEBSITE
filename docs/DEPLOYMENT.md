# Hostinger Production Deployment Runbook

## Production Target

- Application: Psi Sigma Phi Philippines Inc. Digital Membership Platform
- Repository: `lowiesevilla-crypto/PSP_WEBSITE`
- Hosting: Hostinger Node.js Web App
- Canonical URL: `https://psp.hoahub.tech`
- Production branch: `main`
- Runtime: Node.js 22+
- Database: dedicated PSP MySQL database, separate from HOAHub

## Current Deployment Status — 2026-09-04

- `psp.hoahub.tech` is correctly mapped to the PSP Website application — product-owner confirmed.
- Production bootstrap restart behavior is safe/idempotent through PR #5.
- Production admin-login/bootstrap code hardening is complete through PR #7.
- PR #8 reconciled post-PR7 status documentation.
- PR #9 added secret-free GitHub production smoke.
- First PR #9 production smoke proved DNS/HTTPS, `/api/health`, PSP public pages/PWA assets, and security headers.
- The same live smoke showed canonical-origin invalid login returning a controlled server error before credential validation, which points to production datastore/runtime readiness rather than the earlier origin bug.
- The Hostinger environment screenshot confirms the core canonical URL, bootstrap administrator metadata, auth secret, application mode, database URL, storage root, membership prefix, certificate policy, SMTP host/port/user-style values, and PayMongo-related variables are present. Secret values are intentionally not copied into this repository.
- Several secrets were visibly exposed in the troubleshooting screenshot. Treat them as compromised and rotate them before final production signoff.
- Live PayMongo credentials being present does not authorize live processing. Live checkout/webhook processing remains fail-closed until `PAYMONGO_LIVE_ENABLED=true` is explicitly approved after test-mode E2E signoff.

## Release Preconditions

Do not declare the production release complete until:

- exact release commit CI is green;
- Hostinger serves the expected release marker from `/api/health`;
- `/api/health/ready` is green for database, auth schema, baseline, and auth configuration;
- Prisma schema validates and applies against CI MySQL;
- baseline seed and System Admin bootstrap pass;
- strict TypeScript and production build pass;
- runtime/security smoke and cross-chapter isolation tests pass;
- runtime dependency audit passes;
- no real secrets exist in GitHub;
- exposed production secrets have been rotated;
- production database/backup/rollback evidence exists;
- a production System Admin successfully authenticates and reaches `/admin`;
- production SMTP, PWA, certificate, and health smoke checks pass;
- PayMongo test-mode E2E passes before live processing is enabled.

## Hostinger Application Setup

The PSP application must be a separate Node.js Web App, not a route inside HOAHub.

Required deployment configuration:

```text
Repository: lowiesevilla-crypto/PSP_WEBSITE
Branch: main
Node.js: 22 or later compatible LTS
Build command: npm run build
Start command: npm run start
Canonical URL: https://psp.hoahub.tech
```

`npm run start` intentionally runs `scripts/production-init.mjs` before `next start`. If Hostinger bypasses this command, bootstrap synchronization and baseline initialization will not run.

## Production Environment Variables

### Core application/runtime

```text
NODE_ENV=production
APP_ENV=production
NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech
DATABASE_URL=mysql://<user>:<password>@<host>:3306/<psp_database>
AUTH_SECRET=<strong-random-secret-at-least-32-characters>
MEMBERSHIP_NUMBER_PREFIX=PSP
CERTIFICATE_REQUIRE_CURRENT_DUES=false
STORAGE_ROOT=<persistent-private-storage-path>
MAX_IMAGE_UPLOAD_BYTES=5242880
```

`DATABASE_URL` must point to a dedicated PSP MySQL database/user. Never reuse the HOAHub database.

`STORAGE_ROOT` must be a persistent private path. Do not rely on an ephemeral deployment directory for member/community uploads.

### Production email

Canonical names:

```text
SMTP_HOST=<smtp-host>
SMTP_PORT=<provider-port>
SMTP_USER=<psp-mailbox>
SMTP_PASSWORD=<mailbox-password-or-app-password>
SMTP_FROM=<approved-from-address>
```

Hostinger aliases accepted by the application:

```text
SMTP_USERNAME=<alias for SMTP_USER>
MAIL_FROM_ADDRESS=<alias for SMTP_FROM>
MAIL_FROM_NAME=<optional display name>
MAIL_REPLY_TO=<optional reply-to>
SMTP_ENCRYPTION=ssl   # optional; port 465 also enables implicit TLS automatically
```

`SMTP_PASSWORD` remains required. Do not send or store it in chat, screenshots, GitHub, or documentation.

### PayMongo — test mode first

Canonical names:

```text
PAYMONGO_SECRET_KEY=<test-secret-key>
PAYMONGO_WEBHOOK_SECRET=<matching-test-endpoint-signing-secret>
PAYMONGO_PAYMENT_METHODS=qrph
PAYMONGO_LIVE_ENABLED=false
```

The application also accepts `PAYMONGO_CHECKOUT_METHODS` as an alias for `PAYMONGO_PAYMENT_METHODS`.

Webhook endpoint:

```text
https://psp.hoahub.tech/api/webhooks/paymongo
```

Controls:

- Test mode E2E is mandatory before live activation.
- A configured `sk_live_*` secret is rejected for checkout while `PAYMONGO_LIVE_ENABLED` is absent/false.
- Live webhook signature processing is also rejected while live mode is not explicitly enabled.
- Set `PAYMONGO_LIVE_ENABLED=true` only after test-mode checkout, signed webhook, idempotency, ledger posting, receipt generation, reconciliation, and explicit live activation approval all pass.

## Overall System Administrator Bootstrap

Temporary bootstrap values are server-side runtime variables only:

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

- `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are required together when synchronization is intended.
- `BOOTSTRAP_ADMIN_MEMBER_NO` and `BOOTSTRAP_ADMIN_CHAPTER_CODE` are optional and must be supplied together when the System Administrator should also have a PSP Member identity.
- First/last-name values are optional overrides; otherwise bootstrap derives them from the configured display name when possible.
- National `SYSTEM_ADMIN` remains unscoped (`chapterId = null`).
- Optional member identity receives chapter-scoped MEMBER assignment and MembershipHistory without removing national admin access.
- Membership-number collisions with another user are rejected.
- Never commit bootstrap credentials or production secrets.

### Credential-removal gate

Keep required `BOOTSTRAP_ADMIN_*` values configured while troubleshooting, redeploying, and testing. **Remove them only after a real production login successfully reaches `/admin`.** Startup logs alone are insufficient evidence.

After successful `/admin` verification:

1. rotate any temporary/bootstrap password that was exposed during troubleshooting;
2. remove all `BOOTSTRAP_ADMIN_*` variables from Hostinger;
3. restart/redeploy once more;
4. reconfirm normal administrator login still works.

## Production Readiness Endpoints

### Liveness

```text
GET https://psp.hoahub.tech/api/health
```

Returns service identity, release marker, and timestamp. This proves the HTTP process is alive but does **not** prove MySQL/auth readiness.

### Datastore/auth readiness

```text
GET https://psp.hoahub.tech/api/health/ready
```

Returns only safe aggregate checks:

- database connectivity;
- required auth tables/schema access;
- SYSTEM_ADMIN baseline presence;
- canonical app URL + AUTH_SECRET readiness;
- current release marker.

HTTP 200 means ready. HTTP 503 means degraded. No secret values or database details are returned.

Production smoke must wait for the expected release marker before evaluating readiness so an old Hostinger deployment cannot accidentally satisfy the gate.

## Production Database

Initial greenfield production flow:

1. Set the dedicated PSP `DATABASE_URL`.
2. Back up any existing PSP production data before schema-changing work.
3. Apply the approved Prisma schema.
4. Run approved baseline initialization.
5. Keep bootstrap values configured for System Admin synchronization.
6. Redeploy using `npm run start`.
7. Verify logs show `Synchronizing configured PSP System Administrator` and `System Administrator is ready`.
8. Verify `/api/health/ready` returns 200.
9. Verify the administrator actually reaches `/admin`.
10. Remove bootstrap values only after that verified login.

`prisma db push` is acceptable only for initial greenfield creation before production member/financial records exist. Once production data exists, schema changes require reviewed migrations plus backup/recovery planning.

Production restarts must not overwrite customized permissions or operational data. The national organization and Rho Alpha De Las Piñas baseline are created only when absent; full seed runs only when the required baseline is missing.

## Origin / Request Security

Canonical approved production origin:

```text
https://psp.hoahub.tech
```

The API proxy and login route recognize this canonical origin while explicit malicious `Sec-Fetch-Site: cross-site` requests remain rejected. Do not add wildcard origins or disable origin checks to work around hosting configuration.

## Admin Login Recovery

If production login fails:

1. use exactly `https://psp.hoahub.tech/login`;
2. verify `/api/health` shows the expected release marker;
3. verify `/api/health/ready` and identify which aggregate check is degraded;
4. verify `NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech`;
5. verify `AUTH_SECRET` exists and is at least 32 characters;
6. verify the dedicated PSP `DATABASE_URL` is present/reachable and the auth schema exists;
7. keep bootstrap email/password/name configured;
8. configure optional member/chapter bootstrap values if member linkage is required;
9. redeploy/restart using `npm run start`;
10. inspect startup logs for bootstrap synchronization success;
11. test login and verify `/admin` access;
12. only then remove bootstrap variables.

The login API returns controlled JSON failures. Datastore/Prisma failures use a sanitized service-unavailable response rather than exposing database details.

## Secret Exposure / Rotation

Any password, connection URL containing credentials, API secret, webhook secret, session secret, cron secret, or similar value visible in chat/screenshots/logs must be treated as exposed.

Before final production signoff, rotate all affected values in their authoritative systems, including as applicable:

- bootstrap/admin password;
- `AUTH_SECRET`;
- production database user password and resulting `DATABASE_URL`;
- PayMongo secret/webhook credentials;
- cron/internal shared secrets;
- SMTP password if it was ever exposed.

After rotation, restart/redeploy and rerun readiness + production smoke. Do not record replacement values in documentation.

## PWA Production Checks

- manifest loads over HTTPS;
- service worker scope is correct;
- branded icon loads;
- Android installation works where supported;
- iOS Add to Home Screen guidance works;
- start URL remains under `psp.hoahub.tech`;
- sensitive auth/payment API responses are not cached;
- representative mobile layouts have no uncontrolled horizontal overflow.

## Post-Deployment Smoke Tests

1. `/api/health` returns correct service and expected release marker.
2. `/api/health/ready` returns HTTP 200 and all core readiness checks `ok`.
3. Landing page is PSP-branded with no HOAHub redirect.
4. Registration loads active chapters and enforces both acknowledgements.
5. Canonical invalid-login returns controlled 401; malicious cross-site request returns 403.
6. System Admin login succeeds and reaches `/admin`.
7. Chapter creation/Chapter Admin assignment succeeds.
8. Applicant approval creates Member and sends activation email.
9. Activated member sees only authorized chapter data.
10. Cross-chapter negative authorization behavior is verified.
11. PWA manifest/service worker and representative Android/iOS install/layout checks pass.
12. SMTP activation/recovery delivery succeeds.
13. PayMongo test checkout + signed webhook + ledger + receipt succeeds.
14. Certificate QR verification resolves under `psp.hoahub.tech`.
15. Rotated secrets are deployed and readiness/smoke remain green.

Do not infer live results from source code or local CI. Record evidence in `STATUS.md`.

## Rollback / Recovery

- Keep the last known-good Git release SHA.
- Back up the production database before schema-changing releases.
- Document how to restore/verify the backup before production is considered fully released.
- If application deployment fails, redeploy the last known-good commit.
- Do not perform destructive schema rollback after member/financial data exists without a reviewed recovery plan.

## Monitoring

Investigate and record:

- repeated 5xx/503 responses;
- readiness degradation;
- authentication failures/lockouts;
- webhook signature failures;
- payment reconciliation mismatches;
- email delivery failures;
- storage exhaustion;
- dependency vulnerability alerts.

A release is not complete until post-deployment smoke checks pass and the knowledge base is reconciled.
