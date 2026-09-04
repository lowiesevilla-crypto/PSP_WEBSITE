# PSP Security & Privacy Baseline

## Authorization Model

Every protected operation is authorized server-side using:

`Authenticated User + Permission + Chapter Scope + Record Ownership (when applicable)`

Role names/UI hiding are not authorization. National-scoped assignments may authorize approved cross-chapter actions; chapter-scoped assignments authorize only the exact chapter.

## Identity / Sessions / Passkeys

- Passwords are never stored in plaintext; current implementation uses memory-bounded scrypt with per-password random salts.
- Session cookies are signed, HTTP-only, SameSite-protected and secure in production.
- Password fingerprinting invalidates older password-bound sessions after password activation/reset.
- Login, activation, recovery, passkey enrollment/authentication/revocation and privileged state changes are auditable.
- Abuse-prone auth flows are rate-limited using server-side state/audit evidence.
- Forgot-password responses avoid account enumeration.
- Passkeys use WebAuthn discoverable credentials and require user verification.
- A successful passkey ceremony establishes the normal PSP server session; it does not bypass RBAC/chapter scope.
- Credential IDs/public keys/counters and appropriate authenticator metadata may be stored; private key material remains in the user's authenticator/device.
- After passkey is enabled on a device, login may hide email/password by default, but explicit password recovery fallback remains available.

## Registration Privacy

The registration flow collects only approved fields in `AGENTS.md`. Final submission requires separate Membership Application and Data Privacy acknowledgements. Server records acknowledgement version/timestamp. Current privacy notice version: `2026-08-20-v1`.

Approval email must not disclose plaintext passwords or unnecessary sensitive data.

## Chapter Isolation

Never accept client-supplied chapter scope without confirming caller authority. For member financial operations, derive chapter from authenticated active membership.

Negative scenarios that must fail include:

- Chapter Admin retrieving another chapter's applicant/member/payment config by ID;
- Chapter Finance retrieving another chapter's assessment/payment/receipt;
- chapter webhook processing a Payment Intent belonging to another chapter;
- member choosing another chapter child PayMongo account;
- content moderator editing another chapter's content;
- member retrieving another chapter's private media;
- export/report endpoints bypassing chapter scope.

## Member Identity Records

Member self-service may update approved personal/contact fields but cannot alter chapter, membership number/code, PSP Birthday Code or credential email. Digital ID and certificate verification endpoints expose minimum information necessary for public verification.

## State-Changing Requests

- Validate content type and input schema.
- Apply origin/CSRF protections appropriate to cookie-authenticated browser requests.
- Re-check authorization at server boundary.
- Do not trust disabled/hidden client fields as a security mechanism.
- Financial writes require live server connectivity.

## Secrets / Encryption

Server-only secrets include database credentials, `AUTH_SECRET`, SMTP password, `PAYMONGO_PLATFORM_SECRET_KEY`, child webhook signing secrets, `PAYMENT_CONFIG_ENCRYPTION_KEY`, bootstrap credentials and future storage credentials.

Rules:

- no server secret may use a `NEXT_PUBLIC_` prefix;
- no secret in source/GitHub/browser/PWA/manifest/service worker/logs/screenshots;
- any secret exposed in chat/screenshots/tickets/logs is treated as compromised and rotated before final signoff;
- `PAYMENT_CONFIG_ENCRYPTION_KEY` must be stable, random and at least 32 characters;
- linked chapter Account ID (`org_*`) and child webhook secret are encrypted at rest using AES-256-GCM;
- no chapter API secret key is stored in linked-account mode.

## PayMongo Platforms / Split Payment Security

PSP is the parent/platform account and chapters are linked child accounts.

Non-negotiable controls:

- parent secret key is server-only;
- child action uses parent authentication + `Account-Id` for the authorized chapter;
- platform convenience fee is calculated server-side from configured basis-points/fixed-centavo controls;
- fee preview is disclosed before user confirmation;
- if fee configuration is absent, payment fails closed;
- internal `Payment.amount` stores chapter amount only;
- split metadata snapshots chapter amount, platform fee and gross total at payment creation;
- browser redirect/QR display/polling is not proof of payment;
- child webhook raw body is signature verified before parsing/mutation;
- signature uses child webhook secret and TEST/LIVE signature selection with replay tolerance;
- incoming `payment_intent_id`, child chapter scope, event ID and gross amount must match persisted evidence;
- `payment.paid` is idempotent and posts one chapter ledger payment + one receipt;
- `payment.failed` posts no chapter ledger payment/receipt;
- platform fee is never posted to member dues/contribution ledger;
- duplicate webhook cannot duplicate ledger/receipt/collection recognition;
- live processing fails closed unless TEST E2E is signed off and `PAYMONGO_LIVE_ENABLED=true` is explicitly approved.

Supported linked member methods are QR Ph, GCash and Maya. Do not collect raw card data on the PSP backend. Card support requires a separately reviewed client-side public-key/tokenization design.

## Receipt / Financial Integrity

- financial history is traceable/non-destructive;
- historical assessments are immutable after posting;
- corrections/refunds/reversals are explicit records;
- chapter amount, platform fee and total paid remain separately represented;
- contribution totals exclude platform fee;
- receipt owner/authorized finance access is server enforced;
- receipt is created only after trusted signed paid webhook confirmation;
- receipt shows chapter amount + platform fee + total and states platform fee is not chapter income.

## PWA Cache Safety

Service worker must never cache authenticated/private/API/payment/certificate/member pages as public offline content. Offline state must not imply a payment succeeded or that stale credential/account status is current.

## File Uploads

Community/event images require authenticated authorization, size/MIME/magic-byte validation, randomized storage keys, no executable types, persistent private storage, authorization-aware delivery and no user-controlled filesystem paths.

## Dependency / CI Security

CI validates Prisma/schema against MySQL, seed/bootstrap/member-mobile upgrade behavior, strict TypeScript, production build, cross-chapter isolation and runtime dependency safety. Required gates must pass on the exact PR head before merge.

## HTTP Security

Production requires HTTPS with anti-sniffing, strict referrer policy, anti-framing, restrictive permissions policy and `Cache-Control: no-store` on sensitive responses where applicable.

## Data Protection

Design supports Philippine privacy obligations through purpose limitation, minimization, notice/acknowledgement, access control, auditability, retention discipline, restricted exports and incident readiness. Personal contact information is not public by default.

## Production Security Gate

Before P0 Member Mobile release closure:

- exact-head CI green and merged;
- no secrets in source;
- previously exposed secrets rotated as applicable;
- production readiness green after redeploy;
- Chapter Admin cross-chapter negative tests pass;
- registration/approval/welcome path works without credential leakage;
- passkey real-device smoke succeeds;
- Digital ID and certificate public QR expose only intended minimum data;
- PayMongo Platforms/Linked Accounts TEST capability/linkage proven;
- DUES/CONTRIBUTION/OTHER split-payment TEST E2E passes signed-webhook/idempotency/gross-amount/ledger/receipt checks;
- platform fee actual value is explicitly configured, not guessed;
- production database backup/rollback evidence confirmed;
- HTTPS active on `https://psp.hoahub.tech`.
