# Implementation Plan — Psi Sigma Phi Philippines Inc. Digital Platform

**Status timestamp:** 2026-09-04 18:36 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Primary branch:** `main`  
**Current main baseline:** `6fac2b58b9bc94d55958680ce44f90613d1c4fde`  
**Authoritative operational status:** `docs/STATUS.md`  
**Mandatory architecture/business rules:** `AGENTS.md`

## Delivery Principles

1. Mobile-first PWA is mandatory for members; National and Chapter Administration are professionally responsive on desktop, tablet and mobile.
2. National → Chapter → Member hierarchy is enforced in the domain and authorization layers.
3. Chapter data isolation is server-side and never relies on UI hiding.
4. Financial history is traceable; corrections are adjustment/reversal/refund oriented rather than destructive.
5. Registration does not automatically create active membership; Chapter approval is mandatory.
6. Digital Member ID and Membership Certificate are core member-mobile capabilities, not optional post-MVP enhancements.
7. New member online payments use PayMongo Platforms / Linked Accounts with parent-platform authentication, child `Account-Id`, split settlement and a separately disclosed platform convenience fee.
8. Platform convenience fees never become chapter dues/contribution/other income and never inflate the member chapter ledger.
9. Payment PAID state comes only from trusted server/webhook evidence; browser return state is UX only.
10. `AGENTS.md` is the mandatory project knowledge base and `docs/STATUS.md` is the current delivery/evidence ledger.
11. Production URL is `https://psp.hoahub.tech`.
12. Merge only the exact PR head that passed every required CI gate.
13. Runtime dependency-audit evidence is fail-closed; unavailable/malformed evidence is not a clean audit.
14. Production-significant release closure requires exact-generation smoke evidence plus any applicable credential/device/payment/email/backup evidence.
15. Documentation reconciliation is part of Definition of Done for every material task.

## Current Phase Status

| Phase | Scope | Current status |
|---|---|---|
| 0 | Project foundation | COMPLETE |
| 1 | Identity, registration, RBAC, chapter core | COMPLETE / CI VALIDATED |
| 2 | Member PWA, Digital Member ID, certificate, passkey | CODE COMPLETE / AUTOMATED RUNTIME PROVEN; DEVICE GATES OPEN |
| 3 | Community, announcements, private media | CODE COMPLETE / ISOLATION VALIDATED |
| 4 | Chapter organization, admin lifecycle, events | CODE COMPLETE / CONTROLLED AUTH ACCEPTANCE OPEN |
| 5 | Finance, assessments, ledger, receipts | CODE COMPLETE / CI VALIDATED |
| 6 | PayMongo Platforms / Linked Accounts split payments | CODE COMPLETE / EXTERNAL TEST-MODE E2E OPEN |
| 7 | Certificates & QR verification | CODE COMPLETE / SECOND-DEVICE PROOF OPEN |
| 8 | Reporting, audit, responsive administration | COMPLETE IN CURRENT IMPLEMENTATION |
| 9 | QA, security, CI/release governance | AUTOMATED GATES ACTIVE / EXTERNAL GATES OPEN |
| 10 | Hostinger production deployment | DEPLOYED / PUBLIC r5 GENERATION PROVEN |

## Phase 0 — Project Foundation — COMPLETE

- [x] `AGENTS.md` mandatory knowledge base
- [x] Next.js 16 / React 19 / strict TypeScript foundation
- [x] Prisma + MySQL domain schema
- [x] professional PSP black/gold/white design system
- [x] official PSP seal/logo assets
- [x] public landing page
- [x] registration flow
- [x] installable PWA manifest/service worker
- [x] health and readiness endpoints
- [x] MySQL-backed CI, typecheck, production build, runtime/security smoke and dependency-audit gate
- [x] Data Privacy Notice and auditable acknowledgement
- [x] production exact-release/deployment-generation smoke assertions

## Phase 1 — Identity, Registration & Chapter Core — COMPLETE

### Authentication and Security

