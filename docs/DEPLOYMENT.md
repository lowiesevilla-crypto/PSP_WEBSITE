# Hostinger Production Deployment Runbook

## Production Target

- Application: Psi Sigma Phi Philippines Inc. Digital Membership Platform
- Repository: `lowiesevilla-crypto/PSP_WEBSITE`
- Hosting: Hostinger managed Next.js / Node.js
- Canonical URL: `https://psp.hoahub.tech`
- Production branch: `main`
- Runtime: Node.js 22+
- Database: dedicated PSP MySQL, completely separate from HOAHub

## Current Deployment Status — 2026-09-06 11:01 PHT

PSP r14 application code is **MERGED AND FULLY GREEN IN EXACT-HEAD/POST-MERGE CI**, but Hostinger is still serving the previous r13 build.

Target identity:

```text
release = 2026-09-06-r14
deploymentGeneration = 2026-09-06-platform-hardening-v1
```

Fresh Production Smoke run #26 / run `34007514552` probed production 40 times from 10:51–11:01 PHT. Every request returned HTTP 200 with zero network failures, but the final live health payload remained:

```text
release = 2026-09-05-r13
deploymentGeneration = 2026-09-05-release-keyed-pwa-install-v1
```

Therefore the immediate release blocker is **Hostinger deployment/Git integration**, not application CI. The live r14 readiness/public/PWA/security checks have not run because exact r14 is not deployed.

## Proven Repository Evidence

- PR #34 final exact head `6a4fbe1552fdcd857363b12975f34c25f0c7b954` — PSP CI #572 PASSED.
- Implementation merge SHA `3701313f371b473df8400ed7404359fb6a5ccf72` — post-merge PSP CI #573 PASSED.
- Documentation PR #35 exact head `c677b1a7789884855f9aaa3b088f8398825d3f7e` — PSP CI #578 PASSED and merged.
- Documentation-bearing main SHA `38b9a2ed95300201bc0befa744c8611ac970037d` — post-merge PSP CI #579 PASSED.

## Hostinger Application Setup

```text
Repository: lowiesevilla-crypto/PSP_WEBSITE
Branch: main
Node.js: 22 or later compatible LTS
Build command: npm run build
Start command supplied by repo: npm run start
Canonical URL: https://psp.hoahub.tech
```

The repository contains CI and Production Smoke workflows only; there is no GitHub Actions production-publish workflow. Hostinger owns publication of `main`. A GitHub merge is not sufficient production evidence.

### Required hosting-side correction

In Hostinger, verify the application Git integration still points to:

```text
Repository: lowiesevilla-crypto/PSP_WEBSITE
Branch: main
```

Then redeploy/pull the latest `main` and use the existing production build command `npm run build`. Do not alter application code merely to force another deployment signal.

After redeploy, rerun `PSP Production Smoke` unchanged. The first step must observe exact r14 before any later assertion is accepted.

## Production Schema Upgrade Safety

`scripts/production-build-init.mjs` runs before `next build` only for `APP_ENV=production`.

Safety rules:

1. Require `DATABASE_URL`.
2. Inspect only the connected PSP DB `information_schema`.
3. Empty or specifically recognized additive states may be synchronized.
4. Exact current schema skips unnecessary push.
5. Partial/unknown schema fails closed.
6. Automatic Prisma invocation never uses `--accept-data-loss`.
7. Baseline/System Admin, finance permissions and Digital Member ID backfill remain idempotent.
8. r14 additive schema includes custom-certificate metadata and `Announcement.isPublic`.
9. Any initialization failure stops publication rather than allowing a partial release.

Before any non-additive production schema change, require verified backup and reviewed migration/recovery.

## Core Production Environment

```text
NODE_ENV=production
APP_ENV=production
NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech
DATABASE_URL=mysql://<user>:<password>@<host>:3306/<dedicated_psp_database>
AUTH_SECRET=<strong random secret at least 32 characters>
MEMBERSHIP_NUMBER_PREFIX=PSP
CERTIFICATE_REQUIRE_CURRENT_DUES=false
STORAGE_ROOT=<persistent private storage path>
MAX_IMAGE_UPLOAD_BYTES=5242880
```

Secrets belong only in Hostinger secret/environment management, never GitHub, chat, screenshots or logs.

## PayMongo Platforms / Linked Accounts

Required server-only variables include parent platform secret/account, stable payment-config encryption key, deliberately approved convenience fee and `PAYMONGO_LIVE_ENABLED=false` until controlled TEST signoff.

r14 behavior:

- authorized Chapter may save a disabled linked-account Draft without parent readiness;
- Draft does not contact PayMongo or create a child webhook;
- Draft/Blocked Chapter remains non-payable;
- activation requires platform/fee/mode/unique child/webhook/method readiness;
- failed activation remains disabled;
- LIVE stays blocked until explicitly approved after real TEST acceptance.

## Production Health / Smoke

### Liveness

```text
GET https://psp.hoahub.tech/api/health
```

Exact r14 identity is mandatory before release acceptance.

### Readiness

```text
GET https://psp.hoahub.tech/api/health/ready
```

After exact r14 is visible, require HTTP 200 and `ok` for database, auth schema, baseline, member-mobile schema, custom-certificate schema, public-announcement schema and auth configuration.

### Remaining public/runtime checks

After exact r14 identity:

- public homepage global-feed marker;
- stable manifest `id: "/"`;
- registration mobile acknowledgement marker;
- install page deployment marker;
- login/recovery/registration markers;
- production security headers;
- canonical invalid login 401;
- cross-site login 403;
- public Digital ID/Certificate verification routes without application 500.

## Controlled Production Acceptance

Credential/state-changing checks still require controlled accounts/records for Admin member editing, Chapter payment configuration, custom certificate issuance, member dashboard/payment readiness, approval/welcome email, second-device QR validation and passkey enrollment/login.

## PWA Device Gate

Physical Android Chrome and iOS/iPadOS Add-to-Home-Screen acceptance remains required, including standalone launch, safe areas, portrait/landscape, payment QR rendering and no false offline financial truth.

## Backup / Recovery Gate

Before final operational signoff:

1. confirm current production MySQL backup;
2. document and prove restore procedure;
3. retain last known-good Git release SHA;
4. never perform destructive rollback after member/financial data exists without reviewed recovery.

## Current r14 Release Checklist

- [x] PR #34 exact-head CI #572 green
- [x] PR #34 exact passing head merged
- [x] implementation post-merge PSP CI #573 green
- [x] documentation reconciliation CI #578 / post-merge CI #579 green
- [x] r14 code/schema/runtime/security contracts automated in CI
- [x] production endpoint proven reachable during fresh run #26
- [ ] Hostinger serves exact r14 release/generation — **CURRENT BLOCKER**
- [ ] r14 Production Smoke readiness/public/PWA/security checks
- [ ] controlled production Admin/Member workflow acceptance
- [ ] real recipient email delivery/rendering
- [ ] Android/iOS physical PWA smoke
- [ ] passkey physical-device smoke
- [ ] second-device Digital ID/Certificate QR acceptance
- [ ] PayMongo Platforms real TEST split-payment/provider-webhook acceptance
- [ ] MySQL backup/restore evidence
- [ ] controlled low-value PayMongo LIVE validation after explicit approval

See `STATUS.md`, `PSP_PLATFORM_HARDENING_2026-09-06.md`, `PAYMENTS.md`, and `MEMBER_MOBILE_P0.md`.
