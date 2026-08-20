# AGENTS.md — Psi Sigma Phi Philippines Inc. Digital Platform

> **Mandatory project knowledge base.** Every AI agent and developer must read this file before changing code, schema, UI, security, payments, deployment, or documentation. Update it whenever an approved business or architecture decision changes.

## 1. Project Identity

- **Project:** Psi Sigma Phi Philippines Inc. Digital Membership Platform
- **Repository:** `lowiesevilla-crypto/PSP_WEBSITE`
- **Project type:** Greenfield application; completely separate from HOAHub application data, database, secrets, and runtime.
- **Product form:** Public website + installable mobile-first PWA + Member Portal + Chapter Admin Portal + National/System Admin Portal.
- **Organization hierarchy:** `National Organization → Chapter → Officers/Committees → Members`

## 2. Production Hosting & URL

- **Production hosting target:** Hostinger
- **Official production URL:** `https://psp.hoahub.tech`
- This URL is the canonical production origin for the application unless the product owner explicitly changes it.
- Production PWA metadata, email links, PayMongo success/cancel URLs, PayMongo webhook configuration, certificate QR verification links, receipt links, and public verification URLs must use `https://psp.hoahub.tech`.
- Do not publish to a different production hostname without explicit approval.
- Local development uses `http://localhost:3000`.
- QA/staging, when introduced, must use a separate hostname and separate secrets/database.
- Production deployment requires explicit approval after QA/security checks. Do not auto-deploy production merely because code was committed.

## 3. Official Branding

Use the official Psi Sigma Phi Philippines Inc. seal supplied by the product owner as the primary mark.

Approved palette:

- Gold: `#FEC009`
- Black: `#000000`
- Charcoal: `#151515`
- White: `#FFFFFF`

Design direction: premium, prestigious, modern, professional fraternity/sorority identity. Greek identity may use `Ψ Σ Φ`. Maintain accessible contrast and touch usability.

## 4. Core Product Scope

### Public Website

- Home / organization landing page
- About / history / mission / vision
- Public chapter directory
- Public activities/events
- Membership information
- Online registration
- Member login
- Contact information

### Membership

- Online application
- Chapter selection
- Applicant review/approval
- Member activation
- Secure login/recovery
- Profile
- Unique membership number
- Membership status/history
- Chapter assignment and transfer history

**Registration never automatically creates an active member.** Approval is required.

### Chapter Management

- System Admin creates/activates/deactivates/suspends/archives chapters.
- Each chapter may have different officers, positions, committees, members, events, announcements, contribution rates, assessments, and reports.
- Organization structures are configurable; never hardcode one structure for all chapters.
- Officer assignments must retain term history.

### Community

- Member posts
- Image uploads
- Comments
- Chapter-only and National/all-member visibility
- Announcements
- Content moderation
- Events

### Finance

- Chapter-specific monthly dues/fund
- National dues when configured
- Special assessments
- Event contributions
- Membership fees
- Donations/other approved collections
- Member ledger
- Balances/payment history
- Digital receipts
- Reconciliation

Rates are configurable and **effective-dated**. Changing a current rate must never alter historical assessments.

### PayMongo

Use PayMongo for online payments.

Non-negotiable controls:

- Secret keys are server-only.
- Browser redirect is not proof of successful payment.
- Confirm payment using trusted server-side PayMongo state/webhook processing.
- Webhook/event processing is idempotent.
- Store internal transaction reference and PayMongo reference.
- Never silently delete posted financial history.
- Refunds, reversals, corrections, and reconciliation changes remain traceable.
- Production callback/webhook URLs use the `https://psp.hoahub.tech` origin.

### Certificates

- Eligible members can download Certificate of Membership.
- Include member name, member number, chapter, unique certificate number, issue date, signatories, and official seal as applicable.
- QR verification is mandatory.
- Public verification exposes only minimal appropriate data.
- Statuses may include Valid, Revoked, Superseded, and Expired if expiry is enabled.
- Revocation never destroys historical records.
- Production QR verification must resolve under `https://psp.hoahub.tech`.

