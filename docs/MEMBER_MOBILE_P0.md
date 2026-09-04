# PSP Member Mobile P0 — Acceptance Matrix

**Approved scope:** 2026-09-04  
**Release branch:** `feat/member-mobile-core-2026-09-04`  
**Release PR:** #13  
**Production URL:** `https://psp.hoahub.tech`

This document is the authoritative acceptance matrix for the member-facing mobile/PWA release. Do not mark the release complete from source code alone; use the evidence gates below.

## 1. Online Registration → Chapter Approval → Chairman Welcome Email

### Implemented behavior

- Member applies through the public online registration wizard and selects a chapter.
- Application review is scoped to an authorized Chapter Administrator.
- APPROVED creates/activates the PSP member record, membership history, member role assignment, unique membership number, and Digital Member ID.
- Approval identifies the current Chapter Chairman from active officer assignments.
- Welcome email is addressed to the approved member and signed by the Chapter Chairman.
- Email includes member login email, membership number, secure activation/login link, and PWA installation link.
- No plaintext password is emailed.
- In-app welcome notification is created.

### Production evidence gate

`SMTP_PASSWORD` is reported configured in Hostinger by the product owner on 2026-09-04. Email delivery is still **NOT VERIFIED** until a real application approval produces a delivered welcome email with correct Chairman signature and links.

## 2. Chapter Information, Officers, Balance, Contributions, Online Payment

### Implemented behavior

Member mobile dashboard/payment experience exposes:

- primary chapter and chapter information;
- current published officer assignments;
- outstanding chapter balance;
- total confirmed contribution amount;
- DUES, CONTRIBUTION and OTHER payment types;
- QR Ph, GCash and Maya methods;
- payment history and receipt archive.

Payment authorization always derives chapter from the authenticated member; the browser cannot choose another chapter for settlement.

### PayMongo Platforms split settlement

PSP is the PayMongo parent/platform account; chapters are linked child accounts.

For every payment:

- `chapter amount` = amount credited to chapter/member records;
- `platform convenience fee` = separately disclosed PSP platform fee;
- `total paid` = chapter amount + platform fee.

PayMongo split payment directs the configured fee to the PSP parent/platform account and the remaining amount to the chapter linked child account. Chapter ledger, contribution totals, and chapter collection reports exclude the platform fee.

The fee is configured through:

- `PLATFORM_CONVENIENCE_FEE_BPS`
- `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`

No default business fee is invented. Payment fails closed while both are unset/zero.

### Production evidence gate

PayMongo Platforms/Linked Accounts capability, parent/child linkage, actual convenience-fee value, and TEST-mode DUES/CONTRIBUTION/OTHER split transactions must be verified before LIVE activation.

## 3. Member-Generated Certificate of Membership

### Implemented behavior

- Active eligible member can self-generate a membership certificate.
- Current Chapter Chairman is required at issue time.
- Certificate snapshot stores Chairman name/title as signatory evidence.
- PDF renders Chairman signatory.
- Certificate has unique number and unique verification token.
- QR opens public verification page with minimum necessary membership/certificate data.
- Revoked/expired status is reflected by verification.

### Production evidence gate

Generate a real production certificate and scan QR from another device/browser against `https://psp.hoahub.tech`.

## 4. Digital Member ID With Verifiable QR

### Implemented behavior

- Every approved member receives one Digital Member ID with unique verification token.
- Existing active members are idempotently backfilled during the production member-mobile upgrade.
- Mobile Digital ID is available at `/member/id`.
- QR opens `/verify/member/[token]`.
- Verification exposes only the information required to establish membership/chapter/status.
- ID status can be invalidated independently of visual screenshots/copies.

### Production evidence gate

Open the real Digital ID from the installed PWA and scan QR from a second device/session.

## 5. Member Self-Service Personal Records

### Implemented behavior

Member can update approved personal/contact data including name components, mobile, address, Date Survive, survive location and birth date.