- [x] strongly hashed passwords
- [x] signed secure session cookies
- [x] login/logout/current-user APIs
- [x] account activation
- [x] forgot/reset password
- [x] session invalidation after password change
- [x] abuse-prone authentication rate limiting
- [x] authentication audit events
- [x] Hostinger SMTP adapter/configuration readiness
- [x] WebAuthn discoverable passkey implementation with user verification
- [x] passkey registration/authentication/revocation audit logging
- [x] password fallback retained for recovery

### Registration & Membership

- [x] approved registration fields: First Name, Last Name, MI, Address, Email, Mobile No., Date Survive, Location, PSP Birthday Code, Date of Birth, Select Chapter
- [x] separate Membership Application acknowledgement
- [x] separate versioned Data Privacy acknowledgement
- [x] duplicate applicant/member checks
- [x] scoped reviewer queue
- [x] review/correction/approval/rejection workflow
- [x] approval creates/activates User/Member as applicable and creates MembershipHistory
- [x] unique membership number generated on approval
- [x] Member permission scope assigned
- [x] Digital Member ID created/backfilled idempotently
- [x] current Chapter Chairman resolved for approval workflow
- [x] welcome/activation email integration signed by Chapter Chairman
- [x] in-app welcome notification

### Chapter / RBAC / Lifecycle

- [x] permission and role catalogues
- [x] national and chapter-scoped assignments
- [x] central authorization/scope resolver
- [x] National Admin chapter create/lifecycle APIs and UI
- [x] `ACTIVE`, `INACTIVE`, `SUSPENDED`, `ARCHIVED` chapter lifecycle controls
- [x] Chapter Administrator assignment with non-active-chapter guard
- [x] National Admin user lifecycle controls
- [x] active-National-Admin self-deactivation protection
- [x] scoped member directory
- [x] controlled chapter transfer preserving history
- [x] National/Chapter Admin dashboards
- [x] Rho Alpha De Las Piñas baseline chapter

## Phase 2 — Member PWA, Digital ID, Certificate & Passkey

### Implemented / automated evidence

- [x] install/update experience foundation
- [x] Android PWA support foundation
- [x] iOS/iPad Add-to-Home-Screen guidance
- [x] safe-area and portrait/landscape support
- [x] private/auth/payment/certificate content excluded from unsafe public offline caching
- [x] authenticated member dashboard
- [x] member profile self-service with protected identity/chapter fields
- [x] chapter/officer directory
- [x] notification center
- [x] outstanding balance and confirmed contribution visibility
- [x] Pay Now entry point
- [x] Digital Member ID mobile card at `/member/id`
- [x] Digital Member ID public verification at `/verify/member/[token]`
- [x] Membership Certificate issue/download/verification
- [x] receipts archive
- [x] passkey management
- [x] PWA shortcuts for Member Home, Digital ID, Payments and Certificate
- [x] responsive professional member UI

### Remaining evidence gates

- [ ] physical Android install and representative flow validation
- [ ] physical iOS/iPad install and representative flow validation
- [ ] real-device passkey registration/authentication
- [ ] Digital Member ID QR validation on a second device
- [ ] Certificate QR validation on a second device

## Phase 3 — Community, Announcements & Private Media

- [x] member posts with ownership/scoped authorization
- [x] Chapter vs National audience
- [x] protected image upload/storage abstraction and validation
- [x] protected media delivery
- [x] comments
- [x] pinned content foundation
- [x] moderation/hide controls
- [x] announcements and notification integration
- [x] secure private announcement image upload, admin preview and member rendering
- [x] secure private event image upload, admin preview and member rendering
- [x] same-server authenticated/scoped content-media delivery
- [x] cross-chapter media access denial in automated isolation tests
- [x] orphan private-file cleanup when event persistence fails
- [x] Turbopack private-media whole-project tracing warnings removed by PR #21 while retaining runtime storage semantics and traversal protections

Controlled production same-chapter/cross-chapter media acceptance remains open because it requires safe real credentials/test records.

## Phase 4 — Chapter Organization, Administration & Events

