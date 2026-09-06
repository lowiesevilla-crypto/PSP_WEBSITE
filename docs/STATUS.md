# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Target release identity:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> Read with `../AGENTS.md`. Never claim provider-, credential-, device-, inbox-, payment-, backup-, or production-state behavior without direct evidence.

## Executive Status

PSP r14 platform hardening is **IMPLEMENTED AND CI-PROVEN, WITH A PRODUCTION-BUILD HOTFIX IN PR #37**. Production remains on r13 until the hotfix is merged, Hostinger completes the production build, and exact r14 Production Smoke passes.

Application/repository evidence:

- PR #34 final exact head `6a4fbe1552fdcd857363b12975f34c25f0c7b954` passed PSP CI #572 and merged.
- Implementation merge SHA `3701313f371b473df8400ed7404359fb6a5ccf72` passed post-merge PSP CI #573.
- Documentation reconciliation PRs #35 and #36 passed their exact-head CI gates and merged.
- Current pre-hotfix `main` SHA is `b0eeb9ae8a1b6776a2fcd7858d458207d5e1de44`.
- Production Smoke against r14 repeatedly proved production remained on r13.

## Definitive Hostinger Root Cause

Hostinger Git integration is **working**: its deployment history received the expected `main` commits, including `3701313f`, `38b9a2ed`, and `b0eeb9ae`. The r14-era deployments failed during the Hostinger build, so the previous successful r13 deployment remained current.

The Hostinger build log identified the exact failure:

```text
> node scripts/production-build-init.mjs && next build
Checking PSP production database schema before build...
Existing member-mobile PSP schema detected.
Applying reviewed additive custom-certificate metadata columns.
...
A unique constraint covering [batchId,memberId] on Certificate will be added.
Error: Use the --accept-data-loss flag to ignore the data loss warnings
ERROR: Failed to build the application
```

The application intentionally refuses `--accept-data-loss`. The failure occurred because the r14 production initializer delegated the additive certificate upgrade to `prisma db push`, and Prisma correctly required explicit acknowledgement before adding the new uniqueness constraint.

## PR #37 Production-Safe Fix

PR #37 — `fix: make r14 Hostinger schema upgrade non-destructive` — replaces that r14 production path with an explicit reviewed additive upgrade:

- no `--accept-data-loss`;
- add certificate metadata columns only when absent;
- backfill legacy `certificateDate` from immutable `issuedAt` before enforcing NOT NULL/default;
- add nullable `batchId` without rewriting existing certificates;
- audit duplicate non-null `(batchId, memberId)` pairs before creating the uniqueness constraint;
- fail closed if duplicates exist rather than deleting/changing certificate records;
- add certificate type/date indexes only when absent;
- add `Announcement.isPublic` as `NOT NULL DEFAULT 0`, preserving legacy announcements as private;
- add the public-announcement index only when absent;
- retain existing member-mobile baseline safety and production initialization/backfill logic.

A new CI regression deliberately removes the r14 columns/indexes from a current CI database, runs `production-build-init.mjs` with `APP_ENV=production`, and then requires Prisma to confirm the resulting database is fully synchronized without `--accept-data-loss`.

On hotfix code head `1556c01794ed47938b625de77e14141ff9efa651`, PSP CI #593 passed the production additive schema regression, Prisma validate/generate/db push, lint, typecheck, production build, runtime/security smoke, and dependency audits.

## Dependency Security Remediation

The Hostinger install output also reported **3 high-severity vulnerabilities**. A new complete dependency-audit CI gate reproduced and identified them as one transitive advisory chain:

```text
prisma@6.19.3
  -> @prisma/config
     -> deepmerge-ts < 8.0.0
```

Advisory: `GHSA-ggr8-5vv4-36mx` — stack exhaustion when merging recursive object graphs.

The npm suggested `npm audit fix --force`, which would downgrade Prisma to 6.12.0. That breaking automatic change was rejected. PR #37 instead pins the patched transitive dependency through npm overrides:

```json
"overrides": {
  "deepmerge-ts": "8.0.1"
}
```

CI #593 proves:

