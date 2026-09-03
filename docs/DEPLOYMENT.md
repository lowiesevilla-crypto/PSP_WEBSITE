# Hostinger Production Deployment Runbook

## Production Target

- Application: Psi Sigma Phi Philippines Inc. Digital Membership Platform
- Repository: `lowiesevilla-crypto/PSP_WEBSITE`
- Hosting: Hostinger Node.js Web App
- Canonical URL: `https://psp.hoahub.tech`
- Production branch: `main`
- Runtime: Node.js 22+
- Database: dedicated PSP MySQL database, separate from HOAHub

## Current Deployment Status

- `psp.hoahub.tech` is correctly mapped to the PSP Website application — product-owner confirmed.
- The former HOAHub routing/mapping concern is RESOLVED unless a future regression is observed.
- Production bootstrap restart behavior was hardened through PR #5.
- Production admin-login recovery/hardening is tracked in PR #7 and must not be declared complete until a real production `/admin` login succeeds.
- Remaining deployment work includes production health, database/backup verification, SMTP delivery, PayMongo test-mode E2E, live certificate QR verification, PWA/device smoke, and final production signoff. See `STATUS.md`.

## Release Preconditions

Do not declare a production release complete until:

- release commit CI is green;
- Prisma schema validates and applies against CI MySQL;
- baseline seed passes;
- System Admin bootstrap passes in CI;
- strict TypeScript succeeds;
- production build succeeds;
- production runtime/security smoke tests succeed;
- cross-chapter isolation tests succeed;
- runtime dependency audit gate succeeds;
- no real secrets exist in GitHub;
- production database backup/rollback plan is confirmed;
- a production System Admin has successfully authenticated and reached `/admin`;
- PayMongo test-mode E2E passes before live credentials are enabled;
- production email, PWA, certificate, and health smoke checks pass.

## One-Time Hostinger Setup

In hPanel:

1. Create a separate PSP Node.js Web App. Do not add PSP as another route of the HOAHub application.
2. Bind `psp.hoahub.tech` explicitly to the PSP application.
3. Connect GitHub repository `lowiesevilla-crypto/PSP_WEBSITE`.
4. Select production branch `main`.
5. Use Node.js 22 or a later compatible LTS.
6. Build command: `npm run build`.
7. Start command: `npm run start`.
8. Confirm framework detection as Next.js.
9. Configure production environment variables in hPanel.
10. Create/attach a dedicated PSP MySQL database/user.
11. Configure persistent private storage for `STORAGE_ROOT`.
12. Deploy and review the startup/runtime logs.
13. Enable automatic redeployment from `main` only after the release process is stable.

## Domain Mapping / Routing

### Current state

`https://psp.hoahub.tech` is product-owner confirmed to be mapped to the PSP Website application.

### Regression recovery only

If `https://psp.hoahub.tech` later opens or redirects to the existing HOAHub website, treat that as a Hostinger/DNS routing regression, not an application-code redirect.

1. Inspect the current DNS record for `psp` and identify which Hostinger website/application it targets.
2. Inspect the existing `hoahub.tech` application for wildcard/custom-domain mappings such as `*.hoahub.tech` or an explicit `psp.hoahub.tech` alias.
3. Remove only the conflicting PSP hostname mapping from the HOAHub application. Do not disturb the working HOAHub production domain.
4. Bind `psp.hoahub.tech` explicitly to the separate PSP Node.js application.
5. Ensure the DNS record points to the target Hostinger provides for that PSP application.
6. Wait for DNS propagation where applicable.
7. Issue/activate SSL/TLS for `psp.hoahub.tech`.
8. Confirm `https://psp.hoahub.tech/api/health` returns JSON containing `"service":"psi-sigma-phi-digital-platform"`.
9. Confirm the landing page is PSP-branded and no longer redirects to HOAHub.

Never solve a routing conflict by adding a code redirect inside HOAHub; the two applications must remain independently routed.

## Production Environment Variables

Required application/runtime values:

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

Required for production email:

```text
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<psp-mailbox>
SMTP_PASSWORD=<secret>
SMTP_FROM=<approved-from-address>
```

Required for PayMongo test-mode validation:

```text
PAYMONGO_SECRET_KEY=<test-key-until-live-approval>
PAYMONGO_WEBHOOK_SECRET=<matching-test-endpoint-signing-secret>
PAYMONGO_PAYMENT_METHODS=qrph
```

Optional bootstrap variables are used only for initial/recovery System Administrator synchronization:

```text
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
BOOTSTRAP_ADMIN_NAME=
BOOTSTRAP_ADMIN_MEMBER_NO=
BOOTSTRAP_ADMIN_CHAPTER_CODE=
BOOTSTRAP_ADMIN_FIRST_NAME=
BOOTSTRAP_ADMIN_LAST_NAME=
```

`BOOTSTRAP_ADMIN_MEMBER_NO` and `BOOTSTRAP_ADMIN_CHAPTER_CODE` are optional and are used when the System Administrator is also an active PSP member. First/last-name bootstrap values are optional overrides; otherwise the bootstrap attempts to derive them from `BOOTSTRAP_ADMIN_NAME`.

**Credential-removal gate:** keep the required `BOOTSTRAP_ADMIN_*` values configured through restart/redeploy and testing. Remove all `BOOTSTRAP_ADMIN_*` runtime variables only **after a verified successful production login reaches `/admin`**. Startup readiness logs alone are not sufficient evidence for removal.

