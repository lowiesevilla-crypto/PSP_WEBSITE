# Architecture

## Overview

Psi Sigma Phi Philippines Inc. Digital Membership Platform is a greenfield Next.js application with one deployable web/PWA runtime and a relational MySQL-compatible database.

```text
Public Website / Installable Member PWA / Chapter Admin / National Admin
                              |
                    Next.js App Router
                              |
       Auth + RBAC + Chapter Scope + Domain Services
                              |
                         Prisma ORM
                              |
                     MySQL-compatible DB
                              |
        PayMongo / SMTP / Media Storage adapters
```

## Bounded Domains

- Identity & Authentication
- Membership Applications & Approval
- Chapters & Organization Structure
- Community & Communications
- Events
- Finance & Member Ledger
- Payments / PayMongo
- Certificates & Verification
- Notifications
- Reporting & Audit

## Scope Model

Every protected request resolves an authenticated user and explicit permission scope before domain access.

`User + Permission + Chapter Scope + Record Ownership`

National permissions may operate across chapters only when explicitly granted. Chapter users are always constrained to authorized chapter IDs.

## Data Invariants

- Registration creates an applicant only.
- Membership activation occurs only after approval.
- Member number is globally unique.
- Chapter transfers preserve history.
- Chapter rates are effective-dated.
- Historical assessments are immutable against later rate changes.
- Ledger entries are append/trace oriented.
- Payment confirmation is server-side and webhook processing is idempotent.
- Certificate verification is based on opaque tokens and live records.

## Runtime

- Node.js 22+
- Next.js 16.x
- React 19
- TypeScript strict mode
- Prisma ORM
- MySQL-compatible database

## Hosting

Production target: Hostinger at `https://psp.hoahub.tech`.

The domain layer must not depend on Hostinger-specific APIs. Host-specific concerns are isolated to deployment configuration and infrastructure adapters.

## PWA

The service worker caches only safe GET content. Authentication, payment, API, and public-verification responses are never treated as trusted offline state.

## Integrations

### PayMongo
Server-only API adapter. Checkout creation originates from an authenticated member ledger/assessment. Webhook processing validates event authenticity where supported, records gateway event IDs, and applies payment effects idempotently.

### Email
SMTP adapter used for activation, password reset, payment confirmation, and administrative notifications. Email failure must not mutate financial state.

### Media/Documents
Storage adapter is replaceable. User uploads are validated before persistence. Certificates and receipts are generated server-side and stored using opaque storage keys.
