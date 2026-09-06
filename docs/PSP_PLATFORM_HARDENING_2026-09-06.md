# PSP Website — Urgent Platform Hardening, UI/UX, Finance & Certificate Program

**Requested:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production:** `https://psp.hoahub.tech`  
**PR:** #34 — merged  
**Final PR head:** `6a4fbe1552fdcd857363b12975f34c25f0c7b954`  
**Merge/main SHA:** `3701313f371b473df8400ed7404359fb6a5ccf72`  
**Target release:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> `COMPLETE (AUTOMATED)` means implementation plus required CI/runtime evidence exists. `PRODUCTION-PROVEN` requires the exact live r14 generation to pass Production Smoke. Provider/device/state-changing facts remain external until directly observed.

## Requirement Matrix

| ID | Priority | Requirement | Evidence status |
| --- | --- | --- | --- |
| PSP-HARD-001 | P0 | Safe per-Chapter PayMongo setup before parent readiness | **COMPLETE (AUTOMATED)** — Draft save, exact Chapter scope, no real webhook, blocked activation preserving `isEnabled=false` proven |
| PSP-HARD-002 | P0 | Real PayMongo Platforms split settlement per Chapter | **PENDING CONTROLLED PAYMONGO ACCEPTANCE** — real TEST DUES/CONTRIBUTION/OTHER + child webhook/settlement not observed |
| PSP-HARD-003 | P0 | Finance configurable per Chapter + National authorized visibility | **COMPLETE (AUTOMATED)** — complete-history summaries, rates/assessments/config, responsive registers and isolation green |
| PSP-HARD-004 | P0 | National/Chapter Admin edit member information within scope | **COMPLETE (AUTOMATED)** — own edit + audit passed; cross-Chapter edit denied; protected fields remain controlled |
| PSP-HARD-005 | P0 | Public homepage safe updates/events across Chapters | **COMPLETE (AUTOMATED)** — public announcement/event inclusion and private-announcement non-leak proven in runtime CI |
| PSP-HARD-006 | P1 | Custom certificates for one/multiple/all recipients | **COMPLETE (AUTOMATED)** — scope denial, issuance, metadata, PDF and public QR verification passed |
| PSP-HARD-007 | P1 | Searchable/paginated responsive Admin table standard | **COMPLETE (AUTOMATED)** — Members, Users, Chapters, Organization, Finance and Certificates converted; lint/typecheck/build green |
| PSP-HARD-008 | P1 | Professional Member dashboard/payment UX | **COMPLETE (AUTOMATED)** — payment-first hierarchy/readiness/disabled checkout implemented; physical device acceptance external |
| PSP-HARD-009 | P1 | Complete per-Chapter setup/config workflow | **COMPLETE (APPLICATION)** — lifecycle/admin/branding/organization/finance/payment setup scoped and navigable; real PayMongo activation remains under HARD-002 |
| PSP-HARD-010 | P1 | PWA/mobile-responsive regression | **COMPLETE (AUTOMATED)** — PWA/auth/security/runtime contracts green; physical Android/iOS remains external |
| PSP-HARD-011 | P1 | Status/architecture/payment/UI documentation reconciliation | **COMPLETE FOR MERGED IMPLEMENTATION; LIVE EVIDENCE OPEN** — docs reconciled to merge/post-merge CI and production deployment blocker |
| PSP-HARD-012 | P0 Release | Exact r14 production deployment and smoke | **BLOCKED EXTERNALLY** — first live smoke observed r13 for full window; second retry had 40/40 runner timeouts; third exact retry initiated |

## Implemented Application Contract

### PayMongo Chapter Configuration

States: `NOT_CONFIGURED`, `DRAFT`, `READY`, `ENABLED`, `BLOCKED`.

Draft behavior:

- saves authorized linked `org_*`, mode and methods while disabled;
- does not require the PSP parent platform;
- does not call PayMongo or create a child webhook;
- stores only an internal staged marker where needed;
- remains non-payable.

Activation requires parent platform/account, deliberate convenience fee, matching mode, unique child account, real child webhook signing readiness, allowed methods and the LIVE global gate when applicable. Failed activation leaves the saved Draft disabled.

### Finance

- effective-dated Chapter rates preserve history;
- posted assessments remain historical;
- member balance is ledger-derived;
- Finance summaries no longer use only the latest 200 payments;
- Payments/Balances/Rates/Assessments are searchable and paginated;
- Chapter amount, PSP platform fee and gross total remain distinct;
- National visibility and Chapter isolation are server-authorized.

### Admin Member Editing

