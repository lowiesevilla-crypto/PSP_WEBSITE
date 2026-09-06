# PSP Website — Urgent Platform Hardening, UI/UX, Finance & Certificate Program

**Requested:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production:** `https://psp.hoahub.tech`  
**Working branch:** `feat/psp-platform-hardening-2026-09-06`  
**Base main SHA:** `2e0f7b457112070bad651f1cf7e378ba3f1b46aa`

> This tracker is the authoritative requirement/evidence ledger for the 2026-09-06 urgent enhancement program. It must be reconciled with `AGENTS.md`, `docs/STATUS.md`, `docs/UI_UX.md`, `docs/PAYMENTS.md`, and the exact release evidence before closure.

## 1. Delivery Principles

1. Preserve the existing production data model and chapter isolation unless an additive migration is explicitly required and proven safe.
2. National/System Admin may operate across chapters only where explicit national permission exists.
3. Chapter Admin operations remain restricted to the exact authorized chapter on the server; client-side chapter selectors never grant access.
4. Finance and payment state is never trusted from the browser. PayMongo webhook evidence remains authoritative for `PAID`.
5. Online-payment activation is fail-closed. Chapter setup may be staged safely, but payment activation must require complete parent-platform + child-account + webhook + fee readiness.
6. PSP remains PWA-only. No APK/IPA/native distribution path is introduced.
7. Every dense administrative list follows the PSP Table Standard defined below.
8. A requirement is `COMPLETE` only when implementation plus required automated/controlled evidence exists. Credential-, provider-, device-, or production-state-dependent behavior remains `PENDING EXTERNAL/CONTROLLED ACCEPTANCE` until directly proven.

## 2. Priority Matrix

| ID | Priority | Requirement | Baseline finding | Target acceptance | Status |
| --- | --- | --- | --- | --- | --- |
| PSP-HARD-001 | P0 | Per-Chapter PayMongo setup can be saved and managed end-to-end | Existing save path requires complete PSP platform + convenience fee and attempts child webhook creation during every first save, even while online payment is disabled | Admin can save a disabled chapter linked-account draft; activation separately validates parent platform, fee, linked child account, webhook signing secret, mode, allowed methods and live gate | IN PROGRESS |
| PSP-HARD-002 | P0 | PayMongo Platforms split settlement per Chapter | Linked-account architecture exists but production readiness reports platform not configured and live disabled | TEST DUES/CONTRIBUTION/OTHER split E2E proves fee, child transfer, signed/idempotent webhook, chapter-only ledger posting and receipt totals | PENDING CONTROLLED PAYMONGO ACCEPTANCE |
| PSP-HARD-003 | P0 | Finance works end-to-end with configurable Chapter parameters | Effective-dated rates/assessments/payment routes exist; workflow needs usability and configuration hardening | Chapter-scoped rates, assessment creation, member balances, payment methods, config readiness and National cross-Chapter visibility are clear and server-authorized | IN PROGRESS |
| PSP-HARD-004 | P0 | National/Chapter Admin can edit member information within scope | Admin member lifecycle exists but Member Directory has no dedicated edit workflow | National may edit any authorized member; Chapter Admin only exact Chapter; allowed identity/contact/membership fields are validated, audited and history-safe | IN PROGRESS |
| PSP-HARD-005 | P0 | Public home page shows readable updates/events across all Chapters | Home page is static and does not aggregate chapter content | Public homepage renders published/non-expired public-safe Chapter/National announcements and published events with chapter attribution; no private media or member-only data leaks | IN PROGRESS |
| PSP-HARD-006 | P1 | Admin-generated custom certificates with bulk assignment | Existing certificate route only issues standard Membership Certificate | Authorized Admin can choose certificate type/title/date/description, select one/many/all eligible in-scope members, issue individually identifiable records, notify recipients and allow member PDF download | IN PROGRESS |
| PSP-HARD-007 | P1 | Standard searchable/paginated admin tables | Member/Chapter/User views are card grids; Members hard-cap 100 and Users 300 | Member Directory, Chapter Management, Users, Organization, Finance and Certificate management use consistent search/filter/pagination and responsive table-to-record-card behavior | IN PROGRESS |
| PSP-HARD-008 | P1 | Professional Member dashboard/payment UX | Mobile-first member experience exists but payment affordance requires stronger hierarchy | Balance and Pay Now are primary, fee/payment-method readiness is clear, receipts/status/certificates are easy to reach, loading/errors are visible and touch-friendly | IN PROGRESS |
| PSP-HARD-009 | P1 | Complete per-Chapter setup/configuration experience | Chapter lifecycle/branding/admin/payment pieces exist across separate screens | Chapter setup presents lifecycle, branding, admins, finance/rates, payment readiness, and chapter profile with explicit setup state and actionable validation | IN PROGRESS |
| PSP-HARD-010 | P1 | 100% PWA/mobile-responsive regression | PWA r13 baseline exists and automated install contract passed; physical device acceptance is separate | No uncontrolled horizontal overflow, safe-area/touch targets preserved, install identity unchanged, authenticated/payment/private data never publicly cached | IN PROGRESS |
| PSP-HARD-011 | P1 | Status/docs reconciliation | `docs/STATUS.md` still describes r12 as unmerged although PR #32/#33 merged | Status reflects current r13 base plus this program’s exact branch/PR/CI/production evidence | IN PROGRESS |

