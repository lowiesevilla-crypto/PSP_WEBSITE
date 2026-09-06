# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-06 11:01 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Target release identity:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> Read with `../AGENTS.md`. Never claim provider-, credential-, device-, inbox-, payment-, backup-, or production-state behavior without direct evidence.

## Executive Status

PSP r14 platform hardening is **IMPLEMENTED, MERGED, AND POST-MERGE CI PROVEN, BUT NOT DEPLOYED/PROVEN IN PRODUCTION**.

Application/repository evidence:

- PR #34 final exact head: `6a4fbe1552fdcd857363b12975f34c25f0c7b954`.
- PSP CI #572 / run `34004473069`: **PASSED every required gate** on that exact PR head.
- No unresolved review threads were present at merge time.
- PR #34 merged only with the exact expected head.
- Implementation merge SHA: `3701313f371b473df8400ed7404359fb6a5ccf72`.
- Post-merge PSP CI #573 / run `34005600398`: **PASSED every required gate**.
- Production-evidence documentation PR #35 exact head `c677b1a7789884855f9aaa3b088f8398825d3f7e` passed PSP CI #578 and merged.
- Current documentation-bearing `main` SHA after PR #35: `38b9a2ed95300201bc0befa744c8611ac970037d`.
- Post-PR-#35 PSP CI #579 / run `34007514538`: **PASSED every required gate**.

## Definitive Production Finding

Production is **not serving r14**.

Fresh authoritative Production Smoke run #26 / run `34007514552` targeted the current `main` and exact r14 identity. From **2026-09-06 10:51 PHT through 11:01 PHT**, all 40 `/api/health` probes returned HTTP 200, so production was reachable and DNS/network were healthy from the GitHub runner. However the final live health payload still reported:

```json
{"status":"ok","service":"psi-sigma-phi-digital-platform","release":"2026-09-05-r13","deploymentGeneration":"2026-09-05-release-keyed-pwa-install-v1"}
```

Expected:

```text
release = 2026-09-06-r14
deploymentGeneration = 2026-09-06-platform-hardening-v1
```

Result: **FAILED at exact deployed release detection.** The later r14 readiness/public/PWA/security production assertions were correctly skipped because an older Hostinger build must never satisfy the r14 gate.

This is a **Hostinger deployment/Git-integration blocker, not an application CI defect**. The repository contains CI and Production Smoke workflows but no production-publish workflow; Hostinger owns publication of `main`.

Do not report the r14 changes as implemented correctly in production until Hostinger deploys the latest `main` and Production Smoke passes the exact r14 gates.

## r14 Completed Implementation Scope

### Payment / Finance

- Per-Chapter PayMongo linked-account setup supports safe disabled `DRAFT` staging before PSP parent-platform readiness.
- Draft save does not create a child webhook or make the Chapter payable.
- Activation remains fail-closed with parent platform, deliberate convenience fee, matching mode, unique child account, real webhook readiness and LIVE gate validation.
- Explicit states: `NOT_CONFIGURED`, `DRAFT`, `READY`, `ENABLED`, `BLOCKED`.
- Member payment UI blocks fee preview/checkout when Chapter online payment is unavailable.
- Finance summaries use complete authorized payment history rather than the latest 200 records.
- Payments, balances, rates and assessments use searchable/paginated responsive registers.

### Administration

- Member Directory/Members no longer has a fixed 100-record cap.
- National/Chapter Admin can edit approved member profile/contact fields only within authorized scope.
- Membership number, login identity and Chapter transfer remain controlled separately.
- Users, Chapters, Organization, Finance and Certificate registers follow the responsive PSP Table Standard.

### Public Website / Privacy

- Public homepage supports intentionally public Chapter/National announcements and published events.
- `Announcement.isPublic` defaults false; anonymous listing requires `isPublic=true`.
- Admin UI distinguishes `PUBLIC WEBSITE` from `MEMBERS ONLY`.
- Protected announcement images remain authenticated/private.

### Custom Certificates

- Membership, Attendance, Appreciation, Recognition, Outstanding Member and Custom types.
- One/multiple/all eligible in-scope active recipient issuance.
- Batch+member retry idempotency.
- Chairman/certificate metadata snapshot.
- Member download and public QR verification with actual certificate metadata.

### Member UX / PWA

- Payment-first dashboard with balance, Pay/View Dues, receipts, payment readiness/methods, contributions, Digital ID, certificates, Chapter and security.
- Stable PWA manifest identity remains `id: "/"`; r14 changes deployment generation only.

## Automated Runtime Evidence

Exact-head and post-merge CI prove:

- Prisma/schema/bootstrap contracts;
- lint/typecheck/production build;
- runtime security/PWA/isolation tests;
- production dependency audit;
- own-vs-foreign member editing and audit;
- PayMongo Draft save and blocked activation preserving `isEnabled=false`;
- foreign Chapter payment config and certificate denial;
- successful custom certificate issue/PDF/public QR verification;
- public announcement/event CI visibility and private-announcement non-leakage.

## Production Closure Gate

After Hostinger publishes latest `main`, Production Smoke must pass:

1. exact r14 `/api/health` release/generation;
2. `/api/health/ready` database/auth/baseline/member-mobile/custom-certificate/public-announcement/auth-config checks;
3. public homepage r14 global-feed marker;
4. registration/PWA/login release markers and stable manifest identity;
5. production security headers;
6. canonical invalid login 401 and cross-site login rejection 403;
7. public member/certificate verification routes without application 500.

## Immediate Pending Action

**Hosting-side redeploy / Git-integration repair is required.** Hostinger must deploy the latest `main` rather than continuing to serve the r13 build. Do not patch known-good application code merely to force a deployment.

After the hosting-side deployment is corrected, rerun `PSP Production Smoke` unchanged. If a later application assertion fails after exact r14 becomes visible, fix that exact failure in a new PR and again merge only an exact passing head.

## Controlled / External Pending

- Hostinger exact r14 deployment + full Production Smoke;
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
