# Implementation Plan — Psi Sigma Phi Philippines Inc. Digital Platform

**Status date:** 2026-08-20  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Primary branch:** `main`  
**Active foundation branch:** `feature/project-foundation`

## Delivery Principles

1. Mobile-first PWA is a mandatory architecture requirement.
2. National → Chapter → Member hierarchy must be enforced in the domain and authorization layers.
3. Chapter data isolation is server-side and cannot rely on UI hiding.
4. Financial history is traceable; PayMongo webhook processing is idempotent.
5. Registration does not automatically create active membership.
6. Production deployment requires explicit approval after QA/security checks.
7. `AGENTS.md` is the mandatory knowledge base for all implementation work.

---

## Phase 0 — Project Foundation

### Goal
Create a clean, secure, documented greenfield codebase and establish the PWA/UI baseline.

### Scope

- [x] Initialize repository knowledge base (`AGENTS.md`)
- [x] Create isolated implementation branch
- [x] Initialize Next.js/TypeScript project files
- [x] Add Prisma relational schema baseline
- [x] Add responsive black/gold UI system based on official Psi Sigma Phi seal
- [x] Add public landing page foundation
- [x] Add registration UI prototype
- [x] Add Member PWA dashboard prototype
- [x] Add PWA manifest
- [x] Add service worker baseline with financial/auth caching restrictions
- [x] Add health endpoint
- [ ] Add official logo and PWA icon binaries
- [ ] Add CI workflow for install/typecheck/build
- [ ] Validate clean build
- [ ] Add automated dependency/security scanning policy

### Exit Criteria

- App installs dependencies successfully.
- TypeScript passes strict typecheck.
- Next.js production build succeeds.
- PWA manifest and service worker are detected.
- Responsive smoke test passes at mobile/tablet/desktop widths.
- No production secrets exist in source control.

---

## Phase 1 — Identity, Registration & Chapter Core

### Goal
Implement the authoritative membership lifecycle and chapter-scoped access foundation.

### 1.1 Authentication

- [ ] Select and document session/auth implementation.
- [ ] Password hashing and secure credential storage.
- [ ] Login/logout.
- [ ] Email verification.
- [ ] Forgot/reset password.
- [ ] Rate limiting and account protection.
- [ ] Session invalidation.
- [ ] Audit authentication security events.

### 1.2 Online Registration

- [ ] Multi-step registration wizard.
- [ ] Personal information.
- [ ] Chapter selection.
- [ ] Membership details.
- [ ] Requirement/image/document uploads when approved.
- [ ] Review and confirmation.
- [ ] Consent/privacy notice capture as applicable.
- [ ] Duplicate applicant/member detection.
- [ ] Application status tracking.

### 1.3 Membership Approval

Workflow:

`Submitted → Under Review → Correction/Pending Requirements → Approved/Rejected → Active Member`

- [ ] Chapter reviewer queue.
- [ ] Request corrections.
- [ ] Approve/reject with reason.
- [ ] Optional National approval step configurable later.
- [ ] Generate unique membership number only on approved activation.
- [ ] Create membership history.
- [ ] Send activation notification.
- [ ] Audit all approval/status actions.

### 1.4 Chapter Core

- [ ] National/System Admin creates chapter.
- [ ] Unique chapter code.
- [ ] Chapter profile and logo.
- [ ] Active/Inactive/Suspended/Archived states.
- [ ] Assign Chapter Admin.
- [ ] Chapter-scoped membership directory.
- [ ] Member transfer workflow preserving history.

### 1.5 RBAC & Scope

- [ ] Role catalogue.
- [ ] Permission catalogue.
- [ ] National-scoped role assignment.
- [ ] Chapter-scoped role assignment.
- [ ] Authorization service.
- [ ] Central chapter-scope resolver.
- [ ] Negative cross-chapter API tests.

### Exit Criteria

- Applicant can register from mobile.
- Authorized chapter reviewer can approve.
- Approved applicant becomes a member with unique membership number.
- Chapter user cannot retrieve another chapter's data.
- National authorized user can view permitted cross-chapter information.

---

## Phase 2 — PWA Member Experience

### Goal
Move from UI prototype to production-ready installable member application.

- [ ] Install prompt component.
- [ ] iOS Add-to-Home-Screen guidance.
- [ ] Update-available handling.
- [ ] Offline shell behavior.
- [ ] Safe cache policy.
- [ ] App icons and splash assets.
- [ ] Member dashboard real data.
- [ ] Digital membership card.
- [ ] Profile management.
- [ ] Chapter profile/officer directory.
- [ ] Notification center.
- [ ] Safe-area/landscape testing.
- [ ] Accessibility pass.

### Exit Criteria

All core member actions are usable from smartphone viewport without desktop dependency.

---

## Phase 3 — Community & Communications

### Goal
Provide controlled national/chapter social engagement.

- [ ] Create/edit permitted post.
- [ ] Image upload/storage abstraction.
- [ ] Chapter vs National audience.
- [ ] Comments.
- [ ] Pinned posts.
- [ ] Hide/moderate content.
- [ ] Announcements.
- [ ] Notification triggers.
- [ ] Content authorization tests.
- [ ] File validation/security controls.

### Exit Criteria

Chapter members only receive content they are authorized to view; moderation is auditable.

---

## Phase 4 — Chapter Organization & Events

### Chapter Organization

- [ ] Configurable positions.
- [ ] Parent/child hierarchy.
- [ ] Officer assignment.
- [ ] Term start/end.
- [ ] Historical assignments.
- [ ] Committees and memberships.

### Events

- [ ] National/chapter event creation.
- [ ] Draft/publish/cancel lifecycle.
- [ ] Event detail pages.
- [ ] Event images.
- [ ] Member event list/calendar.
- [ ] Future-ready RSVP model.

