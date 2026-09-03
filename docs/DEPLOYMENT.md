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
- Production admin-login/bootstrap hardening is **CODE COMPLETE** through PR #7.
- PR #7 final passing head: `b4866840890dabe3d75a6f4ccb6a497d253f0ac0`.
- PSP CI #276: **PASSED all required gates**.
- PR #7 merge commit on `main`: `1e97e288bb7c8c852a6b9635f6268760f0621faf`.
- Live production admin login remains **IN PROGRESS / NOT COMPLETE** until the deployed release is verified to reach `/admin`.
- Remaining deployment work is production runtime/integration validation: deploy verification, MySQL/backup evidence, environment audit, SMTP delivery, PWA/device smoke, PayMongo test-mode E2E, certificate QR verification, and final production signoff. See `STATUS.md`.

## Release Preconditions

Do not declare the production release complete until:

- release commit CI is green;
- Prisma schema validates and applies against CI MySQL;
- baseline seed and System Admin bootstrap pass;
- strict TypeScript and production build pass;
- runtime/security smoke and cross-chapter isolation tests pass;
- runtime dependency audit gate passes;
- no real secrets exist in GitHub;
- production database/backup/rollback evidence exists;
- a production System Admin successfully authenticates and reaches `/admin`;
- production SMTP, PWA, certificate, and health smoke checks pass;
- PayMongo test-mode E2E passes before live credentials are enabled.

## Hostinger Application Setup

In hPanel the PSP application must be a separate Node.js Web App, not a route inside HOAHub.

Required deployment configuration:

```text
Repository: lowiesevilla-crypto/PSP_WEBSITE
Branch: main
Node.js: 22 or later compatible LTS
Build command: npm run build
Start command: npm run start
Canonical URL: https://psp.hoahub.tech
```

The `npm run start` command intentionally runs `scripts/production-init.mjs` before `next start`, so baseline and configured bootstrap synchronization occur on restart without unconditional destructive reseeding.

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

```text
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<psp-mailbox>
SMTP_PASSWORD=<secret>
SMTP_FROM=<approved-from-address>
```

Port 465 may be used where the SMTP provider requires implicit TLS; the application enables secure SMTP transport for port 465.

### PayMongo test mode first

```text
PAYMONGO_SECRET_KEY=<test-secret-key>
PAYMONGO_WEBHOOK_SECRET=<matching-test-endpoint-signing-secret>
PAYMONGO_PAYMENT_METHODS=qrph
```

Webhook endpoint:

```text
https://psp.hoahub.tech/api/webhooks/paymongo
```

Do not enable live PayMongo credentials until test-mode checkout, signed webhook, idempotency, ledger posting, receipt generation, and reconciliation pass end to end.

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
- First/last-name bootstrap values are optional overrides; otherwise the bootstrap derives them from the configured display name when possible.
- The national `SYSTEM_ADMIN` assignment is unscoped (`chapterId = null`).
- Optional member identity receives its chapter-scoped MEMBER assignment and MembershipHistory without removing national admin access.
- Membership-number collisions with another user are rejected.
- Never commit bootstrap credentials or production secrets.

### Credential-removal gate

Keep all required `BOOTSTRAP_ADMIN_*` values configured while troubleshooting, redeploying, and testing. **Remove them only after a real production login successfully reaches `/admin`.** Startup readiness logs alone are not sufficient evidence.

After successful `/admin` verification:

1. rotate any temporary password that was shared during troubleshooting;
2. remove all `BOOTSTRAP_ADMIN_*` variables from Hostinger;
3. restart/redeploy once more;
4. reconfirm normal administrator login still works.

## Production Database

Initial greenfield production flow:

1. Set the dedicated PSP `DATABASE_URL`.
2. Apply the approved Prisma schema.
3. Run approved baseline initialization.
4. Keep bootstrap values configured for first/recovery System Admin synchronization.
5. Redeploy using `npm run start`.
6. Verify logs show `Synchronizing configured PSP System Administrator` and `System Administrator is ready`.
7. Verify the administrator actually reaches `/admin`.
8. Remove bootstrap values only after that verified login.

