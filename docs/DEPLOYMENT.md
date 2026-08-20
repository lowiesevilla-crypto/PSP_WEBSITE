# Deployment — Hostinger

## Canonical Production Target

- **Host:** Hostinger
- **Production URL:** `https://psp.hoahub.tech`
- **Repository:** `lowiesevilla-crypto/PSP_WEBSITE`
- **Production branch:** `main` after approved merge/release

`https://psp.hoahub.tech` is the canonical production origin and must be used consistently for production-facing integrations and generated links.

## URLs Derived from the Production Origin

The exact route structure may evolve, but all production URLs must resolve under the canonical origin. Examples:

- Member login: `https://psp.hoahub.tech/login`
- Registration: `https://psp.hoahub.tech/register`
- Certificate verification: `https://psp.hoahub.tech/verify/<token>`
- Payment success return: `https://psp.hoahub.tech/payments/success`
- Payment cancellation return: `https://psp.hoahub.tech/payments/cancelled`
- PayMongo webhook endpoint: `https://psp.hoahub.tech/api/payments/paymongo/webhook`

Final route names must match implemented routes before production configuration.

## Production Environment

Hostinger production environment variables must include the appropriate values for:

```text
NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech
APP_ENV=production
DATABASE_URL=<production database URL>
AUTH_SECRET=<strong production secret>
PAYMONGO_SECRET_KEY=<production PayMongo secret>
PAYMONGO_WEBHOOK_SECRET=<configured webhook verification secret/material where applicable>
SMTP_HOST=<production SMTP host>
SMTP_PORT=<production SMTP port>
SMTP_USER=<production SMTP user>
SMTP_PASSWORD=<production SMTP password>
SMTP_FROM=<approved sender>
STORAGE_PROVIDER=<production storage adapter>
...
```

Never commit actual values to GitHub.

## Hostinger Requirements

The deployment must support:

- Node.js runtime compatible with the project version
- Next.js production build/start process
- HTTPS/TLS for `psp.hoahub.tech`
- Environment variables/secrets outside source control
- MySQL-compatible production database if the current Prisma datasource remains MySQL
- Persistent media/object storage strategy
- Application logs/error monitoring
- Database backup and tested restore process
- Controlled restart and rollback procedure

## DNS / Domain Readiness

Before go-live, confirm:

1. `psp.hoahub.tech` is created in Hostinger/DNS.
2. The DNS record points to the correct Hostinger application target.
3. HTTPS certificate is active and valid.
4. HTTP redirects to HTTPS.
5. `NEXT_PUBLIC_APP_URL` equals `https://psp.hoahub.tech`.
6. No staging or HOAHub application is accidentally mapped to this hostname.

## PayMongo Production Readiness

Before enabling live payments:

1. Configure PayMongo production credentials only in Hostinger secrets/environment.
2. Configure production callback/return URLs under `https://psp.hoahub.tech`.
3. Configure the webhook endpoint using the implemented production route.
4. Confirm webhook authenticity validation.
5. Confirm idempotent event handling.
6. Execute a controlled low-value production smoke test only after explicit approval.
7. Confirm successful transaction, member ledger posting, digital receipt, reconciliation record, and audit event.

A browser redirect alone must never mark a payment as paid.

## PWA Production Readiness

Before go-live verify on the production origin:

- Manifest is accessible over HTTPS.
- Service worker scope is correct.
- PWA icons load correctly.
- Android installability works on supported browsers.
- iOS Add to Home Screen experience is documented/tested.
- Start URL remains within `psp.hoahub.tech`.
- Offline cache excludes sensitive/auth/payment/verification API state.

## Certificate QR Verification

Generated production certificate QR codes must resolve to `https://psp.hoahub.tech` and use opaque verification identifiers/tokens rather than exposing internal database IDs unnecessarily.

Public verification must show only the approved minimum membership/certificate information.

## Release Process

No production deployment is implicit.

Required release flow:

1. Develop on feature/fix branch.
2. Typecheck/build/test.
3. Validate chapter isolation/security.
4. Complete applicable E2E QA.
5. Review migration plan.
6. Merge approved release to `main`.
7. Confirm backup/rollback readiness.
8. Obtain explicit production deployment approval.
9. Deploy to Hostinger.
10. Run production smoke tests on `https://psp.hoahub.tech`.
11. Record release details and any deployment changes in project documentation.

## Current Status

As of 2026-08-20, implementation is in the foundation phase. The production hostname is reserved as the target, but the project has **not** been deployed to production yet.
