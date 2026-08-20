# AGENTS.md — Psi Sigma Phi Philippines Inc. Digital Platform

> **Mandatory project knowledge base for all AI-assisted and human development work in this repository.**
>
> Before making any code, schema, UI, security, payment, deployment, or documentation change, read this file first. If implementation and this document conflict, stop and reconcile the conflict before proceeding. Update this file whenever an approved architectural or business decision materially changes.

## 1. Project Identity

**Project:** Psi Sigma Phi Philippines Inc. Digital Membership Platform  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Project type:** New greenfield application; it is separate from HOAHub and must not share HOAHub tenant data, database, secrets, deployment, or production resources.  
**Product form:** Mobile-first installable Progressive Web Application (PWA) plus responsive public website, Member Portal, Chapter Administration Portal, and National/System Administration Portal.

The platform is intended to become the official digital membership ecosystem for Psi Sigma Phi Philippines Inc., supporting the hierarchy:

`National Organization → Chapter → Chapter Officers/Committees → Members`

## 2. Official Branding

Use the official Psi Sigma Phi Philippines Inc. seal supplied by the product owner as the primary brand mark.

Approved design direction:

- Primary fraternity gold: `#FEC009`
- Black: `#000000`
- Charcoal: `#151515`
- White: `#FFFFFF`
- Use darker gold variants only where needed for accessible contrast.
- Style: premium, prestigious, modern, professional, fraternity/sorority identity; avoid playful consumer-app styling.
- Greek identity may use `Ψ Σ Φ` where appropriate.

The UI must remain accessible and legible. Never sacrifice contrast, form clarity, or touch usability to preserve decorative branding.

## 3. Core Product Scope

### Public website

- Home / organization landing page
- About / history / mission / vision
- Chapter directory (public data only)
- Public activities and events
- Membership information
- Online registration entry point
- Member login
- Contact information

### Membership

- Online applicant registration
- Chapter selection
- Applicant review and approval
- Member activation
- Secure login and recovery
- Member profile
- Unique membership number
- Membership status and history
- Chapter assignment and controlled transfer history

Applicant approval is required before a person becomes an official active member. Registration must never auto-create an approved member.

### Chapter management

- System Admin can create, activate, deactivate, suspend, and archive chapters.
- Each chapter has independent organization structure, officers, positions, committees, members, events, announcements, assessments, and financial reporting.
- Chapter organization structures are configurable; do not hardcode a single hierarchy for all chapters.
- Officer assignments must preserve historical terms and dates.

### Community

- Member posts
- Image uploads
- Comments
- Chapter-only and National/all-member visibility
- Official announcements
- Content moderation
- Events

### Finance

- Chapter-specific monthly dues/fund amounts
- National dues where configured
- Special assessments
- Event contributions
- Membership fees
- Donations / other collections when approved
- Member ledger
- Balances and payment history
- Digital receipts
- Reconciliation

Contribution values are configurable and effective-dated. Changing the current dues amount must never rewrite historical billing.

### PayMongo

Use PayMongo for online payments, following secure server-side integration practices.

Non-negotiable payment rules:

- Never expose PayMongo secret keys to the client.
- Browser redirects are not authoritative proof of payment.
- Confirm payment server-side using trusted PayMongo state/webhook handling.
- Webhook/event processing must be idempotent.
- Store internal transaction reference and PayMongo reference.
- Do not silently delete posted financial history.
- Payment corrections, reversals, refunds, and reconciliation changes must remain traceable.

### Certificates

- Eligible members can download Certificate of Membership.
- Certificate contains member name, member number, chapter, certificate number, issue date, authorized signatories, and official seal as applicable.
- Unique certificate number required.
- QR verification required.
- Public verification exposes only minimal appropriate information.
- Certificates can be Valid, Revoked, Superseded, or Expired if expiry is later introduced.
- Revocation must retain historical records.

## 4. PWA & Responsive Requirements

The member experience is **mobile-first** and must be installable as a PWA.

Mandatory capabilities:

