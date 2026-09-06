# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Target release identity:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> Read with `../AGENTS.md`. Never claim provider-, credential-, device-, inbox-, payment-, backup-, or production-state behavior without direct evidence.

## Executive Status

PSP r14 is **DEPLOYED AND DATABASE/READINESS PROVEN**, but full production closure is still open because Production Smoke #28 found the public homepage serving stale pre-r14 HTML. PR #38 is the active cache/security hotfix.

## Proven Release Evidence

- Implementation PR #34 exact head `6a4fbe1552fdcd857363b12975f34c25f0c7b954` passed PSP CI #572 and merged.
- Implementation merge SHA `3701313f371b473df8400ed7404359fb6a5ccf72` passed post-merge PSP CI #573.
- Production-build hotfix PR #37 exact final head `c7b2e9f9a22cf36e107d94069f020f17214bf640` passed both push/PR CI, including production-only schema-upgrade regression and dependency security gates.
- PR #37 merged only on that exact head; merge SHA `d2795c8d33f5e109fabd87bd8d1122b4e6586549`.
- Post-merge PSP CI #601 passed every required gate on `d2795c8d...`.

## Production Build / Schema Incident — Closed

Hostinger correctly received the r14 `main` commits but initially failed during `npm run build`. The exact cause was Prisma refusing the new `Certificate(batchId, memberId)` unique constraint unless `--accept-data-loss` was supplied.

The platform deliberately does **not** use `--accept-data-loss`. PR #37 replaced the r14 certificate/public-announcement production upgrade with reviewed additive SQL:

- add only missing certificate metadata columns;
- backfill legacy `certificateDate` from `issuedAt` before NOT NULL enforcement;
- add nullable `batchId` without rewriting legacy certificates;
- fail closed if duplicate non-null `(batchId, memberId)` rows exist;
- create certificate indexes only when safe/absent;
- add `Announcement.isPublic` as `NOT NULL DEFAULT 0`, preserving legacy announcements as private;
- retain the existing member-mobile/baseline fail-closed checks.

CI now reproduces this production-only upgrade path with `APP_ENV=production` before merge.

## Dependency Security — 3 High Findings Closed

The Hostinger install warning was reproduced in CI and traced to one advisory chain:

```text
prisma@6.19.3 -> @prisma/config -> deepmerge-ts < 8.0.0
```

Advisory: `GHSA-ggr8-5vv4-36mx`.

`npm audit fix --force` was rejected because it proposed a breaking Prisma downgrade. The reviewed fix pins patched `deepmerge-ts` `8.0.1` via npm overrides.

Permanent release gates now include:

- complete `npm audit --audit-level=high` before build;
- post-prune runtime-only dependency audit;
- Prisma validate/generate/db push;
- production-only additive schema regression;
- lint/typecheck/build/runtime/security smoke.

PR #37 exact-head and post-merge CI passed these gates.

## Exact r14 Production Evidence

Production Smoke #28 observed exact r14 at **2026-09-06T07:16:09Z**:

```json
{"status":"ok","service":"psi-sigma-phi-digital-platform","release":"2026-09-06-r14","deploymentGeneration":"2026-09-06-platform-hardening-v1"}
```

Readiness then returned HTTP 200 / `status=ready` with:

- database `ok`;
- auth schema `ok`;
- baseline `ok`;
- member-mobile schema `ok`;
- custom-certificate schema `ok`;
- public-announcement schema `ok`;
- auth configuration `ok`;
- SMTP configured;
- PayMongo platform not configured;
- PayMongo LIVE disabled.

This proves the Hostinger build/schema fix succeeded and r14 backend/readiness is live.

## Remaining Production Defect — Public Homepage Cache

Production Smoke #28 then failed at `Verify PSP public pages and PWA assets` because normal `/` returned stale pre-r14 HTML even though `/api/health` and `/api/health/ready` were r14.

The stale response lacked:

```text
data-public-chapter-feed-version="global-chapter-feed-v1"
```

Current source already contains that marker and uses `dynamic = "force-dynamic"`, so the failure is a response/cache freshness issue rather than missing homepage implementation.

PR #38 adds:

- `revalidate = 0` for the public homepage;
- explicit `/` response `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0`;
- `Pragma: no-cache` / `Expires: 0`;
- Production Smoke requirement that the real `/` response itself advertises `no-store` before the public-feed marker can pass.

The smoke test is not cache-busted or weakened: normal `/` must be fresh for real users.

## Next.js Security Patch

PR #38 also upgrades `next` and `eslint-config-next` from `16.3.1` to `16.3.3`, the August 2026 Active-LTS security release. The existing `deepmerge-ts` override and both dependency-audit gates remain mandatory.

## r14 Completed Application Scope

Automated implementation remains complete for:

- per-Chapter PayMongo Draft/activation fail-closed workflow;
- complete authorized finance summaries and responsive registers;
- scoped Admin member editing;
- public Chapter/National announcement and published-event feed with private-announcement non-leakage;
- custom certificate issuance/PDF/public QR verification;
- searchable/paginated responsive Admin tables;
- payment-first Member dashboard and PWA/security contracts.

## Immediate Release Sequence

1. PR #38 final documentation-bearing head must pass all CI gates.
2. Merge only that exact passing head with no unresolved review threads.
3. Verify post-merge `main` CI.
4. Verify Hostinger deploys resulting `main`.
5. Production Smoke must pass exact r14 health/readiness, fresh homepage/public-feed marker, PWA assets, security headers, canonical/cross-site auth behavior, and public verification routes.
6. If normal `/` remains an old cached object after the code fix, purge the Hostinger server/CDN cache once and rerun Production Smoke unchanged.

## Controlled / External Pending

Even after automated production closure, these remain external until directly evidenced:

- real PayMongo Platforms TEST DUES/CONTRIBUTION/OTHER split-payment E2E;
- real child webhook/signature and split settlement;
- provider invalid/duplicate/cross-Chapter webhook acceptance;
- controlled LIVE payment after TEST signoff and explicit product-owner approval;
- real recipient email receipt/rendering;
- physical Android/iOS installed-PWA acceptance;
- real passkey-device acceptance;
- second-device Digital ID / Certificate QR acceptance where required;
- database backup/restore drill;
- controlled production credential/state-changing acceptance and bootstrap cleanup/rotation where required.

`PAYMONGO_LIVE_ENABLED` remains false until controlled TEST acceptance is signed off.

Detailed tracker: `PSP_PLATFORM_HARDENING_2026-09-06.md`  
Deployment runbook: `DEPLOYMENT.md`  
Payment architecture: `PAYMENTS.md`  
UI/UX: `UI_UX.md`
