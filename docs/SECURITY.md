# Security & Privacy Baseline

## Scope

This document implements the security requirements in `AGENTS.md` for the Psi Sigma Phi Philippines Inc. Digital Membership Platform.

## Core Controls

- HTTPS only in production.
- Server-side authentication and authorization.
- Secure, HTTP-only, SameSite cookies for session identifiers.
- Passwords hashed with an adaptive password hashing algorithm; plaintext passwords are never stored or logged.
- Zod validation at API trust boundaries.
- Origin/CSRF checks for state-changing browser requests.
- Rate limiting for login, registration, password reset, and public verification endpoints.
- Chapter-scoped authorization for all chapter-owned records.
- IDOR/BOLA tests for cross-chapter resources.
- Sensitive and financial actions recorded in `AuditLog`.
- No PayMongo secret, SMTP password, database credential, private signing key, or production secret in source control.
- Uploaded media must be validated for allowed type, size, and storage location before persistence.
- Financial and identity responses use `Cache-Control: no-store`.

## Dependency Security

CI performs Prisma validation, TypeScript validation, production build, and a production dependency audit.

As of 2026-08-20, npm reports `GHSA-ggr8-5vv4-36mx` through Prisma's CLI/config development toolchain (`prisma`, `@prisma/config`, `deepmerge-ts`). The Prisma CLI is a development/migration tool and is not required by the deployed runtime. The CI gate therefore allows only this named development-tool chain while continuing to fail for any other HIGH or CRITICAL runtime finding. The exception must be removed when the upstream toolchain is patched.

## Privacy

The platform is designed to support Philippine privacy obligations through:

- Purpose limitation and data minimization.
- Chapter-scoped least privilege.
- Limited public certificate verification fields.
- Privacy-safe reports and exports.
- Retention-aware archival rather than silent deletion of auditable records.
- No exposure of member contact data to ordinary public users.

## Payment Security

- PayMongo secret keys are server-only.
- Browser redirects are not authoritative payment confirmation.
- Payment webhooks are processed idempotently.
- Gateway references and internal references are retained.
- Financial history is append/trace oriented; posted records are not silently deleted.
- Refunds/reversals create auditable financial events.

## Production Gate

Before production deployment:

1. CI must be green.
2. Cross-chapter authorization tests must pass.
3. No production secrets may exist in Git history.
4. Hostinger HTTPS/TLS must be active for `https://psp.hoahub.tech`.
5. Production database backup/restore must be verified.
6. PayMongo test-mode E2E must pass before live credentials are enabled.
7. Production smoke testing must be controlled and recorded.
