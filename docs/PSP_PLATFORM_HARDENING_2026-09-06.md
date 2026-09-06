# PSP Website — Urgent Platform Hardening, UI/UX, Finance & Certificate Program

**Requested:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production:** `https://psp.hoahub.tech`  
**Implementation PR:** #34 — merged  
**Final PR head:** `6a4fbe1552fdcd857363b12975f34c25f0c7b954`  
**Implementation merge SHA:** `3701313f371b473df8400ed7404359fb6a5ccf72`  
**Target release:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> `COMPLETE (AUTOMATED)` means implementation plus required CI/runtime evidence exists. `PRODUCTION-PROVEN` requires the exact live r14 generation to pass Production Smoke.

## Requirement Matrix

| ID | Priority | Requirement | Evidence status |
| --- | --- | --- | --- |
| PSP-HARD-001 | P0 | Safe per-Chapter PayMongo setup before parent readiness | **COMPLETE (AUTOMATED)** |
| PSP-HARD-002 | P0 | Real PayMongo Platforms split settlement per Chapter | **PENDING CONTROLLED PAYMONGO ACCEPTANCE** |
| PSP-HARD-003 | P0 | Finance configurable per Chapter + National authorized visibility | **COMPLETE (AUTOMATED)** |
| PSP-HARD-004 | P0 | National/Chapter Admin edit member information within scope | **COMPLETE (AUTOMATED)** |
| PSP-HARD-005 | P0 | Public homepage safe updates/events across Chapters | **COMPLETE (AUTOMATED)** |
| PSP-HARD-006 | P1 | Custom certificates for one/multiple/all recipients | **COMPLETE (AUTOMATED)** |
| PSP-HARD-007 | P1 | Searchable/paginated responsive Admin table standard | **COMPLETE (AUTOMATED)** |
| PSP-HARD-008 | P1 | Professional Member dashboard/payment UX | **COMPLETE (AUTOMATED)**; physical-device acceptance external |
| PSP-HARD-009 | P1 | Complete per-Chapter setup/config workflow | **COMPLETE (APPLICATION)**; real PayMongo activation remains external |
| PSP-HARD-010 | P1 | PWA/mobile-responsive regression | **COMPLETE (AUTOMATED)**; physical Android/iOS external |
| PSP-HARD-011 | P1 | Documentation reconciliation | **COMPLETE FOR IMPLEMENTATION/CI; PRODUCTION BLOCKER RECORDED** |
| PSP-HARD-012 | P0 Release | Exact r14 production deployment and smoke | **BLOCKED — HOSTINGER STILL SERVES r13** |

## Implemented Application Contract

### PayMongo Chapter Configuration

States: `NOT_CONFIGURED`, `DRAFT`, `READY`, `ENABLED`, `BLOCKED`.

- Disabled Draft can be saved without PSP parent platform readiness.
- Draft does not call PayMongo, does not create a child webhook and remains non-payable.
- Activation requires parent platform/account, deliberate convenience fee, matching mode, unique child account, real webhook signing readiness, allowed methods and LIVE gate where applicable.
- Failed activation preserves `isEnabled=false`.

### Finance

- effective-dated Chapter rates preserve history;
- posted assessments retain historical amounts;
- member balance is ledger-derived;
- summaries are not restricted to the latest 200 payments;
- Payments/Balances/Rates/Assessments are searchable/paginated;
- Chapter amount, PSP platform fee and gross total remain distinct;
- National visibility and Chapter isolation are server-authorized.

### Admin Member Editing

Approved profile/contact fields are server-validated. Generic edit does not silently change membership number, login identity or Chapter. Transfer/archive remain audited separate workflows.

### Public Content Privacy

- `Announcement.isPublic` defaults false;
- anonymous announcement listing requires `isPublic=true`;
- Admin explicitly opts into public publication;
- protected images remain authenticated;
- events retain published lifecycle requirements.

### Custom Certificates

Supported types: Membership, Attendance, Appreciation, Recognition, Outstanding Member and Custom. Admin issuance supports one, multiple or all eligible in-scope recipients, batch+member idempotency, Chairman/metadata snapshot, member download and public QR verification.