- [x] configurable positions/hierarchy
- [x] officer assignment with term history
- [x] Committee and CommitteeMembership
- [x] National/chapter event creation
- [x] event lifecycle/status model
- [x] member event list/detail experience
- [x] responsive shared National/Chapter Admin shell
- [x] permission-filtered navigation as UX only; server RBAC remains authoritative
- [x] mobile-safe finance/report presentation
- [x] admin async form reset corrections

Remaining controlled production acceptance:

- [ ] Chapter Administrator assignment through the live National Admin UI
- [ ] controlled chapter deactivate/reactivate
- [ ] controlled user suspend/disable/reactivate
- [ ] representative authenticated mobile Admin rendering

## Phase 5 — Finance, Assessments, Ledger & Receipts

- [x] effective-dated chapter dues/assessment rates
- [x] `DUES`, `CONTRIBUTION`, `OTHER` payment categories
- [x] member charge/assessment foundation
- [x] member ledger and balance calculation
- [x] payment history and receipt archive
- [x] finance-scoped RBAC
- [x] append/trace-oriented adjustment/refund/reversal handling
- [x] historical rate immutability
- [x] outstanding balance and reconciliation administration
- [x] chapter/platform amount separation in payment evidence
- [x] receipt display of chapter amount, platform fee and total paid

## Phase 6 — PayMongo Platforms / Linked Accounts — CODE COMPLETE / EXTERNAL E2E OPEN

The legacy Hosted Checkout v2 architecture is superseded for **new member payments**. The canonical implementation is documented in `docs/PAYMENTS.md`.

### Implemented architecture

- [x] PSP PayMongo parent/platform account model
- [x] per-chapter linked child `org_*` account model
- [x] parent platform secret kept server-side only
- [x] parent authentication + child `Account-Id` for chapter payment operations
- [x] encrypted linked child Account ID storage
- [x] encrypted child webhook signing secret storage
- [x] chapter-scoped payment configuration
- [x] QR Ph, GCash and Maya member methods in current linked-account flow
- [x] platform convenience fee preview and immutable split evidence
- [x] Payment Intent gross total = chapter amount + platform fee
- [x] `split_payment.recipients` routes platform fee to PSP parent/platform
- [x] `split_payment.transfer_to` identifies chapter child for remainder
- [x] internal `Payment.amount` remains chapter amount only
- [x] browser return/polling never authoritatively sets PAID
- [x] chapter-specific child webhook route: `/api/webhooks/paymongo/[chapterCode]`
- [x] raw-body child signature verification before mutation
- [x] paid/failed Payment Intent reconciliation
- [x] gross-amount comparison against persisted split snapshot
- [x] unique event idempotency
- [x] one chapter ledger payment entry for chapter amount only
- [x] one receipt per confirmed internal Payment
- [x] cross-chapter payment/config/webhook denial
- [x] `PAYMONGO_LIVE_ENABLED=false` fail-closed gate

### External TEST-mode acceptance required before live enablement

- [ ] PayMongo Platforms/Linked Accounts capability enabled for PSP
- [ ] PSP parent platform account confirmed
- [ ] at least one chapter child `org_*` linked in TEST mode
- [ ] deliberate platform fee configuration approved
- [ ] TEST DUES split settlement
- [ ] TEST CONTRIBUTION split settlement
- [ ] TEST OTHER split settlement
- [ ] QR Ph TEST E2E
- [ ] GCash TEST E2E
- [ ] Maya TEST E2E
- [ ] valid signed child webhook posts exactly once
- [ ] invalid child webhook signature rejected
- [ ] duplicate child webhook idempotent
- [ ] cross-chapter webhook/reference rejected
- [ ] member/chapter reconciliation and receipt totals verified
- [ ] explicit product-owner approval before enabling live gate

## Phase 7 — Certificates & QR Verification

