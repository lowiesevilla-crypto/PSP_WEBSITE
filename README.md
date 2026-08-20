# Psi Sigma Phi Philippines Inc. Digital Membership Platform

Mobile-first installable Progressive Web Application (PWA) and administration platform for Psi Sigma Phi Philippines Inc.

## Production Target

- Host: Hostinger
- Canonical URL: `https://psp.hoahub.tech`
- Repository: `lowiesevilla-crypto/PSP_WEBSITE`
- Domain mapping: confirmed by the product owner on 2026-08-20

## Technology

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- MySQL
- Prisma ORM
- Zod validation
- PWA manifest + service worker
- Server-side RBAC and chapter scoping
- Hostinger SMTP adapter
- PayMongo Hosted Checkout v2 integration

## Development

1. Copy `.env.example` to `.env.local` and provide isolated development values.
2. `npm install`
3. `npx prisma generate`
4. `npx prisma db push`
5. `npm run seed`
6. Set temporary `BOOTSTRAP_ADMIN_*` environment values and run `npm run bootstrap-admin` for the first local System Administrator. Remove the bootstrap password afterward.
7. `npm run dev`

## CI Validation

GitHub Actions validates the project against MySQL 8.4, including:

- Prisma schema validation
- Prisma Client generation
- database schema application
- baseline seed
- secure System Administrator bootstrap
- strict TypeScript typecheck
- production Next.js build
- runtime/security smoke checks
- cross-chapter isolation negative tests
- production runtime dependency audit gate

## Registration

Approved member registration inputs, in order:

1. First Name
2. Last Name
3. MI
4. Address
5. Email
6. Mobile No.
7. Date Survive
8. Location
9. PSP Birthday Code
10. Date of Birth
11. Select Chapter

The final review requires two distinct acknowledgements:

- Membership Application Acknowledgement
- Data Privacy Acknowledgement

Registration creates an application only. Official membership and a platform membership number are created only after authorized approval.

## Product Scope

- Public organization website
- Online membership registration and approval
- Installable Member PWA
- Multi-chapter membership administration
- Configurable chapter organization/officers/committees
- Community posts/images/comments/announcements
- National/chapter events
- Chapter-specific dues and assessments
- Member ledger and payment history
- PayMongo Hosted Checkout v2 online payments
- Digital receipts
- QR-verifiable membership certificates
- National/Chapter reporting and audit
- Notifications

## Knowledge Base

**Read [`AGENTS.md`](./AGENTS.md) before any implementation, schema, security, payment, UI, documentation, or deployment change.**

Then read **[`docs/STATUS.md`](./docs/STATUS.md)** for the authoritative current delivery status and pending production validation gates. Detailed requirements and runbooks live under `docs/`.

Documentation updates are part of Definition of Done for material work. Do not rely on chat history as the authoritative status when repository documentation can be reconciled.

## Branching

- `main` — integrated/release-ready code
- `feature/*` — new functionality
- `fix/*` — defect remediation
- `docs/*` — documentation/status reconciliation
- `chore/*` — technical housekeeping

## Brand

- Gold `#FEC009`
- Black `#000000`
- Charcoal `#151515`
- White `#FFFFFF`

Use the official Psi Sigma Phi seal as the primary brand mark.
