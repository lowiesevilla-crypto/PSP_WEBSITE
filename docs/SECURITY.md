# PSP Security & Privacy Baseline

## Authorization Model

Every protected operation is authorized server-side using:

`Authenticated User + Permission + Chapter Scope + Record Ownership (when applicable)`

Role names alone are not authorization. National-scoped assignments may authorize approved cross-chapter actions. Chapter-scoped assignments authorize only the exact chapter.

## Identity

- Passwords are never stored in plaintext.
- Current implementation uses memory-bounded scrypt with per-password random salts.
- Session cookies are signed, HTTP-only, SameSite-protected, and secure in production.
- Session payload contains a password-hash fingerprint so password activation/reset invalidates older sessions.
- Login, activation, recovery, and privileged state changes are auditable.
- Abuse-prone auth flows are rate-limited using server-side audit-event state.
- Forgot-password responses avoid account enumeration.

## Registration Privacy

The registration flow collects only the approved business fields recorded in `AGENTS.md`.

Final submission requires two separate acknowledgements:

1. application accuracy/review acknowledgement
2. Data Privacy Notice acknowledgement

The server validates both and records the acknowledged notice version/timestamp. Current privacy notice version: `2026-08-20-v1`.

## Chapter Isolation

Chapter isolation is enforced in APIs and server-rendered pages. Never accept a client-supplied chapter identifier without confirming the caller's permission/scope.

Negative scenarios that must fail include:

- Chapter Admin retrieving another chapter's applicant/member by ID
- Chapter Finance retrieving another chapter's assessment/payment
- Chapter content moderator editing another chapter's post/event
- member retrieving another chapter's private media
- export/report endpoints bypassing chapter scope

## State-Changing Requests

- Validate content type and input schema.
- Apply origin/CSRF protections appropriate to cookie-authenticated browser requests.
- Re-check authorization at the server boundary.
- Never trust hidden UI controls as a security mechanism.

## Secrets

Server-only secrets include database password, `AUTH_SECRET`, SMTP password, PayMongo secret API key, PayMongo webhook signing secret, initial bootstrap administrator password, and future storage access credentials.

No server secret may use a `NEXT_PUBLIC_` prefix.

## PayMongo

- Create checkout from the server only.
- Use idempotency keys on create requests.
- Browser redirect is not proof of payment.
- Verify `Paymongo-Signature` against the raw request body before parsing.
- Use HMAC-SHA256 and timing-safe comparison.
- Enforce webhook timestamp tolerance.
- Process `checkout_session.payment.paid` idempotently.
- Do not double-create ledger entries or receipts on retries.
- Test mode must pass before live credentials are enabled.

## File Uploads

Community/event images require authenticated authorization, maximum size, MIME allowlist, magic-byte validation, randomized storage keys, no executable types, private persistent storage, authorization-aware delivery for member-only content, and no user-controlled filesystem paths.

## Dependency Security

CI validates Prisma, applies the schema against MySQL, seeds baseline records, validates System Admin bootstrap, runs strict TypeScript, builds production output, and performs a production runtime dependency audit.

The documented Prisma CLI development-tool advisory exception must never be treated as a runtime exception. Remove it when the upstream toolchain is patched.

## HTTP Security

Production requires HTTPS. Responses use controls including `X-Content-Type-Options: nosniff`, strict referrer policy, anti-framing controls, and restrictive permissions policy. Sensitive API responses use `Cache-Control: no-store` where applicable.

## Data Protection

Design supports Philippine privacy obligations through purpose limitation, data minimization, notices/acknowledgements, access control, auditability, retention discipline, restricted exports, and incident-response readiness. Personal member contact information is not public by default.

## Financial Integrity

- Financial history is traceable and non-destructive.
- Historical assessments are not rewritten when current rates change.
- Payment success requires trusted server/webhook confirmation.
- Refunds/reversals/adjustments are explicit records.
- Finance permissions are independent from ordinary chapter content/member administration.

## Production Gate

Before release:

- CI green
- MySQL schema/seed/bootstrap checks pass
- strict TypeScript/build pass
- runtime dependency audit passes
- chapter-scope negative tests pass
- registration/privacy E2E passes
- authentication/activation/recovery E2E passes
- PayMongo test-mode signature/idempotency tests pass
- no secrets in source
- production database backup/rollback plan confirmed
- HTTPS active on `https://psp.hoahub.tech`