## 5. PWA & Responsive Requirements

The member experience is **mobile-first and installable as a PWA**.

Mandatory:

- Web app manifest
- Service worker
- Standalone install where supported
- Android installation support
- iPhone/iPad Add-to-Home-Screen guidance
- Branded app icon
- Responsive mobile/tablet/laptop/desktop layouts
- Portrait/landscape support
- Safe-area handling
- Touch-friendly controls
- No uncontrolled horizontal overflow
- Mobile-friendly tables/cards

Reference viewport ranges:

- Mobile: `<768px`
- Tablet: `768–1023px`
- Laptop: `1024–1439px`
- Desktop/wide: `>=1440px`

These are guidance, not rigid device assumptions.

Core flows that must work fully on mobile:

- Registration
- Activation/login/recovery
- Dashboard/profile
- Chapter/officer view
- Announcements/events
- Post/image upload/comment
- Dues/balance/payment
- Receipt/history
- Certificate view/download/verification
- Notifications

Offline/cache behavior must never create false financial state. Financial writes require live server connectivity.

## 6. Roles & Authorization

Initial role families:

- System/National Administrator
- National Officer
- Chapter Administrator
- Chapter Officer
- Chapter Treasurer/Finance
- Content/Moderation role when configured
- Member
- Applicant

Permissions are configurable and scoped. Avoid authorization based only on role names.

Authorization model:

`Authenticated User + Role + Permission + Chapter Scope + Record Ownership (when applicable)`

Authorization must be enforced server-side. UI hiding is not authorization.

Chapter users must never obtain another chapter's restricted information via UI, API, URL manipulation, exports, search, reports, object IDs, or files. National cross-chapter access requires explicit National/System permission.

## 7. Data Isolation

All applicable chapter-owned entities carry explicit chapter scope, including:

- Members/applications
- Posts/comments
- Announcements/events
- Positions/officer assignments
- Assessments/rates
- Ledger entries
- Payments/receipts
- Certificates
- Reports/configuration

Never trust a client-supplied `chapterId` without verifying authenticated authority. Prefer central scope/service helpers over ad-hoc filters.

## 8. Security Baseline

Mandatory:

- HTTPS in production
- Strong password hashing; no plaintext passwords
- Server-side session/auth validation
- Appropriate CSRF protection
- Secure cookies for cookie sessions
- Input validation at trust boundaries
- XSS/output safety
- Rate limiting for login, recovery, registration, verification, abuse-prone APIs
- IDOR/BOLA protection
- Least-privilege RBAC
- Secure file type/size/content validation
- No arbitrary executable uploads
- Secrets only via environment/secret store
- Audit privileged/financial actions
- Never log passwords, tokens, PayMongo secrets, or unnecessary personal data
- Privacy-safe exports/reports
- Backups and tested recovery before production

Design for Philippine privacy obligations: purpose limitation, data minimization, access control, retention, appropriate notices/consent, and incident handling.

## 9. Technology Baseline

Initial direction:

- Next.js App Router
- React
- TypeScript strict mode
- Relational database
- Prisma ORM
- Server-side service/domain layer
- Zod/schema validation at API/server-action boundaries
- PWA manifest + service worker
- Media/object storage abstraction
- Server-only PayMongo service
- Email notification abstraction
- QR generation/verification
- PDF certificate/receipt generation

Do not tightly couple domain logic to Hostinger. Infrastructure adapters should remain replaceable.

## 10. Initial Domain Model

Expected entities:

- Organization
- Chapter
- User
- Role / Permission / scoped assignment
- MembershipApplication
- Member
- MembershipHistory
- ChapterPosition
- OfficerAssignment
- Committee / CommitteeMembership
- Post / PostImage / Comment
- Announcement
- Event
- AssessmentType / AssessmentRate / Assessment
- MemberLedgerEntry
- Payment / PaymentTransaction / Receipt
- Certificate / CertificateTemplate
- Notification
- AuditLog