- [x] membership eligibility service
- [x] current Chapter Chairman required at issue time
- [x] Chairman name/title signatory snapshot
- [x] unique certificate number
- [x] PDF Certificate of Membership with official seal
- [x] QR verification token and production-origin verification URL
- [x] public minimal-data verification page
- [x] revocation/supersession/expiry history preservation
- [x] member mobile preview/download
- [ ] second-device production QR verification evidence

## Phase 8 — Reporting, Audit & Operations

- [x] National/chapter dashboards and reports
- [x] membership/application/collection/outstanding/payment/certificate/event reporting foundation
- [x] scoped audit-log viewer
- [x] responsive admin reporting layout
- [x] finance/report desktop semantic tables and mobile labeled record cards where columns become unusable
- [x] National-vs-Chapter administration context in shared shell

## Phase 9 — QA, Security, CI & Release Governance

### Automated/repository gates currently enforced

- [x] Prisma schema validation and CI MySQL application
- [x] baseline seed validation
- [x] System Admin bootstrap validation
- [x] strict TypeScript
- [x] production Next.js build
- [x] production runtime/security smoke inside CI
- [x] CSRF/origin negative checks
- [x] invalid PayMongo webhook rejection
- [x] automated cross-chapter IDOR/BOLA negative tests
- [x] high-risk committed-secret pattern check
- [x] production security-header configuration check
- [x] fail-closed production runtime dependency audit
- [x] trusted audit-report schema/evidence validation before vulnerability enforcement
- [x] bounded audit-source retry/fetch timeout behavior without accepting missing evidence
- [x] exact PR-head merge rule
- [x] exact release/deployment-generation production smoke
- [x] Hostinger/browser-challenge smoke failures retained as failures until an exact retry reaches and proves the application

### Remaining live/external validation

- [ ] controlled production authenticated admin/member workflow acceptance
- [ ] real Chairman welcome email delivery
- [ ] Android/iOS PWA device acceptance
- [ ] real passkey device acceptance
- [ ] second-device Digital Member ID QR validation
- [ ] second-device Certificate QR validation
- [ ] PayMongo Platforms TEST split-payment E2E
- [ ] database backup/restore drill
- [ ] security rotation/bootstrap cleanup where earlier values were exposed

## Phase 10 — Hostinger Production Deployment — DEPLOYED / PUBLIC r5 PROVEN

Target: `https://psp.hoahub.tech`

### Proven current public generation

- [x] production canonical hostname mapped
- [x] PSP runtime/data/secrets isolated from HOAHub
- [x] release `2026-09-04-r5`
- [x] deployment generation `2026-09-04-admin-lifecycle-media-v1`
- [x] `/api/health` exact-generation smoke
- [x] `/api/health/ready` ready on successful smoke
- [x] public/PWA routes smoke
- [x] production security headers smoke
- [x] canonical-origin invalid-login JSON behavior
- [x] cross-site login rejection
- [x] public member/certificate verification routes without application 500
- [x] Production Smoke #9, #10, #11 and successful retry of #12

Hostinger can transiently present a browser challenge to GitHub Actions health probes. Such an attempt remains failed evidence and must be inspected/rerun; it is never converted to a pass by assumption.

## Current Delivery Sequence

1. PR #21 private-media build-tracing correction merged only after exact-head PSP CI #428 passed every required gate.
2. Confirm post-merge PSP CI #429 and Production Smoke #13 for merge SHA `6fac2b58b9bc94d55958680ce44f90613d1c4fde`; inspect/rerun exact jobs if external audit or Hostinger challenge conditions fail.
3. Complete this implementation-plan/documentation-baseline reconciliation on a separate exact-head CI-reviewed PR.
4. Do not attempt controlled production state-changing acceptance without safe credentials/test records.
5. When external prerequisites become available, execute the controlled authenticated acceptance and PayMongo/device/email/backup matrices with evidence.

## Definition of Complete

Repository implementation completion and external production acceptance are distinct states. A task is complete only when the evidence required for that task exists.

Never mark credential-dependent, payment, email, device, QR, backup/restore or production state-changing checks complete from source code, CI simulation or public smoke alone.