### Admin Table / Mobile Standard

Members, Users, Chapters, Organization, Finance and Certificate registers use server pagination, search/filter state, result/page counts, semantic desktop tables and mobile labeled record-card transformation.

### Member Dashboard / PWA

Member home prioritizes balance, Pay/View Dues, payment readiness/methods, receipts, contributions, Digital ID, certificates, Chapter and security. Stable manifest `id: "/"` remains unchanged.

## Automated Release Evidence

### Implementation PR #34

- exact head `6a4fbe1552fdcd857363b12975f34c25f0c7b954`;
- PSP CI #572 / run `34004473069`: **PASSED every gate**;
- no unresolved review threads;
- merged with expected exact head only.

### Implementation post-merge

- merge SHA `3701313f371b473df8400ed7404359fb6a5ccf72`;
- PSP CI #573 / run `34005600398`: **PASSED every gate**.

### Documentation reconciliation PR #35

- exact head `c677b1a7789884855f9aaa3b088f8398825d3f7e`;
- PSP CI #578: **PASSED every gate**;
- merged;
- documentation-bearing main SHA `38b9a2ed95300201bc0befa744c8611ac970037d`;
- post-merge PSP CI #579 / run `34007514538`: **PASSED every gate**.

Automated gates cover Prisma/schema/bootstrap, lint/typecheck/build, cross-Chapter fixtures, platform-hardening fixtures, runtime security/PWA/isolation tests and production dependency audit.

Runtime hardening proves own-vs-foreign member editing, PayMongo Draft/blocked activation, foreign payment/certificate denial, successful custom certificate PDF/public verification, explicit-public announcement persistence, public-feed inclusion and private-announcement non-leakage.

## Definitive Production Validation

Fresh Production Smoke run #26 / run `34007514552` targeted current `main` and exact r14 identity.

From **10:51 PHT through 11:01 PHT on 2026-09-06**:

- all 40 `/api/health` probes returned HTTP 200;
- network-level failures: 0/40;
- production DNS resolved normally;
- the final health payload still reported `release=2026-09-05-r13` and `deploymentGeneration=2026-09-05-release-keyed-pwa-install-v1`.

Expected: `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`.

Result: **FAIL — exact r14 deployment never became visible.** Readiness/public/PWA/security r14 assertions were skipped by design because the older build cannot satisfy release acceptance.

Therefore:

- r14 implementation correctness is proven in exact-head and post-merge runtime CI;
- r14 production deployment correctness is **not** proven;
- the last directly observed live production identity is r13;
- Hostinger deployment/Git integration must be repaired or manually redeployed before further production application verification.

## Production Acceptance Required After Hosting Repair

Once Hostinger serves latest `main`, rerun Production Smoke unchanged and require:

1. exact r14 `/api/health` identity;
2. `/api/health/ready` database/auth/baseline/member-mobile/custom-certificate/public-announcement/auth-config checks;
3. public homepage global-feed marker;
4. PWA manifest/install/registration/login markers;
5. security headers;
6. canonical invalid login 401 and cross-site rejection 403;
7. public member/certificate verification routes without application 500.

If an application assertion then fails, fix that exact cause through a new PR and again merge only an exact passing head. Do not change application code simply to force Hostinger to publish.

## Controlled / External Pending

- Hostinger deploy latest `main` + full r14 Production Smoke;
- real PayMongo Platforms TEST DUES/CONTRIBUTION/OTHER split payments;
- real child webhook/signature and split settlement;
- provider invalid/duplicate/cross-Chapter webhook acceptance;
- controlled LIVE payment after TEST signoff + explicit owner approval;
- actual recipient email receipt/rendering;
- physical Android/iOS PWA acceptance;
- real passkey device acceptance;
- second-device Digital ID / Certificate QR acceptance;
- database backup/restore drill;
- controlled production credential/state-changing acceptance and bootstrap cleanup/rotation where required.

`PAYMONGO_LIVE_ENABLED` remains false until controlled TEST acceptance is signed off.