Exact schema may evolve through migrations/ADRs, but chapter isolation, membership history, and financial traceability are invariants.

## 11. Key Business Rules

1. Registration does not equal active membership.
2. Every active member has a unique member record and membership number.
3. A member normally has one primary chapter; transfers preserve history.
4. Chapter organization structures are configurable.
5. Monthly contribution rates vary by chapter and are effective-dated.
6. Historical assessments do not change when new rates are configured.
7. Financial access is independently assignable from ordinary administration.
8. Payment success requires trusted server-side confirmation.
9. Duplicate gateway events cannot create duplicate payments/ledger postings.
10. Posted financial history cannot be silently deleted.
11. Certificate numbers are unique.
12. QR verification checks live records.
13. Revoked certificates remain auditable.
14. Chapter users cannot access unauthorized chapter data.
15. Officer history is retained.
16. Moderation and sensitive configuration changes are audited.

## 12. UI/UX Direction

Recommended Member PWA navigation:

- Home
- Community
- Events
- Payments
- More

`More`: Chapter, Certificate, Profile, Notifications, Settings, Logout.

Member dashboard prioritizes:

- Digital membership card
- Member number/chapter/status
- Outstanding balance
- Pay Dues
- My Certificate
- Upcoming event
- Latest announcement
- Community activity

Chapter/National Admin may use adaptive sidebars on large screens but essential administration remains usable on tablet/mobile. Convert wide tables to cards/stacked records where appropriate.

## 13. Environments & Deployment

Required environments:

- Local
- QA/Staging
- Production

Rules:

- Never use production database/secrets locally.
- Canonical production origin is `https://psp.hoahub.tech`.
- Hostinger is the target production host.
- Deployment configuration must support Next.js Node runtime, environment secrets, persistent database connectivity, HTTPS, and application restart/rollback procedures.
- Production deployment requires explicit approval and a validated release checklist.

## 14. Git Workflow

- `main` is integrated/release-ready.
- Use `feature/*`, `fix/*`, `chore/*` branches.
- Use focused commits and PR review before merge when practical.
- Do not force-push shared branches unless explicitly approved.
- Never commit `.env`, passwords, PayMongo secret keys, SMTP credentials, private keys, or production dumps.

## 15. Documentation That Must Stay Current

- `AGENTS.md` — mandatory knowledge base
- `README.md` — setup/overview
- `docs/BRD.md` — business requirements
- `docs/IMPLEMENTATION_PLAN.md` — phases/status
- `docs/ARCHITECTURE.md` — architecture/ADRs
- `docs/SECURITY.md` — security/privacy
- `docs/PAYMENTS.md` — PayMongo/ledger
- `docs/DATA_MODEL.md` — entities/invariants
- `docs/UI_UX.md` — responsive/PWA design
- `docs/DEPLOYMENT.md` — Hostinger deployment and production domain

## 16. Definition of Done

Applicable feature completion requires:

- Requirement traced to BRD/business rule
- Server authorization implemented
- Chapter scope enforced
- Validation implemented
- Audit events for privileged/financial operations
- Mobile responsiveness verified
- Loading/empty/success/error states
- Tests updated
- No secrets committed
- Documentation updated
- Payment idempotency tests for financial features
- Accessibility basics checked

## 17. Current Project Status

**2026-08-20:** Greenfield repository initialization and Phase 0/Phase 1 implementation are underway. No production deployment exists yet. Official seal supplied. UI direction is black/gold/white. Target production host is Hostinger at `https://psp.hoahub.tech`.

## 18. AI / Agent Operating Rules

For every future task:

1. Read `AGENTS.md` first.
2. Read relevant `docs/` files.
3. Inspect current implementation before modifying it.
4. Do not invent business processes not present in the BRD or explicitly approved.
5. Preserve chapter isolation and financial traceability.
6. Never expose secrets.
7. Use `https://psp.hoahub.tech` for approved production URLs/integrations.
8. Do not deploy production without explicit approval.
9. If ambiguity affects money, identity, legal/privacy, or cross-chapter access, stop and request clarification rather than guessing.