## 3. PSP Administration Table Standard

All high-density list screens covered by this program must use this behavior unless a specific workflow requires a card/detail layout:

- server-driven pagination for unbounded business records; do not silently truncate with fixed `take` limits;
- default page size 20 or 25; bounded selectable page sizes may be introduced later without weakening server scope;
- search by the human identifiers relevant to the list (for example name, email, member number, chapter/code, certificate number/title);
- filters for the primary lifecycle/status and Chapter where national scope applies;
- search/filter state encoded in URL query parameters so refresh/back/forward work naturally;
- explicit result count and `Page X of Y`;
- Previous/Next controls disabled at boundaries;
- desktop/tablet semantic `<table>` with clear headers;
- PSP responsive table transformation below 768 px using `data-label` cells so each row becomes a readable record card;
- actions remain usable on mobile without requiring horizontal scrolling;
- empty-state text reflects active search/filter instead of appearing as a generic error;
- all list queries re-apply server authorization and Chapter scope before search/pagination;
- National visibility never bypasses explicit permissions.

## 4. Payment Configuration Workflow

### 4.1 Desired configuration states

A Chapter payment setup should expose explicit state rather than one ambiguous enabled checkbox:

1. **Not configured** — no linked child Account ID saved.
2. **Draft** — linked `org_*` child account and payment methods saved, online payment disabled; parent platform or webhook may still be incomplete.
3. **Ready to activate** — parent platform config, convenience fee, matching mode, child Account ID and child webhook signing secret all validated.
4. **Enabled (TEST)** — online payment available only in TEST mode.
5. **Enabled (LIVE)** — only after the global live gate is explicitly enabled following TEST signoff.
6. **Blocked** — saved configuration exists but validation fails; UI shows the exact remediation without exposing secrets.

### 4.2 Required safeguards

- Never return/store plaintext parent secret or child webhook secret in browser payloads.
- A linked child `org_*` account may belong to only one PSP Chapter.
- Draft save does not mark the Chapter online-payment capable.
- Enabling creates/refreshes the child webhook when required and persists its encrypted secret before setting `isEnabled=true`.
- Disable must not erase financial/payment history.
- Changing linked account while enabled must first re-establish webhook readiness for the new account or remain disabled.
- TEST/LIVE mode must match the parent platform mode.
- LIVE remains blocked when `PAYMONGO_LIVE_ENABLED` is not explicitly true.
- All configuration changes are audited.

## 5. Finance End-to-End Acceptance

For each Chapter:

- effective-dated dues/rate configuration can be created/read without rewriting historical charges;
- assessments retain immutable posted amount semantics;
- member balance and confirmed contributions are computed from the PSP ledger;
- online payment methods are exactly the configured allowed set;
- member sees Chapter amount, platform fee and total before confirmation;
- checkout uses authenticated member Chapter, never arbitrary browser-supplied Chapter authority;
- QR Ph/GCash/Maya follow the linked-account child `Account-Id` flow;
- browser redirect/polling is non-authoritative;
- signed child webhook is authoritative and idempotent;
- Chapter ledger posts Chapter amount only;
- receipt distinguishes Chapter amount, PSP platform fee and gross paid;
- National Admin reporting can span authorized chapters without weakening Chapter isolation.

## 6. Admin Member Editing

Authorized editable fields for this enhancement:

- first name;
- last name;
- middle initial;
- address;
- mobile;
- date survived;
- survive/initiation location;
- PSP Birthday Code;
- date of birth;
- membership status where lifecycle transition is explicitly allowed.

Restricted/controlled separately:

- Chapter transfer remains the existing audited transfer workflow;
- membership number is immutable through generic edit;
- login email/credential identity is not silently changed by profile editing;
- archive/delete remains the existing non-destructive archive workflow;
- financial, receipt, certificate and audit history is never deleted by profile editing.