- complete `npm audit --audit-level=high`: **PASS**;
- Prisma validate/generate/db push with the override: **PASS**;
- production additive schema regression: **PASS**;
- full application build/runtime suite: **PASS**;
- post-prune production/runtime dependency audit: **PASS**.

The full high/critical audit remains a permanent CI gate so future high/critical findings block merge before Hostinger deployment.

## r14 Completed Implementation Scope

### Payment / Finance

- Per-Chapter PayMongo linked-account setup supports safe disabled `DRAFT` staging before PSP parent-platform readiness.
- Draft save does not create a child webhook or make the Chapter payable.
- Activation remains fail-closed with parent platform, convenience fee, matching mode, unique child account, real webhook readiness and LIVE gate validation.
- Explicit states: `NOT_CONFIGURED`, `DRAFT`, `READY`, `ENABLED`, `BLOCKED`.
- Member payment UI blocks fee preview/checkout when Chapter online payment is unavailable.
- Finance summaries use complete authorized payment history rather than a latest-record cap.
- Payments, balances, rates and assessments use searchable/paginated responsive registers.

### Administration

- Member Directory/Members no longer has a fixed 100-record cap.
- National/Chapter Admin can edit approved member profile/contact fields only within authorized scope.
- Membership number, login identity and Chapter transfer remain separately controlled.
- Users, Chapters, Organization, Finance and Certificate registers follow the responsive PSP Table Standard.

### Public Website / Privacy

- Public homepage supports intentionally public Chapter/National announcements and published events.
- `Announcement.isPublic` defaults false; anonymous listing requires `isPublic=true`.
- Admin UI distinguishes `PUBLIC WEBSITE` from `MEMBERS ONLY`.
- Protected announcement images remain authenticated/private.

### Custom Certificates

- Membership, Attendance, Appreciation, Recognition, Outstanding Member and Custom certificate types.
- One/multiple/all eligible in-scope active recipient issuance.
- Batch+member retry idempotency.
- Chairman/certificate metadata snapshot.
- Member download and public QR verification with actual certificate metadata.

### Member UX / PWA

- Payment-first dashboard with balance, Pay/View Dues, receipts, payment readiness/methods, contributions, Digital ID, certificates, Chapter and security.
- Stable PWA manifest identity remains `id: "/"`; r14 changes deployment generation only.

## Production State and Closure Gate

The last directly proven production identity remains:

```text
release = 2026-09-05-r13
deploymentGeneration = 2026-09-05-release-keyed-pwa-install-v1
```

After PR #37 is merged and Hostinger builds latest `main`, Production Smoke must pass:

1. exact r14 `/api/health` release/generation;
2. `/api/health/ready` database/auth/baseline/member-mobile/custom-certificate/public-announcement/auth-config checks;
3. public homepage r14 global-feed marker;
4. registration/PWA/login release markers and stable manifest identity;
5. production security headers;
6. canonical invalid login 401 and cross-site login rejection 403;
7. public member/certificate verification routes without application 500.

If Hostinger fails again, inspect the exact new build log. Do not use `--accept-data-loss` and do not weaken Production Smoke.

## Controlled / External Pending

- merge PR #37 only on an exact fully passing head;
- Hostinger successful build/deploy of the resulting latest `main`;
- full exact-r14 Production Smoke;
- real PayMongo Platforms TEST DUES/CONTRIBUTION/OTHER split-payment E2E;
- real child webhook/signature and split settlement;
- provider invalid/duplicate/cross-Chapter webhook acceptance;
- controlled LIVE payment after TEST signoff + explicit owner approval;
- real recipient email delivery/rendering;
- physical Android/iOS PWA acceptance;
- real passkey device acceptance;
- second-device Digital ID/Certificate QR acceptance where required;
- database backup/restore drill;
- controlled production credential/state-changing acceptance and bootstrap cleanup/rotation where required.

`PAYMONGO_LIVE_ENABLED` remains false until controlled TEST acceptance is signed off.

Detailed tracker: `PSP_PLATFORM_HARDENING_2026-09-06.md`  
Deployment runbook: `DEPLOYMENT.md`  
Payment architecture: `PAYMENTS.md`  
UI/UX: `UI_UX.md`