- Web app manifest
- Service worker
- Standalone install experience where supported
- Android installation support
- iPhone/iPad Add to Home Screen guidance
- PWA app icon and branded install identity
- Responsive layouts from small mobile to wide desktop
- Portrait and landscape support
- Safe-area handling for notches and gesture bars
- Touch-friendly controls
- No uncontrolled horizontal overflow
- Mobile-friendly tables/cards
- Payment and registration flows must be fully usable from a phone

Supported experience targets:

- Mobile: < 768px
- Tablet: 768–1023px
- Laptop: 1024–1439px
- Desktop/wide: >= 1440px

Treat these as design guidance, not hard device assumptions. Use fluid responsive layouts.

Core workflows that MUST work completely on mobile:

- Registration
- Account activation/login/recovery
- Dashboard
- Profile
- Chapter/officer view
- Announcements
- Events
- Create post and upload image
- Comment
- View dues/balances
- Pay through PayMongo
- Payment receipt/history
- Certificate view/download/verification
- Notifications

Offline/cached mode must never create false payment or ledger states. Financial writes require live server connectivity.

## 5. Roles and Authorization Model

Initial role families:

- System / National Administrator
- National Officer
- Chapter Administrator
- Chapter Officer
- Chapter Treasurer / Finance role
- Content / Moderation role where configured
- Member
- Applicant

Permissions are configurable and scoped. Avoid role-name-only authorization.

Authorization model:

`Authenticated User + Role + Permission + Chapter Scope + Record Ownership (when relevant)`

Critical rule: authorization MUST be enforced on the server. Hiding a button in the UI is not authorization.

Chapter users must never obtain unauthorized data belonging to another chapter through UI, API, URL manipulation, exports, search, reporting, object IDs, or file access.

National cross-chapter visibility is granted only to authorized National/System roles.

## 6. Data Isolation

All chapter-owned operational entities must carry an explicit chapter scope when appropriate, including:

- Members
- Membership applications
- Posts/comments where scoped
- Announcements
- Events
- Organization positions and officer assignments
- Assessments
- Member ledger entries
- Payments and receipts
- Reports
- Chapter configuration

Never trust a client-supplied `chapterId` without verifying the authenticated user's authority for that chapter.

Prefer service-layer repository/query helpers that always require resolved scope rather than scattering ad hoc `chapterId` filters throughout UI code.

## 7. Security Baseline

Mandatory practices:

- HTTPS in production
- Secure password hashing; never store plaintext passwords
- Server-side session/auth validation
- CSRF protections appropriate to the chosen auth/session design
- Secure cookies when cookie-based sessions are used
- Input validation at trust boundaries
- Output encoding / XSS protections
- Rate limiting on login, recovery, registration, public verification, and abuse-prone endpoints
- IDOR/BOLA protections
- Least-privilege RBAC
- File type, extension, size, and content validation
- Safe image handling
- Do not serve arbitrary uploaded executable content
- Secrets via environment/secret store only
- Audit privileged and financial actions
- Do not log passwords, access tokens, payment secrets, or unnecessary personal data
- Protect privacy in reports/exports
- Backups and restoration procedures required before production launch

The platform must be designed with Philippine data privacy obligations in mind, including data minimization, purpose limitation, access control, retention, and appropriate notices/consent.

## 8. Technology Baseline

Initial implementation direction:

- Next.js with App Router
- TypeScript strict mode
- React
- Relational database
- Prisma ORM
- Server-side domain/service layer
- Schema validation at API/server-action boundaries
- PWA manifest + service worker
- Object/media storage abstraction for user images and generated documents
- PayMongo integration through server-only payment service
- Email notification abstraction
- QR generation/verification service
- PDF certificate/receipt generation service

Do not tightly couple business logic to a hosting provider. Infrastructure-specific adapters should remain replaceable.

## 9. Initial Domain Model

Expected core entities include:

- Organization
- Chapter
- User
- Role
- Permission
- UserRole / scoped role assignment
- Applicant / MembershipApplication
- Member
- MembershipHistory
- ChapterPosition
- OfficerAssignment
- Committee
- CommitteeMembership
- Post
- PostImage
- Comment
- Announcement
- Event
- AssessmentType
- Assessment
- MemberLedgerEntry
- Payment
- PaymentTransaction
- Receipt
- Certificate
- CertificateTemplate
- Notification
- AuditLog