Every Admin edit must be server-authorized against the member's Chapter and audit the changed field names without logging unnecessary sensitive values.

## 7. Public Global Updates & Events

Public homepage aggregation must include only information intentionally safe for anonymous visitors:

- published National announcements;
- published Chapter announcements that are not expired;
- published National events;
- published Chapter events;
- Chapter name/code attribution;
- title/body excerpt/date/venue and safe public image only when the image delivery model is intentionally public.

Current private/scoped content-media endpoints must not be exposed anonymously merely to make the homepage visually richer. If an announcement/event image is private, public listing renders without that image until a reviewed public-media policy exists.

## 8. Custom Certificate Tool

### Admin creation

Authorized National/Chapter Admin should be able to configure an issuance batch with:

- certificate type (Attendance, Appreciation, Recognition, Outstanding Member, or custom);
- certificate title;
- certificate text/description/citation;
- event/issue date;
- optional reference/event label;
- recipient selection: one, multiple, or all eligible members in exact authorized scope;
- Chapter/National issuance scope according to permission.

### Record & member delivery

- one immutable certificate record per recipient;
- unique certificate number and verification token per recipient;
- certificate type/title/text/date are snapshotted on issuance;
- signatory identity is snapshotted at issuance;
- member receives an in-app notification;
- member sees/downloads all issued certificates from their certificate area;
- PDF and public QR verification show the certificate's actual type/title, not always “Membership Certificate”;
- revocation preserves history.

### Bulk safety

- bulk issuance is transactional per intended batch boundary or returns deterministic per-recipient results;
- duplicate submissions must not silently issue duplicate certificates for the same batch/recipient;
- Chapter Admin cannot select recipients from another Chapter;
- National Admin cross-Chapter issuance requires explicit national certificate-management authority.

## 9. Member Dashboard UX Target

Payment-focused hierarchy on member home:

1. `Outstanding Balance` / current Chapter financial summary at the top.
2. Primary `Pay Now` action with online-payment readiness state.
3. `Total Confirmed Contributions` and recent payment state.
4. Quick links: Receipts, Digital ID, Certificates, Chapter, Events, Announcements, Profile/Security.
5. Payment action shows loading/progress, prevents duplicate submission, and reports actionable errors.
6. Mobile layout remains single-column first, safe-area aware, with 44 px+ touch targets and no horizontal overflow.

## 10. QA / Release Gates

Minimum automated gates for this program:

- lint;
- typecheck;
- Prisma/schema initialization compatibility;
- production build;
- existing isolation suite;
- new cross-Chapter denial tests for member editing, custom certificate issuance, payment config staging/activation and public aggregation rules;
- payment configuration state tests: draft save, blocked enable, successful TEST enable, LIVE blocked, duplicate child account rejected;
- server pagination/search tests where covered by CI harness;
- current PWA manifest/service-worker/install assertions retained;
- production smoke remains fail-closed and must target an exact new release/deployment generation before production closure.

Controlled/external gates that must remain open without direct evidence:

- real PayMongo Platforms TEST split-payment E2E;
- real child webhook signature delivery from PayMongo;
- controlled low-value LIVE payment only after TEST signoff + explicit owner approval;
- physical Android PWA install;
- physical iPhone/iPad Add-to-Home-Screen;
- real production admin/member credential workflow acceptance;
- backup/restore drill.

## 11. Work Log

### 2026-09-06 — Baseline audit

- Confirmed current main SHA `2e0f7b457112070bad651f1cf7e378ba3f1b46aa` (merged PR #33 / r13 lineage).
- Confirmed `docs/STATUS.md` is stale relative to merged PR #32/#33 and must be reconciled.
- Confirmed existing PWA-only architecture and responsive admin baseline.
- Confirmed Chapter payment configuration UI/API and linked-account architecture exist.
- Confirmed exact payment workflow defect: first Chapter configuration save is coupled to complete parent platform/fee readiness and child webhook creation; production readiness already reports PayMongo Platforms not configured, so disabled Chapter configuration cannot be staged safely through the current workflow.
- Confirmed Member Directory and User Management use fixed record caps/card grids instead of searchable server pagination.
- Confirmed public homepage is static and does not aggregate Chapter announcements/events.
- Confirmed existing Admin certificate endpoint only issues the standard Membership Certificate and does not support certificate type/title/date/bulk recipient assignment.

### Evidence state

No item above is marked fully complete merely from source inspection. Implementation, exact-head CI and required production/controlled evidence will be recorded below as they occur.