---

## Phase 5 — Finance & Member Ledger

### Goal
Implement accurate chapter-specific billing before connecting the payment gateway.

- [ ] Assessment type configuration.
- [ ] Chapter monthly dues rate.
- [ ] Effective-dated rates.
- [ ] National dues where applicable.
- [ ] Special assessment.
- [ ] Event contribution.
- [ ] Member charge generation.
- [ ] Member ledger.
- [ ] Balance calculation.
- [ ] Statement of account.
- [ ] Finance RBAC independent from ordinary admin access.
- [ ] Historical rate immutability tests.

### Financial Invariants

- Historical assessments never change when current rates change.
- Ledger events are append/trace oriented.
- Financial corrections create traceable adjustment/reversal records.
- No silent deletion of posted financial history.

---

## Phase 6 — PayMongo Integration

### Goal
Secure online payment with authoritative server-side confirmation.

- [ ] Server-only PayMongo client/service.
- [ ] Create checkout/payment session.
- [ ] Pending internal Payment record before redirect/handoff.
- [ ] Webhook endpoint.
- [ ] Signature/event authenticity validation based on selected PayMongo API flow.
- [ ] Idempotency using gateway event/object identifiers.
- [ ] Payment state machine.
- [ ] Ledger posting after trusted confirmation.
- [ ] Digital receipt generation.
- [ ] Failed/cancelled transaction handling.
- [ ] Refund/reversal foundation.
- [ ] Finance reconciliation screen.
- [ ] PayMongo sandbox tests.
- [ ] Duplicate webhook tests.

### Exit Criteria

A duplicate gateway event cannot create a duplicate payment or ledger posting.

---

## Phase 7 — Certificate of Membership

- [ ] Eligibility rules.
- [ ] Unique certificate numbering.
- [ ] PDF template.
- [ ] Official seal/signatories.
- [ ] QR verification token.
- [ ] Public minimal-data verification endpoint/page.
- [ ] Download/share from PWA.
- [ ] Revoke/supersede lifecycle.
- [ ] Certificate history.
- [ ] Audit issuance/revocation.

---

## Phase 8 — Admin Dashboards, Reports & Audit

### Chapter Dashboard

- [ ] Member statistics.
- [ ] Pending applicants.
- [ ] Current officers.
- [ ] Assessments.
- [ ] Collections/outstanding balances.
- [ ] Events/community moderation.

### National Dashboard

- [ ] Chapter directory/status.
- [ ] National membership statistics.
- [ ] Membership by chapter.
- [ ] Cross-chapter collections for authorized roles.
- [ ] National announcements/events.

### Reports

- [ ] Member list.
- [ ] Application report.
- [ ] Membership status report.
- [ ] Assessment/collection report.
- [ ] Outstanding balances.
- [ ] PayMongo transaction/reconciliation report.
- [ ] Certificate report.
- [ ] Export authorization/privacy controls.

### Audit

- [ ] Searchable audit log.
- [ ] Sensitive admin actions.
- [ ] Financial actions.
- [ ] Permission/role changes.
- [ ] Moderation actions.

---

## Phase 9 — QA, Security & Production Readiness

### Functional QA

- [ ] E2E registration → approval → activation.
- [ ] Member login/profile.
- [ ] Chapter creation/admin assignment.
- [ ] Post/comment/event workflows.
- [ ] Billing/payment/receipt workflow.
- [ ] Certificate verification.

### Security QA

- [ ] Cross-chapter IDOR/BOLA tests.
- [ ] Role escalation tests.
- [ ] Authentication rate-limit tests.
- [ ] File upload tests.
- [ ] Webhook replay/duplicate tests.
- [ ] Secret exposure review.
- [ ] Security headers/CSP strategy.
- [ ] Dependency audit.

### PWA / UX QA

Test representative viewports:

- 360px mobile
- 390/430px mobile
- 768px tablet
- 1024px tablet/laptop
- 1366px laptop
- 1440/1920px desktop

Also test portrait/landscape and iOS/Android install behavior.

### Operations

- [ ] Production database provisioning.
- [ ] Backup schedule.
- [ ] Restore test.
- [ ] Object storage.
- [ ] Error monitoring.
- [ ] Structured logs.
- [ ] SMTP/email configuration.
- [ ] PayMongo production credentials.
- [ ] Domain/TLS.
- [ ] Deployment and rollback runbook.

---

## Phase 10 — Controlled Go-Live

- [ ] Final UAT signoff.
- [ ] Security signoff.
- [ ] Data/privacy review.
- [ ] Production configuration validated.
- [ ] Backup verified.
- [ ] PayMongo production smoke test with controlled amount.
- [ ] Initial National/System Admin created securely.
- [ ] Initial chapter records loaded.
- [ ] Monitoring active.
- [ ] Explicit production deployment approval.

---

## Future Roadmap

- Digital QR Member ID
- Event RSVP and QR attendance
- Push notifications
- Passkeys/device biometrics
- Elections/voting
- Donations/fundraising
- Merchandise ordering
- Chapter/national document repository
- Photo albums
- Advanced analytics
- AI member assistant using only authorized organization/chapter content

---

## Current Active Sprint — Foundation Sprint

### In Progress

- Repository/project initialization
- PWA baseline
- Responsive public website
- Member dashboard shell
- Online registration shell
- Initial relational data model
- Technical/business documentation

### Next Engineering Tasks

1. Commit official logo and generated PWA icons.
2. Add CI build/typecheck workflow.
3. Validate Prisma schema and production build.
4. Establish database adapter/client.
5. Implement authentication architecture.
6. Implement Chapter service + server-side scope resolver.
7. Implement real registration persistence and validation.
8. Build Chapter Admin applicant review queue.
