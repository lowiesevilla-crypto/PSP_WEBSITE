# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Active release program:** PR #34 — PSP Platform Hardening  
**Target identity:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> Read with `../AGENTS.md`. Never claim provider-, credential-, device-, email-inbox-, payment-, backup-, or production state-changing behavior without direct evidence.

## Executive Status

PSP r14 hardening is **IMPLEMENTED ON PR #34 / NOT YET PRODUCTION-PROVEN**.

The latest code candidate before documentation reconciliation was exact head:

`ca669579e367d97c9d5ff4b476f157ad71b19e4e`

PSP CI #562 / run `34004239570` **PASSED every application gate** on that exact code head:

- secret-pattern scan: PASSED;
- security-header configuration: PASSED;
- dependency installation/artifact: PASSED;
- Prisma schema validation: PASSED;
- Prisma client generation: PASSED;
- CI MySQL schema apply: PASSED;
- baseline seed: PASSED;
- System Admin bootstrap validation: PASSED;
- cross-Chapter fixtures: PASSED;
- platform-hardening fixtures: PASSED;
- ESLint: PASSED;
- hardening source contracts + TypeScript: PASSED;
- production build: PASSED;
- runtime/security/PWA/isolation/hardening smoke: PASSED;
- production dependency audit evidence + enforcement: PASSED.

A final documentation-bearing head is being generated after this evidence and **must pass the same complete PSP CI gate before merge**. PR #34 has no unresolved review threads as of this status update.

## r14 Completed Implementation Scope

### Payment / Finance

- Chapter PayMongo linked-account setup can be saved as a disabled `DRAFT` without requiring the PSP parent platform or creating a child webhook.
- Draft configuration does not make a Chapter payable.
- Activation remains fail-closed and requires parent platform, convenience fee, matching mode, valid linked child account, and real child webhook readiness.
- Explicit setup states: `NOT_CONFIGURED`, `DRAFT`, `READY`, `ENABLED`, `BLOCKED`.
- One linked PayMongo child account cannot be assigned to multiple PSP Chapters.
- Member payment screen/dashboard does not start fee-preview/checkout while Chapter online payment is unavailable.
- Finance collection summaries are no longer calculated from only the latest 200 payments.
- Payments, member balances, rates, and assessments have server-side searchable/paginated registers.
- National/Admin scope remains server-authorized; Chapter users remain exact-Chapter restricted.

### Member / User / Chapter / Organization Administration

- Member Directory/Members uses server search/filter/pagination instead of a 100-record cap.
- National/Chapter Admin can edit allowed member profile/contact data within exact authorized scope.
- Membership number, login identity, and Chapter transfer remain controlled separately.
- User Management, Chapter Management, Organization histories, Finance registers, and Certificate register follow the responsive Table Standard.
- Chapter rows provide direct workflow links to Chapter Members and Finance/Payment setup.

### Custom Certificates

- Added certificate type/title/citation/date/reference/batch metadata.
- Supports Membership, Attendance, Appreciation, Recognition, Outstanding Member, and Custom types.
- Admin can issue to one, multiple, or all eligible in-scope active members.
- Batch+recipient uniqueness prevents duplicate issuance on retry.
- Chairman signatory is snapshotted.
- Members are notified and can download all valid assigned certificates.
- PDF and public QR verification show the actual certificate type/title/date/reference/citation.
- Standard Membership Certificate remains independently available.

### Public Website / Privacy

- Published Chapter/National events appear in the public homepage feed.
- Announcements require explicit `isPublic=true` to appear anonymously.
- `Announcement.isPublic` defaults false, so existing/member-only announcements do not become public automatically.
- Admin UI explicitly shows `PUBLIC WEBSITE` vs `MEMBERS ONLY`.
- Protected announcement images remain authenticated/private.
- Production schema initialization/readiness includes the public-announcement column.

### Member UX / PWA

- Member home is payment-first: balance, Pay/View Dues, receipts, payment readiness/methods, confirmed contributions, certificates, Digital ID, Chapter, and security are prioritized.
- Existing stable PWA identity remains `id: "/"`.
- r14 uses exact deployment generation `2026-09-06-platform-hardening-v1` while preserving one PSP app identity.
- React 19 effect-state lint defects surfaced by the new ESLint gate were corrected without weakening PWA/payment/auth behavior.

## Runtime Evidence Added in r14 CI

The runtime suite proves in CI:

- Chapter Admin cannot edit a foreign Chapter member;
- Chapter Admin can edit its own Chapter member and audit evidence is written;
- foreign Chapter PayMongo configuration is rejected;
- own Chapter disabled PayMongo Draft saves while parent platform is absent;
- Draft reports no real webhook secret;
- activation without parent platform returns a blocked/409 result and persisted `isEnabled` remains false;
- foreign Chapter certificate issuance is denied;
- own custom Appreciation certificate issues successfully;
- custom certificate PDF returns `application/pdf`;
- public QR verification renders the actual certificate title;
- authorized public announcement persists `isPublic=true`;
- explicitly public seeded announcement/event appear on the homepage;
- seeded private announcement does not appear on the public homepage;
- existing cross-Chapter application/media/finance/invitation/delete protections remain green;
- existing PWA install/auth/security contracts remain green.

## Release State

PR #34 must not merge until the **final documentation-bearing exact head** passes the complete PSP CI gate. At merge time:

1. re-read exact PR head SHA;
2. confirm no unresolved review threads;
3. confirm exact-head required check success;
4. merge with `expected_head_sha`;
5. verify post-merge `main` PSP CI;
6. verify exact r14 Production Smoke against `https://psp.hoahub.tech`;
7. only then record r14 as production-proven.

## Pending — Controlled / External Acceptance

These remain open even after automated r14 deployment unless directly evidenced:

- real PayMongo Platforms/Linked Accounts TEST split-payment E2E for DUES;
- real TEST CONTRIBUTION payment;
- real TEST OTHER payment;
- real child webhook delivery/signature and settlement observation;
- invalid-signature/duplicate/cross-Chapter behavior against the actual PayMongo provider;
- controlled LIVE payment only after TEST signoff and explicit product-owner approval;
- physical Android installed-PWA acceptance;
- physical iPhone/iPad Add-to-Home-Screen acceptance;
- actual production recipient email receipt/rendering;
- real passkey device acceptance;
- second-device Digital Member ID / Certificate QR acceptance where required;
- database backup/restore drill;
- controlled production credential/state-changing workflow acceptance and bootstrap cleanup/rotation where required.

`PAYMONGO_LIVE_ENABLED` must remain false until the controlled TEST gate is signed off.

## Documentation

Detailed r14 tracker: `PSP_PLATFORM_HARDENING_2026-09-06.md`  
Payment architecture: `PAYMENTS.md`  
UI/UX standard: `UI_UX.md`  
Mandatory engineering rules: `../AGENTS.md`

A requirement is `COMPLETE` only when the evidence required for that class of requirement exists. Automated CI evidence closes source/runtime contracts; it does not fabricate external provider, device, inbox, backup, or live production evidence.