`prisma db push` is acceptable only for initial greenfield creation before production member/financial records exist. Once production data exists, schema changes require reviewed migrations and backup/recovery planning.

Production restarts must not overwrite customized permissions or operational data. The national organization and Rho Alpha De Las Piñas baseline are created only when absent; the full seed runs only when the required baseline is missing.

## Origin / Request Security

The canonical approved production origin is:

```text
https://psp.hoahub.tech
```

PR #7 hardened both the API proxy and login route so the canonical PSP origin is recognized even when an upstream runtime/proxy arrangement differs from the configured local request origin. Explicit malicious `Sec-Fetch-Site: cross-site` requests remain rejected.

Do not add broad wildcard origins or disable origin checks to work around hosting configuration.

## Admin Login Recovery

If production login fails:

1. use exactly `https://psp.hoahub.tech/login`;
2. verify `NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech`;
3. verify `AUTH_SECRET` exists and is at least 32 characters;
4. verify the dedicated PSP `DATABASE_URL` is present;
5. keep bootstrap email/password/name configured;
6. configure optional member/chapter bootstrap values if member linkage is required;
7. redeploy/restart using `npm run start`;
8. inspect startup logs for bootstrap synchronization success;
9. test login and verify `/admin` access;
10. only then remove bootstrap variables.

The login API now returns controlled JSON failures. `Unexpected end of JSON input` must not be treated as acceptable production behavior.

## Domain / HTTPS

- `psp.hoahub.tech` is the canonical production origin.
- Domain mapping is owner-confirmed complete.
- HTTPS must remain active for login, activation, PayMongo, and QR verification.
- HTTP should redirect to HTTPS.
- Do not use temporary Hostinger domains in callbacks, email links, receipts, or QR codes.

If the PSP hostname ever routes to HOAHub again, treat it as a Hostinger/DNS regression. Fix the domain binding/DNS mapping; do not add application redirects between the two systems.

## PayMongo Release Gate

Test mode first:

1. configure test secret key;
2. create the test webhook endpoint for `checkout_session.payment.paid`;
3. configure the matching endpoint signing secret;
4. verify Checkout creation and success/cancel behavior;
5. verify raw-body signature validation;
6. verify repeated webhook delivery is idempotent;
7. verify authoritative payment posting, ledger entry, receipt creation, and reconciliation.

Only after test-mode signoff may live credentials be configured. Then run one controlled low-value live validation payment.

The browser success redirect is never authoritative payment confirmation.

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

1. `GET https://psp.hoahub.tech/api/health` returns `service=psi-sigma-phi-digital-platform`.
2. Landing page is PSP-branded with no HOAHub redirect.
3. Registration loads active chapters and enforces both acknowledgements.
4. System Admin login succeeds and reaches `/admin`.
5. Chapter creation/Chapter Admin assignment succeeds.
6. Applicant approval creates Member and sends activation email.
7. Activated member sees only authorized chapter data.
8. Cross-chapter negative authorization behavior is verified.
9. PWA manifest/service worker load.
10. Representative Android/iOS layout/install checks pass.
11. SMTP activation/recovery delivery succeeds.
12. PayMongo test checkout + signed webhook + ledger + receipt succeeds.
13. Certificate QR verification resolves under `psp.hoahub.tech`.

Do not infer production smoke results from source code or CI. Record live evidence in `STATUS.md`.

## Rollback / Recovery

- Keep the last known-good Git release SHA.
- Back up the production database before schema-changing releases.
- Document how to restore/verify the backup before production is considered fully released.
- If an application deployment fails, redeploy the last known-good commit.
- Do not perform destructive schema rollback after member/financial data exists without a reviewed recovery plan.

## Monitoring

Investigate and record:

- repeated 5xx responses;
- authentication failures/lockouts;
- webhook signature failures;
- payment reconciliation mismatches;
- email delivery failures;
- storage exhaustion;
- dependency vulnerability alerts.

A release is not complete until post-deployment smoke checks pass and the knowledge base is reconciled.
