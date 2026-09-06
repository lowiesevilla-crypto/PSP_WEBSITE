# Hostinger Production Deployment Runbook

## Production Target

- Application: Psi Sigma Phi Philippines Inc. Digital Membership Platform
- Repository: `lowiesevilla-crypto/PSP_WEBSITE`
- Hosting: Hostinger managed Next.js / Node.js
- Canonical URL: `https://psp.hoahub.tech`
- Production branch: `main`
- Runtime: Node.js 22+
- Database: dedicated PSP MySQL, completely separate from HOAHub

## Current Deployment Status — 2026-09-06

PSP r14 application code is implemented and CI-proven, but production remains on r13 while production-build hotfix PR #37 completes release gates.

Target identity:

```text
release = 2026-09-06-r14
deploymentGeneration = 2026-09-06-platform-hardening-v1
```

The Hostinger deployment history proves Git integration is receiving `main` commits correctly. The r14-era deployments failed during the Hostinger build, leaving the prior successful r13 deployment current.

## Confirmed Hostinger Build Failure

Hostinger runs:

```text
npm run build
-> node scripts/production-build-init.mjs && next build
```

The production build reached the real PSP database and reported:

```text
Existing member-mobile PSP schema detected.
Applying reviewed additive custom-certificate metadata columns.
...
A unique constraint covering [batchId,memberId] on Certificate will be added.
Error: Use the --accept-data-loss flag to ignore the data loss warnings
ERROR: Failed to build the application
```

This was a production-only path not previously exercised by the standard CI build because CI used `APP_ENV=test`. The application correctly refused Prisma's `--accept-data-loss` requirement.

## PR #37 Safe Additive Upgrade

The r14 hotfix removes the risky Prisma `db push` from the custom-certificate/public-announcement additive upgrade path and performs reviewed SQL operations instead.

Certificate upgrade rules:

1. Add only missing r14 metadata columns.
2. Add `certificateDate` nullable first.
3. Backfill existing rows with `certificateDate = issuedAt`.
4. Enforce the final NOT NULL/default contract only after the backfill.
5. Add nullable `batchId` without rewriting legacy rows.
6. Query for duplicate non-null `(batchId, memberId)` pairs before adding the uniqueness constraint.
7. If any duplicate exists, fail closed and require reviewed recovery; never delete or alter certificate records automatically.
8. Add the batch/member unique index and certificate type/date index only when absent.

Announcement upgrade rules:

1. Add `isPublic TINYINT(1) NOT NULL DEFAULT 0` only when absent.
2. Existing announcements therefore remain private.
3. Add the `(isPublic, startsAt)` index only when absent.

The initializer still never invokes Prisma with `--accept-data-loss`.

## Production-Only Upgrade Regression

CI now includes `Validate production additive schema upgrade`:

1. start from a fully current CI MySQL schema;
2. remove only the r14 certificate/public-announcement columns and indexes to emulate the previously deployed member-mobile production schema;
3. run `production-build-init.mjs` with `APP_ENV=production`;
4. verify all required r14 columns/indexes exist;
5. run Prisma `db push --skip-generate` without `--accept-data-loss` and require the schema to be fully synchronized.

Hotfix code head `1556c01794ed47938b625de77e14141ff9efa651` passed this regression in PSP CI #593 together with Prisma validate/generate/db-push, lint, typecheck, production build, runtime smoke and dependency security gates.

## Dependency Security Gate

Hostinger also reported `3 high severity vulnerabilities` during npm install. CI reproduced them as one chain:

```text
prisma@6.19.3 -> @prisma/config -> deepmerge-ts < 8.0.0
```

Advisory: `GHSA-ggr8-5vv4-36mx`.

Do not use `npm audit fix --force`; npm proposed a breaking Prisma downgrade. The reviewed remediation pins the patched transitive version:

```json
"overrides": {
  "deepmerge-ts": "8.0.1"
}
```

Release CI now includes:

```text
npm audit --audit-level=high
```

before build, plus the existing post-prune runtime-only audit. Both must pass. CI #593 proves the patched override remains compatible with Prisma and the complete application test suite.

## Hostinger Application Setup

```text
Repository: lowiesevilla-crypto/PSP_WEBSITE
Branch: main
Node.js: 22 or later compatible LTS
Build command: npm run build
Start command supplied by repo: npm run start
Canonical URL: https://psp.hoahub.tech
```

Hostinger owns publication of `main`; GitHub Actions provides CI and Production Smoke, not the production publish action.

After PR #37 merges, allow Hostinger to build the new `main`. Do not manually add `--accept-data-loss` to any Hostinger command or environment setting.

If the Hostinger build fails again, open the latest deployment and inspect the first actual error before changing code or retrying repeatedly.

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

## Production Schema Upgrade Safety

`scripts/production-build-init.mjs` runs before `next build` only for `APP_ENV=production`.

Safety requirements:

- require `DATABASE_URL`;
- inspect only the connected PSP database;
- recognize expected PSP baseline/member-mobile states;
- fail closed on unknown or partial baseline/member-mobile schema;
- use explicit reviewed additive SQL for r14 certificate/public-announcement upgrade;
- never use `--accept-data-loss`;
- preserve existing certificate and announcement records;
- keep baseline/System Admin, finance permission and Digital ID synchronization idempotent;
- stop publication on any initializer failure.

Before any future non-additive production schema change, require a verified backup and reviewed migration/recovery plan.

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

After Hostinger publishes the hotfix, Production Smoke must first observe:

```text
release = 2026-09-06-r14
deploymentGeneration = 2026-09-06-platform-hardening-v1
```

Then require:

- `/api/health/ready` database/auth/baseline/member-mobile/custom-certificate/public-announcement/auth-config checks;
- public homepage global-feed marker;
- stable manifest `id: "/"`;
- registration/install/login release markers;
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

- [x] r14 implementation exact-head/post-merge CI proven
- [x] Hostinger Git integration proven to receive `main` pushes
- [x] exact Hostinger build failure identified
- [x] safe non-destructive r14 schema-upgrade hotfix implemented
- [x] production-only additive-upgrade CI regression added and passed on hotfix code head
- [x] 3 high npm findings identified as `deepmerge-ts` advisory chain
- [x] patched `deepmerge-ts` override applied
- [x] complete high/critical dependency audit gate added and passed on hotfix code head
- [x] runtime-only production dependency audit passed on hotfix code head
- [ ] PR #37 final documentation-bearing head passes all CI gates
- [ ] PR #37 exact passing head merged
- [ ] Hostinger build/deploy completes on resulting `main`
- [ ] Production Smoke passes exact r14 readiness/public/PWA/security gates
- [ ] controlled production Admin/Member workflow acceptance
- [ ] real recipient email delivery/rendering
- [ ] Android/iOS physical PWA smoke
- [ ] passkey physical-device smoke
- [ ] second-device Digital ID/Certificate QR acceptance
- [ ] PayMongo Platforms real TEST split-payment/provider-webhook acceptance
- [ ] MySQL backup/restore evidence
- [ ] controlled low-value PayMongo LIVE validation after explicit approval

See `STATUS.md`, `PSP_PLATFORM_HARDENING_2026-09-06.md`, `PAYMENTS.md`, and `MEMBER_MOBILE_P0.md`.