Protected identity/organizational fields cannot be changed through member self-service:

- chapter;
- membership number/code;
- PSP Birthday Code;
- login email/credential identity.

Profile changes are audit logged. Chapter transfer remains an authorized admin workflow.

## 6. Online Receipts

### Implemented behavior

- Confirmed payments create one unique receipt after trusted signed webhook confirmation.
- Member receipt archive is available at `/payments/receipts`.
- Receipt web/PDF includes payment type, purpose, chapter, member, payment method, chapter amount, platform convenience fee, total paid, internal reference and PayMongo Payment Intent reference.
- Receipt states that platform fee is separate from chapter dues/contribution/other income.
- Receipt owner/authorized finance access is server enforced.

### Production evidence gate

Verified as part of PayMongo TEST-mode split-payment E2E.

## 7. Passkey Login

### Implemented behavior

- Member can register and manage discoverable WebAuthn/passkey credentials.
- User verification is required.
- Passkey login creates the normal PSP secure session after cryptographic verification.
- Credential counters/backed-up/device metadata are retained as applicable.
- Passkey enrollment/use/revocation are audit logged.
- After passkey is enabled on a device, the login UI hides email/password by default and prioritizes passkey.
- Password fallback remains deliberately accessible for recovery.

### Production evidence gate

Test on at least:

- iOS Safari / Face ID or compatible passkey;
- Android Chrome / device passkey;
- one desktop authenticator such as Windows Hello/macOS Touch ID when available.

## 8. Professional Mobile PWA

### Implemented behavior

- installable manifest with standalone display;
- service worker and safe caching strategy;
- authenticated/private/API/payment/certificate pages are never cached as public offline data;
- Android/Chromium install prompt support;
- iOS Safari Add to Home Screen instructions;
- dedicated `/install` page used in welcome email;
- mobile bottom navigation and safe-area handling;
- PSP black/gold visual language and fraternity seal;
- responsive dashboard/payment/cards rather than desktop-only finance tables;
- direct PWA shortcuts to Member Home, Digital ID, Payments and Certificate.

### Production evidence gate

Install and smoke on representative Android and iOS screen sizes/orientations. Verify no horizontal overflow on the member core journey.

## Security / Isolation Invariants

- Chapter is derived server-side from authenticated membership for member payment operations.
- Chapter Admin/Finance configuration is chapter scoped.
- PSP platform PayMongo secret exists only in server environment.
- Chapter child Account ID and webhook signing secret are encrypted at rest.
- No chapter PayMongo API secret is required/stored in linked-account mode.
- Webhook signature is checked against the child webhook secret before database mutation.
- Payment Intent ID + chapter scope + event ID + gross amount are checked before posting.
- Duplicate webhooks do not double-post ledger/receipt/collections.
- Platform fee is never credited to member dues/contribution ledger.
- LIVE payments remain fail-closed behind `PAYMONGO_LIVE_ENABLED=true` after TEST signoff.

## Release Completion Criteria

P0 Member Mobile is `COMPLETE` only when all are true:

1. PR #13 exact head passes required PSP CI and is merged.
2. Hostinger deploy serves the merged generation and readiness remains green.
3. SMTP welcome email delivery is proven.
4. Android/iOS PWA install/responsive smoke is proven.
5. Passkey real-device smoke is proven.
6. Digital ID QR production verification is proven.
7. Certificate QR production verification is proven.
8. PayMongo Platforms/Linked Accounts capability is enabled.
9. PSP parent + chapter child are linked in TEST mode.
10. Deliberate platform fee value is configured.
11. DUES/CONTRIBUTION/OTHER TEST split-payment E2E passes including settlement, signed webhook, idempotency, ledger and receipt evidence.
12. Security secret-rotation/cleanup gates in `STATUS.md` are complete.
13. LIVE remains disabled until explicit approval; controlled live validation is a separate final gate.
