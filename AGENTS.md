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
- This URL is the canonical production origin unless explicitly changed by the product owner.
- Production PWA metadata, email links, PayMongo success/cancel URLs, webhook configuration, certificate QR verification links, receipt links, and public verification URLs use `https://psp.hoahub.tech`.
- Do not publish to a different production hostname without explicit approval.
- Local development uses `http://localhost:3000`.
- QA/staging, when introduced, uses a separate hostname and separate secrets/database.
- Production deployment requires CI, QA, security, database, and payment readiness gates.

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
- Member profile
- Unique membership number
- Membership status/history
- Chapter assignment and transfer history

**Registration never automatically creates an active member. Approval is required.**

### Approved Member Registration Fields

The online registration form uses the following business-approved fields, in this order:

1. First Name
2. Last Name
3. MI (Middle Initial)
4. Address
5. Email
6. Mobile No.
7. Date Survive
8. Location (survive/initiation location)
9. PSP Birthday Code
10. Date of Birth
11. Select Chapter

Do not reintroduce suffix, full middle name, or other registration fields without approval. PSP-specific data (`dateSurvive`, `surviveLocation`, `pspBirthdayCode`) must survive approval into the official Member record.

### Registration Acknowledgements

The final registration review step requires **two separate checkboxes**:

1. Membership Application Acknowledgement — confirms information accuracy and understanding that submission is subject to approval.
2. Data Privacy Acknowledgement — confirms the applicant has read and understood the PSP Data Privacy Notice.

Both are required in the UI **and** validated server-side. Record the privacy acknowledgement timestamp and privacy notice version for auditability. Current notice version: `2026-08-20-v1`.

### Chapter Management

- System Admin creates/activates/deactivates/suspends/archives chapters.
- Each chapter may have different officers, positions, committees, members, events, announcements, contribution rates, assessments, and reports.
- Organization structures are configurable; never hardcode one structure for all chapters.
- Officer assignments retain term history.

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

Current integration direction for new development: **PayMongo Hosted Checkout v2**.

Non-negotiable controls:

- Secret keys are server-only.
- Browser redirect is not proof of successful payment.
- Create an internal pending Payment before handing off to PayMongo.
- Use PayMongo resource-creation idempotency keys.
- Confirm payment using trusted server-side webhook processing.
- Verify the raw webhook body against `Paymongo-Signature` with the endpoint signing secret before parsing/processing.
- `checkout_session.payment.paid` is the authoritative Hosted Checkout success event.
- Webhook/event processing is idempotent.
- Store internal transaction reference and PayMongo reference/session ID.
- Never silently delete posted financial history.
- Refunds, reversals, corrections, and reconciliation changes remain traceable.
- Production webhook URL: `https://psp.hoahub.tech/api/webhooks/paymongo`.

### Certificates

- Eligible members can download Certificate of Membership.
- Include member name, member number, chapter, unique certificate number, issue date, signatories, and official seal as applicable.
- QR verification is mandatory.
- Public verification exposes only minimal appropriate data.
- Statuses may include Valid, Revoked, Superseded, and Expired if expiry is enabled.
- Revocation never destroys historical records.
- Production QR verification resolves under `https://psp.hoahub.tech`.

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
- Appropriate CSRF/origin protections for state-changing browser requests
- Secure cookies for cookie sessions
- Input validation at trust boundaries
- XSS/output safety
- Rate limiting for login, recovery, registration, verification, and abuse-prone APIs
- IDOR/BOLA protection
- Least-privilege RBAC
- Secure file type/size/content validation
- No arbitrary executable uploads
- Secrets only via environment/secret store
- Audit privileged/financial actions
- Never log passwords, tokens, PayMongo secrets, or unnecessary personal data
- Privacy-safe exports/reports
- Backups and tested recovery before production

Design for Philippine privacy obligations: purpose limitation, data minimization, access control, retention, appropriate notices/acknowledgement, and incident handling.

## 9. Technology Baseline

- Next.js App Router 16.x
- React 19.x
- TypeScript strict mode
- MySQL
- Prisma ORM
- Server-side service/domain layer
- Zod validation at API/server boundaries
- PWA manifest + service worker
- Media/object storage abstraction
- Server-only PayMongo service
- Email notification abstraction
- QR generation/verification
- PDF certificate/receipt generation

Do not tightly couple domain logic to Hostinger. Infrastructure adapters remain replaceable.

## 10. Domain Model

Core entities include:

- Organization
- Chapters
- User
- Role / Permission / UserRoleAssignment
- MembershipApplication
- Member
- MembershipHistory
- ChapterPosition
- OfficerAssignment
- Post / PostImage / Comment
- Announcement
- Event
- AssessmentType / AssessmentRate / Assessment
- MemberLedgerEntry
- Payment / PaymentTransaction / Receipt
- Certificate
- AuditLog

Add Committee/CommitteeMembership and Notification entities when those modules are implemented.

## 11. Financial Invariants

- Posted financial history is append/trace oriented.
- Historical assessment values are immutable when current rates change.
- Corrections use adjustment/reversal/refund records rather than destructive edits.
- Payment is marked paid only after trusted PayMongo server/webhook confirmation.
- Webhook processing is idempotent by event and/or gateway object identifiers.
- Receipt creation is unique per successful internal Payment.
- Chapter financial scope is validated server-side.

## 12. Development & Deployment Rules

- Read this `AGENTS.md` before every implementation change.
- Keep `main` releasable; use feature/fix branches and CI.
- No production secrets in source control.
- Use Node.js 22+ for build/runtime unless the approved production environment requires a later compatible LTS.
- Run Prisma validation, schema application against CI MySQL, seed checks, strict TypeScript, production build, and runtime dependency audit in CI.
- Production database is separate from development/QA.
- Production deployment target is `https://psp.hoahub.tech` on Hostinger.
- Production PayMongo live credentials are not enabled until test-mode E2E passes.
- Run post-deployment `/api/health` and E2E smoke checks before declaring release complete.
