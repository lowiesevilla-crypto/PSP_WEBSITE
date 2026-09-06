# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Current main SHA:** `3701313f371b473df8400ed7404359fb6a5ccf72`  
**Target release identity:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> Read with `../AGENTS.md`. Never claim provider-, credential-, device-, inbox-, payment-, backup-, or production-state behavior without direct evidence.

## Executive Status

PSP r14 platform hardening is **MERGED AND POST-MERGE CI PROVEN, BUT NOT YET PRODUCTION-PROVEN**.

Release evidence:

- PR #34 final exact head: `6a4fbe1552fdcd857363b12975f34c25f0c7b954`.
- PSP CI #572 / run `34004473069`: **PASSED** on that exact PR head.
- No unresolved review threads were present at merge time.
- PR #34 merged only with the exact expected head.
- Merge/main SHA: `3701313f371b473df8400ed7404359fb6a5ccf72`.
- Post-merge PSP CI #573 / run `34005600398`: **PASSED every required gate**.

Production evidence is still open:

1. Production Smoke run #25 / run `34005600559`, attempt 1 reached `https://psp.hoahub.tech/api/health` on all 40 probes with HTTP 200, but the live service remained on `2026-09-05-r13 / 2026-09-05-release-keyed-pwa-install-v1` for the full deployment window. This proves the repository merge had not yet been published by Hostinger.
2. Production Smoke attempt 2 against the same `main` SHA failed at the same exact-release gate because the GitHub runner timed out on all 40 health requests. DNS still resolved. This is reachability/hosting evidence, not an application assertion failure.
3. A further exact-smoke retry has been triggered against the same merge SHA. Until exact r14 health identity is observed, the later readiness/public/PWA/security assertions are not allowed to count as passed.

Therefore the last directly observed live application identity remains **r13**. Do not report r14 as deployed or production-complete until Production Smoke reaches and passes the r14 readiness/public/PWA/security gates.

## r14 Completed Implementation Scope

### Payment / Finance

- Chapter PayMongo linked-account setup can be saved as a disabled `DRAFT` without requiring PSP parent-platform readiness or creating a child webhook.
- Draft configuration does not make a Chapter payable.
- Activation remains fail-closed and requires parent platform, convenience fee, matching mode, valid unique linked child account, real child webhook readiness, and LIVE gate where applicable.
- Explicit setup states: `NOT_CONFIGURED`, `DRAFT`, `READY`, `ENABLED`, `BLOCKED`.
- Member payment UI blocks fee preview/checkout when Chapter online payment is unavailable.
- Finance summaries use complete authorized payment history rather than the latest 200 records.
- Payments, balances, rates and assessments use searchable/paginated responsive registers.

### Member / User / Chapter / Organization Administration

- Member Directory/Members no longer has a fixed 100-record cap.
- National/Chapter Admin can edit approved member profile/contact fields only within authorized scope.
- Membership number, login identity and Chapter transfer remain separately controlled.
- Users, Chapters, Organization, Finance and Certificate registers follow the responsive PSP Table Standard.

### Public Website / Privacy

- Public homepage can aggregate intentionally public Chapter/National announcements and published events.
- `Announcement.isPublic` defaults false; anonymous homepage query requires `isPublic=true`.
- Admin UI distinguishes `PUBLIC WEBSITE` from `MEMBERS ONLY`.
- Protected announcement images remain authenticated/private.

### Custom Certificates

- Supports Membership, Attendance, Appreciation, Recognition, Outstanding Member and Custom certificate types.
- Admin issuance supports one, multiple or all eligible in-scope active recipients.
- Batch+member uniqueness prevents duplicate retry issuance.
- Chairman signatory, certificate metadata and verification identity are snapshotted.
- Members can see/download valid assigned certificates; public QR verification renders actual certificate metadata.

### Member UX / PWA

- Member dashboard is payment-first with balance, Pay/View Dues, receipts, online-payment readiness/methods, contributions, Digital ID, certificates, Chapter and security actions prioritized.
- Stable PWA manifest identity remains `id: "/"`.
- r14 changes deployment generation only; it does not create a second PWA identity.

## r14 Automated Evidence

Both exact-head PR CI and post-merge `main` CI prove:

- Prisma validation/client generation/schema apply;
- baseline seed and System Admin bootstrap;
- cross-Chapter and platform-hardening fixtures;
- ESLint;
- hardening source contracts + TypeScript;
- production build;
- runtime security/PWA/isolation/hardening smoke;
- production dependency audit.

Runtime hardening specifically proves:

- own-vs-foreign Chapter member editing and audit evidence;
- own Draft PayMongo save while parent platform is unavailable;
- blocked activation preserving `isEnabled=false`;
- foreign Chapter payment config denial;
- foreign Chapter certificate issuance denial;
- successful custom certificate issue/PDF/public QR verification;
- explicit public announcement persistence;
- public announcement/event homepage visibility in CI;
- private announcement non-leakage;
- existing cross-Chapter application/media/finance/invitation/archive protections remain green.

## Production Validation State

Production release closure requires all of these on the exact intended r14 deployment:

1. `/api/health` reports `2026-09-06-r14` and `2026-09-06-platform-hardening-v1`.
2. `/api/health/ready` returns ready with database, auth schema, baseline, member-mobile schema, custom-certificate schema, public-announcement schema and auth configuration OK.
3. Public homepage exposes the r14 public-feed marker.
4. Registration/PWA/login release markers and stable manifest identity pass.
5. Production security headers pass.
6. Canonical-origin invalid login returns 401 and cross-site login is rejected 403.
7. Public member/certificate verification routes do not return application 500.

Until step 1 is true, steps 2–7 are not considered production-tested for r14.

## Pending — Controlled / External Acceptance

These remain open even after automated r14 deployment unless directly evidenced:

- Hostinger publishes exact r14 and Production Smoke passes;
- real PayMongo Platforms TEST DUES/CONTRIBUTION/OTHER split-payment E2E;
- real child webhook delivery/signature and settlement observation;
- invalid-signature/duplicate/cross-Chapter behavior against the actual PayMongo provider;
- controlled LIVE payment only after TEST signoff and explicit product-owner approval;
- physical Android installed-PWA acceptance;
- physical iPhone/iPad Add-to-Home-Screen acceptance;
- real passkey device acceptance;
- actual production recipient email receipt/rendering;
- second-device Digital Member ID / Certificate QR acceptance where required;
- database backup/restore drill;
- controlled production credential/state-changing workflow acceptance and bootstrap cleanup/rotation where required.

`PAYMONGO_LIVE_ENABLED` must remain false until the controlled TEST gate is signed off.

## Documentation

Detailed r14 tracker: `PSP_PLATFORM_HARDENING_2026-09-06.md`  
Deployment runbook: `DEPLOYMENT.md`  
Payment architecture: `PAYMENTS.md`  
UI/UX standard: `UI_UX.md`  
Mandatory engineering rules: `../AGENTS.md`

A requirement is `COMPLETE` only when the evidence required for that class of requirement exists. Automated CI closes source/runtime contracts; it does not fabricate deployment, provider, device, inbox, backup or live production evidence.