Exact schema evolves through migrations and ADRs, but chapter isolation, financial traceability, and membership history are mandatory invariants.

## 10. Key Business Rules

1. Registration does not equal active membership.
2. Every active member has one unique member record and unique membership number.
3. A member normally has one primary chapter; transfers preserve history.
4. Chapter organization structures are configurable.
5. Monthly contribution amounts vary per chapter and are effective-dated.
6. Historical assessments are immutable with respect to later rate changes.
7. Financial access is independently assignable from ordinary chapter administration.
8. Payment success requires trusted server-side confirmation.
9. Duplicate gateway events cannot create duplicate ledger postings.
10. Completed financial history cannot be silently deleted.
11. Certificate numbers are unique.
12. QR verification checks live server records.
13. Revoked certificates remain auditable.
14. Chapter users cannot access unauthorized chapter data.
15. Officer history must be retained.
16. Administrative moderation and sensitive configuration changes must be audited.

## 11. UI/UX Direction

Member PWA recommended primary navigation:

- Home
- Community
- Events
- Payments
- More

`More` may contain Chapter, Certificate, Profile, Notifications, Settings, Logout.

Member dashboard should prioritize:

- Digital membership card
- Member number / chapter / status
- Outstanding balance
- Pay Dues
- My Certificate
- Upcoming event
- Latest announcement
- Community activity

Chapter Admin and National Admin can use adaptive sidebar layouts on larger screens, but all essential administrative workflows must remain usable on tablet/mobile.

Use cards or stacked records on narrow screens instead of forcing desktop tables horizontally.

## 12. Environments & Deployment

Required environments:

- Local development
- Test/QA or staging
- Production

Never use production secrets or production database for local development.

No production deployment should happen implicitly from an AI code change. Production deployment requires explicit approval and a validated release checklist.

## 13. Git Workflow

- Protect `main` conceptually as production-ready/integrated code.
- Develop features on branches such as `feature/...`, `fix/...`, `chore/...`.
- Use focused commits.
- Prefer pull requests for review before merge.
- Do not force-push shared branches unless explicitly approved.
- Never commit `.env`, API keys, database passwords, PayMongo secret keys, SMTP credentials, private keys, or production dumps.

## 14. Documentation That Must Stay Current

Maintain these documents as the project grows:

- `AGENTS.md` — mandatory knowledge base and approved product/engineering rules
- `README.md` — developer setup and project overview
- `docs/BRD.md` — business requirements
- `docs/IMPLEMENTATION_PLAN.md` — delivery phases and status
- `docs/ARCHITECTURE.md` — system architecture and ADR links
- `docs/SECURITY.md` — security/privacy controls
- `docs/PAYMENTS.md` — PayMongo and ledger design
- `docs/DATA_MODEL.md` — entity relationships and schema decisions
- `docs/UI_UX.md` — responsive/PWA design standards

## 15. Definition of Done for a Feature

A feature is not complete until applicable items are satisfied:

- Requirement traced to BRD/business rule
- Server-side authorization implemented
- Chapter scope enforced
- Validation implemented
- Audit events added for privileged/financial operations
- Responsive mobile behavior verified
- Loading, empty, success, and error states implemented
- Tests added/updated
- No secrets committed
- Documentation updated when behavior or architecture changes
- Financial/idempotency behavior tested for payment-related changes
- Accessibility basics checked

## 16. Current Project Status

**As of 2026-08-20:** Greenfield repository initialization and Phase 0/Phase 1 implementation are starting. No production deployment exists yet. The official brand seal has been supplied and the UI direction is black/gold/white. The initial BRD has been defined in the project conversation and will be committed under `docs/BRD.md`.

## 17. AI/Agent Instruction

For every future AI task in this repository:

1. Read `AGENTS.md` first.
2. Read the relevant document under `docs/`.
3. Inspect the current implementation before modifying it.
4. Do not invent business processes that are not in the BRD or explicitly approved.
5. Preserve chapter isolation and financial traceability.
6. Never expose secrets.
7. Do not deploy to production without explicit approval.
8. If a requirement is ambiguous and affects money, identity, legal/privacy, or cross-chapter access, stop and request clarification rather than guessing.
