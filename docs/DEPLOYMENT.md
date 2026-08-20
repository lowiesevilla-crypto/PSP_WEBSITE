# Hostinger Production Deployment Runbook

## Production Target

- Application: Psi Sigma Phi Philippines Inc. Digital Membership Platform
- Repository: `lowiesevilla-crypto/PSP_WEBSITE`
- Hosting: Hostinger Node.js Web App
- Canonical URL: `https://psp.hoahub.tech`
- Production branch: `main`
- Runtime: Node.js 22+
- Database: dedicated PSP MySQL database, separate from HOAHub

## Release Preconditions

Do not publish a release until:

- release commit CI is green
- Prisma schema validates and applies against CI MySQL
- baseline seed passes
- System Admin bootstrap passes in CI
- strict TypeScript succeeds
- production build succeeds
- runtime dependency audit gate succeeds
- no real secrets exist in GitHub
- production database backup/rollback plan is confirmed
- PayMongo test-mode E2E passes before live credentials are enabled

## One-Time Hostinger Setup

Hostinger Node.js Web App hosting supports GitHub repository import and automatic redeployment.

In hPanel:

1. Go to **Websites → Add website → Node.js Web App / Deploy Web App**.
2. Choose the `psp.hoahub.tech` domain/subdomain.
3. Import/connect GitHub repository `lowiesevilla-crypto/PSP_WEBSITE`.
4. Select production branch `main`.
5. Runtime: Node.js 22 or later compatible LTS.
6. Build command: `npm run build`.
7. Start command: `npm run start`.
8. Review framework detection as Next.js.
9. Configure production environment variables in hPanel.
10. Deploy.
11. Enable automatic redeployment from `main` only after the release process is stable.

## Production Environment Variables

Required values include:

```text
NODE_ENV=production
APP_ENV=production
NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech
DATABASE_URL=mysql://<user>:<password>@<host>:3306/<psp_database>
AUTH_SECRET=<strong-random-secret>
SMTP_HOST=<hostinger-smtp-host>
SMTP_PORT=587
SMTP_USER=<psp-mailbox>
SMTP_PASSWORD=<secret>
SMTP_FROM=<approved-from-address>
PAYMONGO_SECRET_KEY=<test-key-until-live-approval>
PAYMONGO_WEBHOOK_SECRET=<matching-endpoint-signing-secret>
PAYMONGO_PAYMENT_METHODS=qrph
MEMBERSHIP_NUMBER_PREFIX=PSP
CERTIFICATE_REQUIRE_CURRENT_DUES=false
STORAGE_ROOT=<persistent-private-storage-path>
```

Optional bootstrap variables are used only for initial System Administrator creation and must be removed immediately afterward:

```text
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
BOOTSTRAP_ADMIN_NAME=
```

Never put live secrets in GitHub, `.env.example`, client-side `NEXT_PUBLIC_*` variables, browser code, URLs, or logs.

## Production Database

Create a dedicated PSP MySQL database/user. Never reuse the HOAHub database.

Initial greenfield release:

1. Set production `DATABASE_URL` in Hostinger environment variables.
2. Apply the approved Prisma schema.
3. Run `npm run seed` to create idempotent organization/roles/permissions/assessment types.
4. Bootstrap the first System Administrator with temporary environment values.
5. Remove bootstrap password variables immediately.

`prisma db push` may be used only for the first greenfield production creation before member/financial records exist. Once production data exists, all schema changes require reviewed Prisma migrations and backups.

## PayMongo

Test mode first:

- Set `PAYMONGO_SECRET_KEY=sk_test_...`.
- Register a test webhook endpoint for `checkout_session.payment.paid`:
  `https://psp.hoahub.tech/api/webhooks/paymongo`
- Store its endpoint signing secret as `PAYMONGO_WEBHOOK_SECRET`.
- Verify checkout, success/cancel return behavior, signature validation, webhook idempotency, ledger posting, receipt creation, and reconciliation.

Only after test-mode QA passes:

1. Confirm required PayMongo payment methods are active.
2. Replace test secret with live secret in Hostinger.
3. Create the live-mode webhook endpoint.
4. Replace the webhook signing secret with the live endpoint secret.
5. Run one controlled low-value live validation payment.

The browser success redirect is never authoritative payment confirmation.

## Domain & HTTPS

- `psp.hoahub.tech` is the canonical production origin.
- HTTPS must be active before login, member activation, PayMongo, or certificate QR verification are enabled.
- HTTP should redirect to HTTPS.
- Do not use a temporary Hostinger domain in production callbacks, emails, receipts, or QR codes.

## PWA Production Checks

- manifest loads over HTTPS
- service worker scope is correct
- branded icon loads
- Android install works where supported
- iOS Add to Home Screen guidance works
- start URL stays under `psp.hoahub.tech`
- sensitive auth/payment API responses are not cached

## Post-Deployment Smoke Tests

1. `GET https://psp.hoahub.tech/api/health`
2. Landing page loads over HTTPS.
3. Registration loads active chapters and requires both acknowledgements.
4. System Admin login succeeds.
5. Chapter creation/Chapter Admin assignment succeeds.
6. Applicant approval creates Member and sends activation email.
7. Activated member logs in and sees only correct chapter data.
8. Cross-chapter authorization negative checks pass.
9. PWA manifest/service worker load.
10. Mobile layout works at representative phone widths.
11. SMTP delivery succeeds.
12. PayMongo test checkout/signed webhook succeeds before live mode.
13. Certificate QR verification resolves under `psp.hoahub.tech`.

## Rollback

- Keep the last known-good Git release SHA.
- Back up the database before schema-changing releases.
- If application deployment fails, redeploy the last known-good commit.
- Do not perform destructive schema rollback after member/financial data exists without a reviewed recovery plan.

## Monitoring

Use Hostinger deployment/runtime logs and resource monitoring. Investigate:

- repeated 5xx errors
- authentication failures/lockouts
- webhook signature failures
- payment reconciliation mismatches
- email delivery failures
- storage exhaustion
- dependency vulnerability alerts

A release is not complete until post-deployment smoke checks pass.