Never put live secrets in GitHub, `.env.example`, client-side `NEXT_PUBLIC_*` variables, browser code, URLs, screenshots, or logs.

## Production Database

Create a dedicated PSP MySQL database/user. Never reuse the HOAHub database.

Initial greenfield release:

1. Set production `DATABASE_URL` in Hostinger environment variables.
2. Apply the approved Prisma schema.
3. Run the approved baseline initialization/seed process.
4. Bootstrap the first System Administrator with temporary environment values.
5. Redeploy/restart and confirm startup logs show the configured System Administrator was synchronized.
6. Verify the administrator actually signs in and reaches `/admin`.
7. Only then remove all `BOOTSTRAP_ADMIN_*` variables and restart once more.

`prisma db push` may be used only for the first greenfield production creation before member/financial records exist. Once production data exists, all schema changes require reviewed Prisma migrations and backups.

### Production restart initialization behavior

Production startup initialization is intentionally idempotent:

- the PSP national organization is created only if absent;
- the Rho Alpha De Las Piñas baseline chapter is created only if absent;
- the full baseline seed runs only when the required `SYSTEM_ADMIN` role baseline is missing;
- the configured bootstrap administrator is synchronized only while `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are present;
- optional member identity synchronization runs only when explicitly configured;
- production restarts must not overwrite customized permission or operational data through unconditional reseeding.

## Admin Login Recovery

If production login is failing:

1. Confirm the browser uses exactly `https://psp.hoahub.tech/login`.
2. Confirm `NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech` with no quotes, path, whitespace, or trailing alternate hostname.
3. Confirm `AUTH_SECRET` exists and is at least 32 characters.
4. Keep `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and `BOOTSTRAP_ADMIN_NAME` configured.
5. If member identity is required, also configure the explicit member/chapter bootstrap values.
6. Redeploy/restart using `npm run start`.
7. Review logs for `Synchronizing configured PSP System Administrator` followed by `System Administrator is ready`.
8. Test login and verify the account reaches `/admin`.
9. Remove all `BOOTSTRAP_ADMIN_*` values only after step 8 succeeds.

The login API must return controlled JSON failures. Browser parse errors such as `Unexpected end of JSON input` are treated as application defects and must not be accepted as normal production behavior.

## PayMongo

Test mode first:

- Set `PAYMONGO_SECRET_KEY=sk_test_...`.
- Register a test webhook endpoint for `checkout_session.payment.paid` at `https://psp.hoahub.tech/api/webhooks/paymongo`.
- Store its endpoint signing secret as `PAYMONGO_WEBHOOK_SECRET`.
- Verify checkout, success/cancel return behavior, signature validation, webhook idempotency, ledger posting, receipt creation, and reconciliation.

Only after test-mode QA passes:

1. Confirm required PayMongo payment methods are active.
2. Replace the test secret with the live secret in Hostinger.
3. Create the live-mode webhook endpoint.
4. Replace the webhook signing secret with the live endpoint secret.
5. Run one controlled low-value live validation payment.

The browser success redirect is never authoritative payment confirmation.

## Domain & HTTPS

- `psp.hoahub.tech` is the canonical production origin.
- HTTPS must be active before login, member activation, PayMongo, or certificate QR verification are treated as production-ready.
- HTTP should redirect to HTTPS.
- Do not use a temporary Hostinger domain in production callbacks, emails, receipts, or QR codes.

## PWA Production Checks

- manifest loads over HTTPS;
- service worker scope is correct;
- branded icon loads;
- Android install works where supported;
- iOS Add to Home Screen guidance works;
- start URL stays under `psp.hoahub.tech`;
- sensitive auth/payment API responses are not cached.

## Post-Deployment Smoke Tests

1. `GET https://psp.hoahub.tech/api/health` returns `service=psi-sigma-phi-digital-platform`.
2. Landing page loads over HTTPS and is PSP-branded, with no HOAHub redirect.
3. Registration loads active chapters and requires both acknowledgements.
4. System Admin login succeeds and reaches `/admin`.
5. Chapter creation/Chapter Admin assignment succeeds.
6. Applicant approval creates Member and sends activation email.
7. Activated member logs in and sees only correct chapter data.
8. Cross-chapter authorization negative checks pass.
9. PWA manifest/service worker load.
10. Mobile layout works at representative phone widths.
11. SMTP delivery succeeds.
12. PayMongo test checkout/signed webhook succeeds before live mode.
13. Certificate QR verification resolves under `psp.hoahub.tech`.

Do not infer these smoke checks from source code. Record evidence in `STATUS.md` as each is completed.

## Rollback

- Keep the last known-good Git release SHA.
- Back up the database before schema-changing releases.
- If application deployment fails, redeploy the last known-good commit.
- Do not perform destructive schema rollback after member/financial data exists without a reviewed recovery plan.

## Monitoring

Use Hostinger deployment/runtime logs and resource monitoring. Investigate:

- repeated 5xx errors;
- authentication failures/lockouts;
- webhook signature failures;
- payment reconciliation mismatches;
- email delivery failures;
- storage exhaustion;
- dependency vulnerability alerts.

A release is not complete until post-deployment smoke checks pass and the knowledge base is updated.
