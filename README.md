# Psi Sigma Phi Philippines Inc. Digital Membership Platform

Greenfield, mobile-first Progressive Web Application (PWA) for Psi Sigma Phi Philippines Inc.

The product combines:

- Public organization website
- Online membership registration and approval
- Installable Member PWA
- Multi-chapter membership management
- Configurable chapter organization/officers
- Community posts, images, comments, announcements, and events
- Chapter-specific monthly dues and other assessments
- PayMongo online payment integration
- Digital receipts and member ledger
- QR-verifiable Certificate of Membership
- Chapter Administration Portal
- National/System Administration Portal

## Mandatory Knowledge Base

**Read [`AGENTS.md`](./AGENTS.md) before making any project change.** It contains the approved business rules, architecture constraints, security requirements, chapter-isolation rules, branding, PWA requirements, and Git workflow.

## Technology Baseline

- Next.js App Router
- React + TypeScript strict mode
- Prisma ORM
- Relational database (initial schema targets MySQL-compatible SQL)
- Zod boundary validation
- Server-side RBAC + chapter scoping
- PWA manifest + service worker
- PayMongo server/webhook integration
- Object storage abstraction for media/documents

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

Database generation after configuring `DATABASE_URL`:

```bash
npx prisma generate
npx prisma migrate dev
```

## Environment Rules

Never commit real secrets. Keep local, QA/staging, and production environments isolated.

Required production secrets include database credentials, auth secret, PayMongo secret/webhook secret, SMTP credentials, and object-storage credentials.

## Branching

- `main` — integrated/release-ready branch
- `feature/*` — new functionality
- `fix/*` — defects
- `chore/*` — technical housekeeping

Initial implementation is being developed on `feature/project-foundation`.

## Brand

Primary palette is derived from the official Psi Sigma Phi seal:

- Gold `#FEC009`
- Black `#000000`
- Charcoal `#151515`
- White `#FFFFFF`

## Documentation

- `AGENTS.md` — mandatory project knowledge base
- `docs/BRD.md` — business requirements
- `docs/IMPLEMENTATION_PLAN.md` — phased delivery plan/status
- `docs/ARCHITECTURE.md` — architecture
- `docs/SECURITY.md` — security/privacy controls
- `docs/PAYMENTS.md` — PayMongo and financial integrity
- `docs/DATA_MODEL.md` — core entities/invariants
- `docs/UI_UX.md` — responsive/PWA UX standards
