# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Release identity:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> Read with `../AGENTS.md`. Do not claim provider-, credential-, device-, inbox-, payment-, backup-, or production-state behavior without direct evidence.

## Executive Status

PSP r14 backend/readiness and the PayMongo Finance draft UX are deployed and proven in production. The repository is currently processing **P0 hotfix PR #41** for certificate branding/email/invalidation and National Admin PayMongo activation visibility.

Full production closure remains open until the exact PR #41 head passes CI, merges, Hostinger publishes the resulting `main`, and the new production capability markers are observed.

A separate Hostinger CDN issue remains open for the public homepage `/`: the CDN has been observed returning a long-lived cached object despite the application no-store policy. That issue must not be confused with the Finance or certificate hotfixes.

## Proven Release Evidence

- PR #34 exact head `6a4fbe1552fdcd857363b12975f34c25f0c7b954` passed PSP CI #572 and merged.
- Merge SHA `3701313f371b473df8400ed7404359fb6a5ccf72` passed post-merge PSP CI #573.
- Production-build/schema hotfix PR #37 exact head `c7b2e9f9a22cf36e107d94069f020f17214bf640` passed complete CI and merged.
- Post-merge PSP CI #601 passed on `d2795c8d33f5e109fabd87bd8d1122b4e6586549`.
- Next.js/security/cache hotfix PR #38 exact head `60fd5c7e04bd8ea95c97990586d14f61e3f77f89` passed both push and PR CI and merged.
- PayMongo Finance UX PR #39 exact head `396e746e99ac765813f531822477659be0c9c26e` passed both exact-head CI copies and merged.
- Deployment-proof PR #40 exact head `870c84264947e05327b09fa41932cd7cb9099037` passed both exact-head CI copies and merged.
- Current production health has directly reported `financePaymentConfigVersion=chapter-draft-ux-v2`, proving the corrected Chapter draft Finance code is live.

## Production Build / Schema Incident — Closed

Hostinger initially failed r14 builds because Prisma refused the new `Certificate(batchId, memberId)` unique constraint unless `--accept-data-loss` was supplied.

PSP deliberately does **not** use `--accept-data-loss`. PR #37 replaced that production upgrade with reviewed additive SQL that adds only required columns/indexes, backfills legacy certificate dates safely, keeps legacy announcements private, and fails closed on duplicate non-null `(batchId, memberId)` rows.

CI now reproduces the production-only upgrade path with `APP_ENV=production` before merge.

## Dependency Security — High/Critical Gates Closed

The three high findings reported by Hostinger were traced to:

`prisma@6.19.3 -> @prisma/config -> deepmerge-ts < 8.0.0`

The reviewed fix pins `deepmerge-ts` `8.0.1` via npm overrides instead of using `npm audit fix --force`.

Next.js and `eslint-config-next` are on `16.3.3`.

Permanent gates include:

- complete `npm audit --audit-level=high` before build;
- runtime-only dependency audit after pruning dev dependencies;
- Prisma validate/generate/db push;
- production-only additive schema regression;
- lint/typecheck/build/runtime/security smoke.

## PayMongo Finance — Current Behavior

Production already includes the Chapter linked-account Draft model:

- Chapter `org_*` Account ID is a non-secret identifier and may be saved while disabled;
- TEST/LIVE mode is editable while disabled;
- payment methods are editable while disabled;
- activation remains fail-closed until the parent platform, stable credential encryption, matching mode and webhook prerequisites are ready;
- the encryption check occurs before any PayMongo child-webhook creation call.

PR #41 adds the National Admin activation UX requested from production review:

- dedicated **Credential Encryption Setup** panel when `PAYMENT_CONFIG_ENCRYPTION_KEY` is absent;
- exact instruction that the key belongs in the production app's secure Hostinger environment variables, not a PSP browser form;
- explicit hPanel entry point and a readiness re-check action;
- Enable Online Payment remains clickable for blocker visibility instead of appearing broken/disabled;
- blocked clicks keep `isEnabled=false` and display exact blockers;
- activation still requires an explicit final **Save & Activate Online Payment** submission.

The master encryption key is never displayed, returned, logged or stored in the PSP Admin form/database.

## P0 Certificate Hotfix — PR #41

PR #41 implements:

1. **Issuing Chapter logo on certificate PDF**
   - uses the certificate Chapter's configured logo;
   - PSP-managed JPG/PNG/WEBP logos are normalized before PDF embedding;
   - national logo is only a fallback when the Chapter has no usable configured logo.

2. **Automatic member email after successful issuance**
   - sent to the member's registered account email;
   - branded with the issuing Chapter;
   - contains the Chairman appreciation/certificate message and signatory context;
   - attaches the generated certificate PDF;
   - includes the public verification link;
   - success/failure is audited;
   - temporary SMTP failure does not roll back a validly issued certificate.

3. **Delete / Invalidate for Chapter Admin and National Admin**
   - uses existing `certificates.manage` Chapter scoping;
   - does not physically erase the legal/audit record;
   - status becomes `REVOKED` with `revokedAt` and reason;
   - member is notified;
   - QR verification displays `INVALID · REVOKED`;
   - revoked certificate PDF returns HTTP 410 and is no longer downloadable as a valid document;
   - audit action records the invalidation.

Production proof markers introduced by the hotfix branch:

- `paymentActivationUxVersion=national-admin-v2`
- `certificateHotfixVersion=chapter-logo-email-invalidation-v1`

These markers must be observed from live `/api/health` after merge before the hotfix is called production-complete.

## Remaining Production Defect — Public Homepage CDN Cache

A completed Production Smoke observed Hostinger serving `/` with:

- `x-nextjs-cache: HIT`
- `x-nextjs-prerender: 1`
- `cache-control: s-maxage=31536000`
- `x-hcdn-cache-status: HIT`

This is upstream caching of the public homepage despite the application's no-store intent. The cache must be purged/corrected at Hostinger and Production Smoke rerun unchanged. Do not weaken the public-feed freshness assertion.

## Current Release Sequence

1. PR #41 final documentation-bearing head must pass all CI gates.
2. Inspect any failed CI job and fix the exact cause; any new head must rerun the complete gate.
3. Merge only the exact passing PR #41 head with no unresolved review threads.
4. Verify post-merge `main` CI.
5. Verify Hostinger publishes the resulting `main`.
6. Confirm live `/api/health` exposes both PR #41 capability markers.
7. Verify certificate lifecycle behavior and Finance activation UX in production without exposing secrets.
8. Keep the separate homepage CDN issue open until normal `/` is fresh and Production Smoke fully passes.

## Controlled / External Pending

Even after automated hotfix closure, these remain external until directly evidenced:

- real PayMongo Platforms TEST DUES/CONTRIBUTION/OTHER split-payment E2E;
- real child webhook/signature and split settlement;
- controlled LIVE payment after TEST signoff and explicit product-owner approval;
- actual recipient certificate-email receipt/rendering in a real inbox;
- physical Android/iOS installed-PWA acceptance;
- real passkey-device acceptance;
- second-device Digital ID / Certificate QR acceptance where required;
- database backup/restore drill.

Payment architecture: `PAYMENTS.md`  
Deployment runbook: `DEPLOYMENT.md`  
Detailed tracker: `PSP_PLATFORM_HARDENING_2026-09-06.md`
