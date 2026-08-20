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
- production runtime/security smoke tests succeed
- cross-chapter isolation tests succeed
- runtime dependency audit gate succeeds
- no real secrets exist in GitHub
- production database backup/rollback plan is confirmed
- PayMongo test-mode E2E passes before live credentials are enabled

## One-Time Hostinger Setup

Hostinger Node.js Web App hosting supports GitHub repository import and automatic redeployment.

In hPanel:

1. Go to **Websites → Add website → Node.js Web App / Deploy Web App**.
2. Create a **separate PSP application**. Do not add PSP as another route of the existing HOAHub application.
3. Choose/bind the `psp.hoahub.tech` subdomain to the new PSP application.
4. Import/connect GitHub repository `lowiesevilla-crypto/PSP_WEBSITE`.
5. Select production branch `main`.
6. Runtime: Node.js 22 or later compatible LTS.
7. Build command: `npm run build`.
8. Start command: `npm run start`.
9. Review framework detection as Next.js.
10. Configure production environment variables in hPanel.
11. Create/attach the dedicated PSP MySQL database.
12. Deploy.
13. Enable automatic redeployment from `main` only after the release process is stable.

### Existing `psp.hoahub.tech` HOAHub Redirect / Routing Conflict

If `https://psp.hoahub.tech` opens or redirects to the existing HOAHub website, the hostname is not yet routed to the PSP application. Treat this as a deployment blocker, not an application-code redirect.

In Hostinger/DNS configuration:

1. Inspect the current DNS record for `psp` and identify which Hostinger website/application it targets.
2. Inspect the existing `hoahub.tech` application for wildcard/custom-domain mappings such as `*.hoahub.tech` or an explicit `psp.hoahub.tech` alias.
3. Remove only the conflicting PSP hostname mapping from the HOAHub application. Do **not** disturb the working `hoahub.tech` production domain.
4. Bind `psp.hoahub.tech` explicitly to the separate PSP Node.js application.
5. Ensure the DNS record points to the target Hostinger provides for that PSP application.
6. Wait for DNS propagation where applicable.
7. Issue/activate SSL/TLS for `psp.hoahub.tech`.
8. Confirm `https://psp.hoahub.tech/api/health` returns JSON containing:
   `"service":"psi-sigma-phi-digital-platform"`.
9. Confirm the landing page is PSP-branded and no longer redirects to HOAHub.

Never solve this conflict by adding a code redirect inside HOAHub; the two applications must remain independently routed.

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

`CERTIFICATE_REQUIRE_CURRENT_DUES` is an operational policy switch. `false` allows any active member to obtain a certificate. `true` also requires the member's authoritative ledger balance to be current/non-positive. The setting does not rewrite existing certificate history.

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

1. `GET https://psp.hoahub.tech/api/health` returns `service=psi-sigma-phi-digital-platform`.
2. Landing page loads over HTTPS and is PSP-branded, with no HOAHub redirect.
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
