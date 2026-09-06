# PSP Website — Urgent Platform Hardening, UI/UX, Finance & Certificate Program

**Requested:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production:** `https://psp.hoahub.tech`  
**PR:** #34  
**Working branch:** `feat/psp-platform-hardening-2026-09-06`  
**Base main SHA:** `2e0f7b457112070bad651f1cf7e378ba3f1b46aa`  
**Target release:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> This is the detailed requirement/evidence ledger. `COMPLETE (AUTOMATED)` means implementation plus required application/CI runtime evidence exists. Provider/device/live-production facts remain separately open until directly observed.

## 1. Delivery Principles

1. Preserve production data/history and Chapter isolation; schema changes are additive and production initialization never uses `--accept-data-loss`.
2. National/System Admin cross-Chapter authority requires explicit national permission.
3. Chapter Admin remains exact-Chapter server-scoped.
4. Browser state never authoritatively marks finance `PAID`.
5. Chapter PayMongo configuration may be staged as disabled Draft; activation remains fail-closed.
6. PSP remains PWA-only.
7. Dense administration registers follow the PSP Table Standard.
8. Private/member-only content must never become public implicitly.
9. Merge only an exact passing PR head; production closure requires post-merge CI + exact Production Smoke.

## 2. Requirement Matrix

| ID | Priority | Requirement | Current evidence status |
| --- | --- | --- | --- |
| PSP-HARD-001 | P0 | Per-Chapter PayMongo setup can be saved safely even before parent platform readiness | **COMPLETE (AUTOMATED)** — Draft save, exact Chapter scope, no real webhook, blocked activation preserving `isEnabled=false` proven in runtime CI |
| PSP-HARD-002 | P0 | Real PayMongo Platforms split settlement per Chapter | **PENDING CONTROLLED PAYMONGO ACCEPTANCE** — application contracts implemented; real provider TEST DUES/CONTRIBUTION/OTHER + child webhook/settlement not yet observed |
| PSP-HARD-003 | P0 | Finance configurable per Chapter + National authorized visibility | **COMPLETE (AUTOMATED)** — rates/assessments/payment config, complete-history summary correction, paginated registers and isolation compile/runtime gates green |
| PSP-HARD-004 | P0 | National/Chapter Admin edit member information within scope | **COMPLETE (AUTOMATED)** — own Chapter edit + audit passed; cross-Chapter edit denied; protected membership/login/transfer fields remain separate |
| PSP-HARD-005 | P0 | Public homepage shows safe updates/events across all Chapters | **COMPLETE (AUTOMATED)** — explicit-public announcement + published event appear; seeded private announcement non-leak proven |
| PSP-HARD-006 | P1 | Admin custom certificates with one/multiple/all recipients | **COMPLETE (AUTOMATED)** — custom issue, Chapter denial, persisted metadata, PDF and public QR verification passed |
| PSP-HARD-007 | P1 | Standard searchable/paginated Admin tables | **COMPLETE (AUTOMATED)** — Members, Users, Chapters, Organization, Finance, Certificates converted; lint/typecheck/build green |
| PSP-HARD-008 | P1 | Professional Member dashboard/payment UX | **COMPLETE (AUTOMATED)** — payment-first hierarchy/readiness/disabled checkout implemented; responsive build/runtime green. Physical-device acceptance remains external |
| PSP-HARD-009 | P1 | Complete per-Chapter setup/config workflow | **COMPLETE (APPLICATION)** — Chapter lifecycle/admin/branding/organization/finance/payment setup remain scoped and directly navigable. Real PayMongo activation is external under HARD-002 |
| PSP-HARD-010 | P1 | PWA/mobile-responsive regression | **COMPLETE (AUTOMATED)** — exact r14 PWA/auth/security/runtime contracts green; physical Android/iOS acceptance remains external |
| PSP-HARD-011 | P1 | Status/architecture/payment/UI documentation reconciliation | **IN FINAL VALIDATION** — AGENTS/STATUS/PAYMENTS/UI_UX/tracker reconciled; documentation-bearing exact head must pass full CI before merge |

## 3. Administration Table Standard — Implemented

Covered high-density registers use:

- server pagination rather than silent hard caps;
- search by relevant identifiers;
- Chapter/status/category filters where applicable;
- URL-backed query/filter/page state;
- result count and Page X/Y;
- Previous/Next boundary controls;
- semantic desktop/tablet tables;
- below 768px, `admin-responsive-table` row→record-card transformation using `data-label`;
- mobile-usable actions without forced horizontal scrolling;
- server authorization/Chapter scope on every query/action.

Covered areas:

- Member Directory / Members;
- Users;
- Chapter Management;
- Organization Officer/Committee histories;
- Finance Payments / Balances / Rates / Assessments;
- Certificate register.

## 4. PayMongo Chapter Configuration — Implemented Application Contract

### States

1. `NOT_CONFIGURED`
2. `DRAFT`
3. `READY`
4. `ENABLED`
5. `BLOCKED`

### Draft behavior

- authorized Admin saves linked `org_*`, TEST/LIVE mode, methods, disabled state;
- does not require parent platform configuration;
- does not call PayMongo;
- does not create child webhook;
- staged encrypted pending-webhook marker is internal only and is not reported as a real webhook secret;
- runtime payment configuration rejects the staged marker;
- Chapter remains non-payable.

### Activation behavior

Before enabling, server requires:

- parent platform secret/account readiness;
- deliberate convenience fee;
- matching mode;
- unique valid linked child Account ID;
- valid methods;
- real child webhook signing secret, creating webhook when required;
- LIVE global gate when applicable.

Failed activation preserves the saved Draft and `isEnabled=false`.

### Automated evidence

Runtime CI proves:

- foreign Chapter config → 403;
- own Draft with parent unavailable → 200;
- returned state → `DRAFT`;
- returned `hasWebhookSecret` → false;
- activation with parent unavailable → 409;
- persisted `isEnabled` remains false.

### Still external

Real TEST parent/child PayMongo account connection, split settlement and real provider webhook are not fabricated by CI.

## 5. Finance — Implemented

- effective-dated Chapter rates preserve history;
- posted assessments retain posted amount semantics;
- member balance is ledger-derived;
- Finance summary no longer derives totals from only the latest 200 payments;
- Payments, Balances, Rates, Assessments are searchable/paginated;
- Chapter amount / PSP platform fee / gross remain distinct;
- National authorized visibility can span Chapters;
- Chapter Admin remains exact-Chapter restricted;
- member payment flow does not start when Chapter online payment is unavailable.

## 6. Admin Member Editing — Implemented & Runtime-Proven

Editable approved profile/contact fields are validated server-side. Generic Admin edit does not change:

- membership number;
- login email/credential identity;
- Chapter transfer.

Transfer remains audited separately; archive remains non-destructive.

CI proves:

- foreign member edit denied;
- own member edit succeeds;
- expected DB fields update;
- `MEMBER_PROFILE_UPDATED_ADMIN` audit evidence exists;
- foreign member is unchanged.

## 7. Public Global Updates & Events — Implemented & Privacy-Proven

Announcements:

- `isPublic` defaults false;
- anonymous homepage query requires `isPublic=true`;
- Admin explicitly opts into public website publication;
- Admin register badges `PUBLIC WEBSITE` vs `MEMBERS ONLY`;
- protected uploaded images remain private/member-authenticated.

Events:

- only published lifecycle records appear publicly.

CI homepage smoke seeds:

- `CI Alpha Public Update` → must appear;
- `CI Alpha Private Update` → must **not** appear;
- `CI Alpha Published Event` → must appear.

All three assertions passed on the r14 code candidate.

## 8. Custom Certificate Tool — Implemented & Runtime-Proven

Supported types:

- Membership
- Attendance
- Appreciation
- Recognition
- Outstanding Member
- Custom

Admin issuance supports:

- title;
- certificate date;
- citation/text;
- optional event/reference;
- one, multiple or all eligible in-scope active recipients.

Safety:

- server checks every selected recipient Chapter;
- unique certificate number/token per recipient;
- batch+member uniqueness prevents duplicate batch retry;
- Chairman signatory snapshotted;
- revocation preserves history;
- standard self-service Membership Certificate remains independently available.

Member/public:

- member is notified;
- member sees/downloads all valid assigned certificates;
- PDF renders actual type/title metadata;
- public QR verification renders actual type/title/date/reference/citation.

CI proves cross-Chapter denial, successful Appreciation issue, persisted metadata, PDF `application/pdf`, and public verification containing `Certificate of Appreciation`.

## 9. Member Dashboard / Payment UX — Implemented

Initial hierarchy now prioritizes:

1. identity + Chapter;
2. Outstanding Balance;
3. Pay/View Dues;
4. online-payment readiness/methods;
5. Receipts;
6. Total Confirmed Contributions;
7. Digital ID / Certificates / Chapter / Profile & Security.

When Chapter payment is unavailable, member receives a clear readiness message and fee-preview/checkout is not started.

## 10. PWA / Responsive Safety

- stable manifest `id: "/"` retained;
- r14 changes deployment-generation marker, not app identity;
- service-worker/install/auth/PWA runtime checks retained;
- React 19 lint surfaced six synchronous-effect-state issues; all were fixed in source rather than suppressing the rule;
- private/payment/auth/certificate data remains excluded from authoritative public offline behavior.

Physical Android/iOS acceptance remains external.

## 11. r14 Automated Evidence

Code candidate exact SHA:

`ca669579e367d97c9d5ff4b476f157ad71b19e4e`

PSP CI #562 / run `34004239570`: **PASSED EVERY GATE**.

Passed steps:

- secret scan;
- security headers;
- dependency install/artifact;
- Prisma validate/generate/CI MySQL apply;
- seed/bootstrap;
- cross-Chapter fixtures;
- platform-hardening fixtures;
- ESLint;
- hardening source contracts + TypeScript;
- production build;
- production runtime/security/PWA/isolation/hardening smoke;
- production dependency audit evidence and enforcement.

No unresolved PR review threads were present when checked on PR #34.

This code-candidate evidence does **not** authorize merge of a later documentation-bearing head. The final exact head must pass the same required CI again.

## 12. Release Procedure Remaining

1. Complete documentation reconciliation.
2. Wait for the final documentation-bearing exact PR head to pass full PSP CI.
3. Re-read exact head and unresolved review threads.
4. Merge PR #34 with `expected_head_sha` only.
5. Verify post-merge `main` PSP CI.
6. Verify `PSP Production Smoke` for exact `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`.
7. Record merge SHA, main CI run and Production Smoke run in authoritative status.

## 13. Controlled / External Pending

These remain open after automated application release unless directly evidenced:

- PayMongo Platforms real TEST DUES split payment;
- real TEST CONTRIBUTION payment;
- real TEST OTHER payment;
- real child webhook delivery/signature;
- real split settlement to platform/Chapter;
- invalid/duplicate/cross-Chapter provider webhook acceptance;
- controlled LIVE payment after TEST signoff + explicit owner approval;
- real recipient email receipt/rendering;
- physical Android installed PWA;
- physical iPhone/iPad Add-to-Home-Screen;
- real passkey device acceptance;
- second-device Digital ID / Certificate QR acceptance where required;
- database backup/restore drill;
- controlled production credential/state-changing acceptance and credential/bootstrap cleanup where required.

`PAYMONGO_LIVE_ENABLED` stays false until the controlled TEST gate is signed off.
