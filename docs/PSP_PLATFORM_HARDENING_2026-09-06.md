# PSP Website — Urgent Platform Hardening, UI/UX, Finance & Certificate Program

**Requested:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production:** `https://psp.hoahub.tech`  
**Implementation PR:** #34 — merged  
**Production-build hotfix PR:** #37 — active  
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
| PSP-HARD-011 | P1 | Documentation reconciliation | **COMPLETE FOR CURRENT HOTFIX STATE** |
| PSP-HARD-012 | P0 Release | Exact r14 production deployment and smoke | **HOTFIX IN PROGRESS — HOSTINGER BUILD FAILURE ROOT CAUSE IDENTIFIED** |
| PSP-HARD-013 | P0 Security | No high/critical npm dependency findings | **COMPLETE ON HOTFIX CODE HEAD; FINAL PR HEAD CI REQUIRED** |

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

## Implementation Release Evidence

### PR #34

- exact head `6a4fbe1552fdcd857363b12975f34c25f0c7b954`;
- PSP CI #572: **PASSED every gate**;
- no unresolved review threads;
- merged using expected exact head only;
- implementation merge SHA `3701313f371b473df8400ed7404359fb6a5ccf72`;
- post-merge PSP CI #573: **PASSED every gate**.

Documentation reconciliation PRs #35 and #36 also passed exact-head CI and merged.

## Production Build Failure Investigation

Production Smoke repeatedly observed the previous r13 deployment because the r14-era Hostinger deployments failed during build.

Hostinger deployment history proves the Git integration received the expected `main` commits. The latest build log exposed the exact failure:

```text
Existing member-mobile PSP schema detected.
Applying reviewed additive custom-certificate metadata columns.
...
A unique constraint covering [batchId,memberId] on Certificate will be added.
Error: Use the --accept-data-loss flag to ignore the data loss warnings
ERROR: Failed to build the application
```

The application correctly refused to use `--accept-data-loss`. The production initializer had delegated the r14 additive certificate upgrade to Prisma `db push`, and Prisma would not proceed automatically with the new unique constraint.

## PR #37 Production-Safe Schema Hotfix

The hotfix replaces the r14 certificate/public-announcement `db push` path with explicit reviewed additive SQL:

- add only missing certificate metadata columns;
- add `certificateDate` nullable, backfill from `issuedAt`, then enforce NOT NULL/default;
- add nullable `batchId` without rewriting legacy records;
- query for duplicate non-null `(batchId, memberId)` values before unique-index creation;
- fail closed if a duplicate is found;
- add batch/member and type/date indexes only when absent;
- add `Announcement.isPublic` as `NOT NULL DEFAULT 0`, keeping legacy announcements private;
- add public-announcement index only when absent;
- never invoke Prisma with `--accept-data-loss`.

### Production-only CI regression

CI now emulates the previous member-mobile production schema by removing only r14 columns/indexes, then runs `production-build-init.mjs` with `APP_ENV=production` and verifies the resulting schema is exactly compatible with Prisma without `--accept-data-loss`.

Hotfix code head `1556c01794ed47938b625de77e14141ff9efa651` passed this gate in PSP CI #593 together with Prisma validate/generate/db push, lint, typecheck, production build and runtime/security smoke.

## High-Severity Dependency Remediation

Hostinger npm install reported **3 high-severity vulnerabilities**. A new complete-audit CI gate reproduced the exact chain:

```text
prisma@6.19.3
  -> @prisma/config
     -> deepmerge-ts < 8.0.0
```

Advisory: `GHSA-ggr8-5vv4-36mx` — stack exhaustion when merging recursive object graphs.

The automated `npm audit fix --force` proposal would downgrade Prisma to 6.12.0, so it was rejected. PR #37 instead applies:

```json
"overrides": {
  "deepmerge-ts": "8.0.1"
}
```

CI #593 proves:

- `npm audit --audit-level=high`: **PASS**;
- Prisma validate/generate/db push: **PASS**;
- production additive-upgrade regression: **PASS**;
- lint/typecheck/build/runtime smoke: **PASS**;
- post-prune production/runtime dependency audit: **PASS**.

The full high/critical npm audit remains a permanent pre-build merge gate, in addition to the existing post-prune runtime-only audit.

## Production Validation State

Last directly observed production identity:

```text
release = 2026-09-05-r13
deploymentGeneration = 2026-09-05-release-keyed-pwa-install-v1
```

Once PR #37's final exact head passes CI and merges, Hostinger must successfully build/deploy the resulting `main`. Production Smoke then must pass:

1. exact r14 `/api/health` identity;
2. `/api/health/ready` database/auth/baseline/member-mobile/custom-certificate/public-announcement/auth-config checks;
3. public homepage global-feed marker;
4. PWA manifest/install/registration/login markers;
5. security headers;
6. canonical invalid login 401 and cross-site rejection 403;
7. public member/certificate verification routes without application 500.

If Hostinger fails again, inspect the first new build error and fix only that exact cause. Do not add `--accept-data-loss` and do not weaken Production Smoke or dependency gates.

## Controlled / External Pending

- PR #37 final exact-head CI + exact merge;
- Hostinger successful r14 build/deploy;
- exact-r14 Production Smoke;
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
