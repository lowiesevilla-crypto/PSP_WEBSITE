# Implementation Plan — Psi Sigma Phi Philippines Inc. Digital Platform

**Status date:** 2026-08-20  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Primary branch:** `main`

## Delivery Principles

1. Mobile-first PWA is mandatory.
2. National → Chapter → Member hierarchy is enforced in the domain and authorization layers.
3. Chapter data isolation is server-side and never relies on UI hiding.
4. Financial history is traceable; PayMongo webhook processing is idempotent.
5. Registration does not automatically create active membership.
6. `AGENTS.md` is the mandatory knowledge base for all implementation work.
7. Production URL is `https://psp.hoahub.tech`.
8. Production deployment occurs only after CI, database, security, payment, and smoke-test gates pass.

## Phase Status

| Phase | Scope | Status |
|---|---|---|
| 0 | Project foundation | COMPLETE |
| 1 | Identity, registration, RBAC, chapter core | COMPLETE / CI GREEN |
| 2 | Production PWA member experience | IN PROGRESS |
| 3 | Community & communications | PLANNED NEXT |
| 4 | Chapter organization & events | PLANNED |
| 5 | Finance & member ledger | PLANNED |
| 6 | PayMongo Hosted Checkout v2 | PLANNED |
| 7 | Certificates & QR verification | PLANNED |
| 8 | Reporting & audit operations | PLANNED |
| 9 | QA & security release gate | PLANNED |
| 10 | Hostinger production deployment | PLANNED |

## Phase 0 — Project Foundation — COMPLETE

- [x] `AGENTS.md` knowledge base
- [x] Next.js 16 / React 19 / TypeScript strict foundation
- [x] Prisma + MySQL domain schema baseline
- [x] Responsive black/gold/white brand system
- [x] Official PSP logo asset
- [x] Public landing page
- [x] Registration PWA flow
- [x] Member dashboard foundation
- [x] PWA manifest and service worker
- [x] Health endpoint
- [x] CI with MySQL validation, strict typecheck, production build, and runtime dependency audit
- [x] Data Privacy Notice and auditable acknowledgement

## Phase 1 — Identity, Registration & Chapter Core — COMPLETE

### Authentication
- [x] Scrypt password hashing
- [x] Signed secure session cookies
- [x] Login/logout/current-user APIs
- [x] Account activation
- [x] Forgot/reset password
- [x] Session invalidation after password change
- [x] Abuse-prone authentication rate limiting
- [x] Authentication audit events
- [x] Hostinger SMTP adapter

### Registration & Membership
- [x] Approved registration fields: First Name, Last Name, MI, Address, Email, Mobile No., Date Survive, Location, PSP Birthday Code, Date of Birth, Select Chapter
- [x] Separate Membership Application acknowledgement
- [x] Separate versioned Data Privacy acknowledgement
- [x] Duplicate applicant/member checks
- [x] Scoped reviewer queue
- [x] Under Review / Correction / Approval / Rejection workflow
- [x] Approval creates Member and MembershipHistory
- [x] Unique platform membership number generated on approval
- [x] Member role assigned
- [x] Activation email sent

### Chapter / RBAC
- [x] Permission and role catalogues
- [x] National and chapter-scoped assignments
- [x] Central authorization/scope resolver
- [x] National chapter create/update APIs
- [x] Chapter Admin assignment
- [x] Scoped member directory
- [x] Controlled chapter transfer preserving membership, officer, and access history
- [x] National/Chapter Admin dashboard

### Phase 1 Validation
- [x] CI MySQL 8.4 service
- [x] Schema application
- [x] Baseline seed
- [x] secure System Admin bootstrap
- [x] strict TypeScript
- [x] production Next.js build
- [x] runtime production dependency audit enforcement

## Phase 2 — Production PWA Member Experience

- [ ] Install prompt and iOS Add-to-Home-Screen guidance
- [ ] Update-available handling
- [ ] Offline shell with safe cache policy
- [ ] Production icon/splash-ready manifest
- [x] Real authenticated member dashboard
- [ ] Member profile update
- [ ] Digital membership card
- [ ] Chapter profile/officer directory
- [ ] Notification center
- [ ] Responsive/accessibility QA