Generic Admin edit validates approved profile/contact fields server-side and does not silently change membership number, login identity or Chapter. Chapter transfer and archive remain audited separate workflows.

### Public Content Privacy

- `Announcement.isPublic` defaults false;
- anonymous homepage announcement query requires `isPublic=true`;
- Admin explicitly opts into public website publication;
- protected images remain member-authenticated;
- events require their existing published lifecycle state.

### Custom Certificates

Supported types: Membership, Attendance, Appreciation, Recognition, Outstanding Member and Custom. Admin may issue to one, multiple or all eligible in-scope active recipients. One immutable recipient record/token is created per issue; batch+member uniqueness protects retry idempotency. Chairman and certificate metadata are snapshotted. Member PDF and public QR verification render the actual certificate metadata.

### Admin Table / Mobile Standard

Member Directory/Members, Users, Chapters, Organization, Finance and Certificate registers use server pagination, search/filter URL state, result/page counts, semantic tables and below-768px labeled row-to-record-card transformation.

### Member Dashboard / PWA

Member home prioritizes outstanding balance, Pay/View Dues, payment readiness/methods, receipts, confirmed contributions, Digital ID, certificates, Chapter and security. Stable manifest `id: "/"` remains unchanged; r14 changes deployment generation only.

## Automated Release Evidence

### Exact PR head

- final head: `6a4fbe1552fdcd857363b12975f34c25f0c7b954`
- PSP CI #572 / run `34004473069`: **PASSED every gate**
- unresolved review threads: none
- merged using exact expected head only

### Post-merge main

- merge/main SHA: `3701313f371b473df8400ed7404359fb6a5ccf72`
- PSP CI #573 / run `34005600398`: **PASSED every gate**

Gates include secret/security config scans, Prisma validate/generate/schema apply, seed/bootstrap, cross-Chapter fixtures, platform-hardening fixtures, ESLint, hardening source contracts, TypeScript, production build, runtime security/PWA/isolation/hardening smoke, and production dependency audit enforcement.

Runtime CI proves own-vs-foreign member editing, PayMongo Draft/blocked activation, foreign payment/certificate denial, successful custom certificate PDF/public verification, explicit-public announcement persistence, public-feed inclusion, private-announcement non-leakage and existing isolation/security/PWA contracts.

## Production Validation Evidence

Production Smoke run #25 targets exact `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`.

### Attempt 1

- production endpoint reachable: **40/40 probes HTTP 200**;
- DNS/network healthy from runner;
- last live health payload still reported `2026-09-05-r13 / 2026-09-05-release-keyed-pwa-install-v1`;
- result: **FAIL — Hostinger had not published r14**;
- later readiness/public/PWA/security assertions correctly skipped.

### Attempt 2

- exact same merge SHA and unchanged smoke criteria;
- all 40 runner probes timed out with HTTP `000` while DNS resolved;
- result: **FAIL — external reachability/hosting gate**;
- no r14 application assertion executed.

### Attempt 3

- triggered against the same merge SHA with unchanged exact-release criteria;
- current outcome must be recorded before r14 is called production-proven.

This evidence means the merged implementation is correct under exact-head and post-merge runtime CI, but **correct production deployment is not yet proven**. The last directly observed live application identity remains r13.

## Production Acceptance Required for Closure

Production Smoke must reach exact r14 and then pass:

1. `/api/health` exact release/generation;
2. `/api/health/ready` database/auth/baseline/member-mobile/custom-certificate/public-announcement/auth-config checks;
3. public homepage r14 global-feed marker;
4. PWA manifest/install/registration/login release markers;
5. security headers;
6. canonical login 401 and cross-site rejection 403;
7. public member/certificate verification routes without application 500.

## Controlled / External Pending

- Hostinger exact r14 publish + full Production Smoke;
- real PayMongo Platforms TEST DUES split payment;
- real TEST CONTRIBUTION payment;
- real TEST OTHER payment;
- real child webhook/signature and split settlement;
- provider invalid/duplicate/cross-Chapter webhook acceptance;
- controlled LIVE payment after TEST signoff + explicit owner approval;
- actual recipient email receipt/rendering;
- physical Android installed PWA;
- physical iPhone/iPad Add-to-Home-Screen;
- real passkey device acceptance;
- second-device Digital ID / Certificate QR acceptance where required;
- database backup/restore drill;
- controlled production credential/state-changing acceptance and bootstrap cleanup/rotation where required.

`PAYMONGO_LIVE_ENABLED` remains false until controlled TEST acceptance is signed off.
