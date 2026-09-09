# Hostinger Production Deployment Runbook

## Production Target

- Application: Psi Sigma Phi Philippines Inc. Digital Membership Platform
- Repository: `lowiesevilla-crypto/PSP_WEBSITE`
- Hosting: Hostinger managed Next.js / Node.js
- Canonical URL: `https://psp.hoahub.tech`
- Production branch: `main`
- Runtime: Node.js 22+
- Database: dedicated PSP MySQL, separate from HOAHub
- Release target: `2026-09-09-r17 / 2026-09-09-finance-bills-public-feed-v1`

## Current Production State — 2026-09-09

Production is currently behind the repository release line. After PR #48 merged and PSP CI #690 passed on `main`, both r15 production-smoke reruns still observed:

```text
release = 2026-09-06-r14
deploymentGeneration = 2026-09-06-platform-hardening-v1
```

That means production cannot be called r15/r16-proven until Hostinger builds/deploys the current `main` head and the exact production smokes pass unchanged.

## Hostinger Build Incident — Closed

Hostinger receives `main` pushes correctly. The earlier r14 deployment failures occurred inside:

```text
npm run build
-> node scripts/production-build-init.mjs && next build
```

Prisma refused adding the new `Certificate(batchId, memberId)` unique constraint unless `--accept-data-loss` was supplied. That flag remains prohibited.

PR #37 replaced the r14 certificate/public-announcement upgrade with reviewed additive SQL:

- add missing certificate metadata columns only;
- backfill legacy `certificateDate` from `issuedAt` before enforcing NOT NULL/default;
- add nullable `batchId` without rewriting legacy rows;
- check duplicate non-null `(batchId, memberId)` pairs before unique-index creation and fail closed if any exist;
- add certificate indexes only when absent;
- add `Announcement.isPublic` as `NOT NULL DEFAULT 0`, preserving legacy announcements as private;
- add its index only when absent.

CI permanently reproduces this production-only upgrade path with `APP_ENV=production` and then requires Prisma schema synchronization without `--accept-data-loss`.

## Dependency Security

The prior `3 high severity vulnerabilities` were one chain:

```text
prisma@6.19.3 -> @prisma/config -> deepmerge-ts < 8.0.0
```

Advisory `GHSA-ggr8-5vv4-36mx` is remediated by the reviewed npm override `deepmerge-ts=8.0.1`. `npm audit fix --force` is prohibited for this incident because it proposed an unreviewed breaking Prisma downgrade.

CI now blocks merge on both:

- complete `npm audit --audit-level=high`;
- post-prune runtime-only dependency audit.

The earlier public-homepage hardening additionally upgraded Next.js and `eslint-config-next` from `16.3.1` to security release `16.3.3`. The full CI/runtime/audit suite must continue proving that dependency/security posture before merge.

The r16 PR also updates `nodemailer` to `9.1.1` after the unchanged CI audit gate reported high-severity advisories for `nodemailer <=9.1.0`. Do not bypass the audit or use `npm audit fix --force`; the patched direct dependency must pass the normal install/audit/runtime flow.

## Public Homepage Freshness Contract

The public homepage contains live National/Chapter announcements and published events. It must not be served as stale deployment HTML.

The public homepage hardening enforces:

```text
dynamic = force-dynamic
revalidate = 0
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0
Pragma: no-cache
Expires: 0
```

Production Smoke must fetch normal `/` without a cache-busting query, require `Cache-Control` to contain `no-store`, and then require the current public-feed marker. This validates the behavior real visitors receive rather than bypassing the cache in the test.

If the first deployment containing this policy still serves the pre-existing cached object, perform a one-time Hostinger server/CDN cache purge and rerun Production Smoke unchanged. Do not remove or weaken the homepage assertion.

## Hostinger Application Setup

```text
Repository: lowiesevilla-crypto/PSP_WEBSITE
Branch: main
Node.js: 22 or later compatible LTS
Build command: npm run build
Start command: npm run start
Canonical URL: https://psp.hoahub.tech
```

Never add `--accept-data-loss` to Hostinger commands or environment settings.

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

## Production Closure Smoke

After the r16 exact-head CI and merge, require all of the following on the resulting `main`:

1. exact r16 `/api/health` release/generation;
2. `/api/health/ready` returns ready with all required schema/auth/baseline checks `ok`;
3. normal `/` returns `Cache-Control` containing `no-store`;
4. normal `/` contains the r16 public-feed marker;
5. manifest stable `id: "/"` and registration/install/login PWA markers pass;
6. production security headers pass;
7. canonical invalid login returns 401 and cross-site login is rejected 403;
8. public Digital ID/Certificate verification routes do not return application 500.

## PayMongo / Controlled Acceptance

`PAYMONGO_LIVE_ENABLED` remains false until real TEST acceptance is complete. Real provider split-payment, child webhook/signature/settlement, LIVE payment, recipient email, physical Android/iOS PWA, passkey, second-device QR, backup/restore and controlled state-changing production tests remain external evidence gates.

## Current Release Checklist

- [x] r14 implementation CI-proven and merged
- [x] Hostinger safe schema upgrade deployed
- [x] exact r14 health visible in production
- [x] production readiness/schema/auth checks green
- [x] 3 high npm findings remediated and permanently gated
- [ ] r16 exact final head fully green
- [ ] r16 exact passing head merged
- [ ] normal production `/` proves no-store freshness + r16 public-feed marker
- [ ] remaining PWA/security/auth/public-verification Production Smoke steps pass
- [ ] controlled external acceptance items complete where required

See `STATUS.md`, `PSP_PLATFORM_HARDENING_2026-09-06.md`, `PAYMENTS.md`, and `MEMBER_MOBILE_P0.md`.