## Phase 3 — Community & Communications

- [ ] Member post create/edit/delete ownership controls
- [ ] Chapter vs National audience
- [ ] Secure image upload/storage abstraction and validation
- [ ] Comments
- [ ] Pinned content
- [ ] Moderation/hide controls
- [ ] Announcements
- [ ] Notification triggers
- [ ] Cross-chapter content isolation tests

## Phase 4 — Chapter Organization & Events

- [ ] Configurable positions/hierarchy
- [ ] Officer assignment with term history
- [ ] Committee model/memberships
- [ ] National/chapter event creation
- [ ] Draft/publish/cancel lifecycle
- [ ] Member event list/detail
- [ ] Event image foundation

## Phase 5 — Finance & Member Ledger

- [ ] Effective-dated chapter dues rates
- [ ] National dues / special assessments / event contributions / membership fees
- [ ] Member charge generation
- [ ] Ledger and balance calculation
- [ ] Statement of account
- [ ] Finance-only RBAC enforcement
- [ ] Traceable adjustment/reversal controls
- [ ] Historical rate immutability validation

## Phase 6 — PayMongo Hosted Checkout v2

- [ ] Server-only PayMongo client
- [ ] Internal pending Payment before checkout
- [ ] `POST /v2/checkout_sessions`
- [ ] Idempotency key on resource creation
- [ ] Checkout redirect URL returned to PWA
- [ ] Raw-body webhook handler
- [ ] `Paymongo-Signature` HMAC-SHA256 validation
- [ ] `checkout_session.payment.paid` processing
- [ ] Event/session idempotency
- [ ] Ledger posting after trusted webhook confirmation
- [ ] Digital PSP receipt
- [ ] Failed/cancelled handling and reconciliation
- [ ] PayMongo test-mode E2E

Production webhook: `https://psp.hoahub.tech/api/webhooks/paymongo`.

## Phase 7 — Certificates & QR Verification

- [ ] Membership eligibility service
- [ ] Unique certificate number
- [ ] PDF Certificate of Membership
- [ ] QR verification token
- [ ] Public minimal-data verification page
- [ ] Revocation/supersession history
- [ ] Member mobile preview/download

## Phase 8 — Reporting, Audit & Operations

- [ ] National/chapter dashboards and reports
- [ ] Membership/applications/collections/outstanding/payment/certificate/event reports
- [ ] CSV export where appropriate
- [ ] Audit viewer for authorized users
- [ ] Pagination/search/filtering

## Phase 9 — QA & Security

Required release gates:

- [ ] CI green on release candidate
- [ ] production database backup strategy confirmed
- [ ] authentication negative tests
- [ ] cross-chapter IDOR/BOLA negative tests
- [ ] registration/privacy E2E
- [ ] application approval/activation E2E
- [ ] community authorization test
- [ ] finance ledger invariants test
- [ ] PayMongo test-mode checkout/webhook/idempotency test
- [ ] certificate verification/revocation test
- [ ] PWA responsive/install smoke test
- [ ] security headers verified
- [ ] no secrets in source

## Phase 10 — Hostinger Production Deployment

Target: `https://psp.hoahub.tech`

- [ ] provision dedicated production MySQL
- [ ] configure Node.js 22+ web app
- [ ] configure secrets/environment variables
- [ ] apply approved Prisma production schema
- [ ] seed baseline
- [ ] bootstrap first System Administrator securely
- [ ] build/start application
- [ ] confirm domain/SSL
- [ ] register PayMongo test webhook and test E2E
- [ ] enable live PayMongo only after signoff
- [ ] verify `/api/health`
- [ ] run production smoke tests
- [ ] confirm backup/rollback

Production is complete only when application, database, email, PWA, security, PayMongo, certificate verification, and chapter-scoped membership workflows pass the release checklist.
