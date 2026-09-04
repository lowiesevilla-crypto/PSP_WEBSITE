# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-04 11:30 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`

> This is the authoritative operational status ledger for AI agents and developers. Read it with `../AGENTS.md` and the applicable detailed runbooks before planning or implementing work. Update it after every material state change so project truth never depends on chat history.

## Executive Status

The current production PSP core application is **GREEN** through the Hostinger schema/bootstrap release and verified System Administrator browser login. The next P0 release is the **Member Mobile / PWA + PayMongo Platforms Split Payment** release and is currently **IN PROGRESS / NOT COMPLETE**.

### Current P0 release

- Branch: `feat/member-mobile-core-2026-09-04`
- PR: #13 — `feat: complete mobile member PWA and PayMongo split payments`
- PR state: **DRAFT / OPEN** until exact-head CI and release documentation are complete
- Detailed acceptance matrix: `MEMBER_MOBILE_P0.md`
- Payment architecture: `PAYMENTS.md`

Do not mark PR #13 or the member-mobile P0 complete until its exact head passes all required PSP CI gates, is merged, Hostinger serves the merged build, and the external/device/payment/email evidence gates below are satisfied.

## Current Production Baseline — GREEN

Production remains on the pre-member-mobile `main` baseline while PR #13 is validated.

Latest fully verified production foundation:

- dedicated PSP MySQL connectivity: GREEN;
- PSP schema/baseline readiness: GREEN;
- `AUTH_SECRET` session configuration: GREEN;
- public production routes/security headers: GREEN;
- canonical-origin protections: GREEN;
- System Administrator real browser login to `/admin`: VERIFIED by product owner on 2026-09-04;
- guarded Hostinger greenfield schema bootstrap: GREEN;
- last documented Production Smoke #3: PASSED against the schema/bootstrap release.

The former P0 admin-login incident is closed. Do not reopen it without new evidence.

## P0 Member Mobile Release — Implementation Status

### 1. Registration / approval / welcome

**CODE: IMPLEMENTED ON PR #13**

- online registration and chapter selection;
- Chapter Admin scoped review/approval;
- approval creates member, history, member role, membership number and Digital Member ID;
- automatic welcome/activation email;
- welcome signed by current Chapter Chairman;
- email contains login email, membership number, activation/login link and PWA install link;
- plaintext passwords are never emailed;
- in-app welcome notification.

**SMTP operational evidence:** product owner reported `SMTP_PASSWORD` configured in Hostinger on 2026-09-04. This changes SMTP password configuration from missing to **CONFIGURED / DELIVERY NOT YET VERIFIED**. A real delivered approval/welcome email is still required before SMTP/welcome delivery is marked complete.

### 2. Member chapter / officers / finance / online payment

**CODE: IMPLEMENTED ON PR #13; EXTERNAL PAYMONGO TEST GATE OPEN**

Member PWA exposes:

- chapter information;
- current officers;
- outstanding balance;
- total confirmed contributions;
- DUES / CONTRIBUTION / OTHER payments;
- QR Ph / GCash / Maya;
- recent payments and receipt archive.

Payment model has been upgraded from per-chapter secret-key Hosted Checkout to **PayMongo Platforms / Linked Accounts**:

- PSP = parent/platform PayMongo account;
- each chapter = linked child PayMongo account (`org_*`);
- parent platform secret remains server-only in Hostinger;
- chapter child Account ID and child webhook signing secret are encrypted at rest;
- no chapter API secret is stored in linked-account mode;
- member payment chapter is derived server-side from authenticated membership;
- child webhook is chapter-specific and signature verified;
- event/payment-intent/chapter/gross-amount/idempotency checks protect reconciliation.

### Platform Convenience Fee

Approved business rule: every online payment includes a **Platform Convenience Fee**. The fee is split to the PSP platform PayMongo account and the remaining amount settles to the chapter linked account.

Code supports an operationally configured percentage and/or fixed fee:

- `PLATFORM_CONVENIENCE_FEE_BPS`
- `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`

**The product owner has not yet supplied the actual fee value. No fee rate is invented.** New split payment creation fails closed while both fee controls are unset/zero.

Accounting invariants:

- `Payment.amount` = chapter amount only;
- chapter ledger posts chapter amount only;
- contribution totals use chapter amount only;
- platform fee is separately persisted in immutable split-payment audit evidence;
- receipt and reconciliation show chapter amount + platform fee + total paid;
- platform fee is never represented as chapter dues/contribution/other income.

### 3. Membership certificate

**CODE: IMPLEMENTED ON PR #13**

- member self-service issuance;
- current Chapter Chairman required at issuance;
- Chairman name/title captured as signatory snapshot;
- PDF includes Chairman signatory;
- unique certificate number and verification token;
- QR verification and status/revocation support.

Production QR/device smoke remains open.

### 4. Digital Member ID

**CODE: IMPLEMENTED ON PR #13**

- unique Digital Member ID + verification token;
- automatic creation at membership approval;
- idempotent backfill for existing active members during production member-mobile upgrade;
- `/member/id` mobile card;
- public `/verify/member/[token]` QR verification with minimum disclosure.

Production QR/device smoke remains open.

### 5. Member profile self-service

**CODE: IMPLEMENTED ON PR #13**

Member can update approved personal/contact fields. Member self-service cannot change:

- chapter;
- membership number/code;
- PSP Birthday Code;
- login email/credential identity.

Changes are audit logged. Chapter transfer remains an authorized admin workflow.

### 6. Online receipts

**CODE: IMPLEMENTED ON PR #13**

Member receipt archive and receipt PDF/web views show:

- payment type/purpose;
- member/chapter;
- payment method;
- chapter amount;
- platform convenience fee;
- total paid;
- PSP internal reference;
- PayMongo Payment Intent reference;
- confirmed timestamps.

Receipt generation is authoritative only after signed PayMongo paid webhook confirmation.

### 7. Passkey login

**CODE: IMPLEMENTED ON PR #13**

- WebAuthn/passkey enrollment and authentication;
- discoverable credentials with user verification;
- credential audit/revocation;
- normal PSP secure session after verified passkey;
- when passkey is enabled on a device, email/password fields are hidden by default;
- password fallback remains intentionally accessible for recovery.

Real iOS/Android/device authenticator smoke remains open.

### 8. Mobile-first PWA / UI

**CODE: IMPLEMENTED/REWORKED ON PR #13; DEVICE ACCEPTANCE OPEN**

- standalone PWA manifest;
- service worker with private/auth/payment/API content excluded from public cache;
- Android/Chromium install prompt;
- iOS Safari Add-to-Home-Screen guidance;
- `/install` page for welcome email;
- PSP black/gold/fraternity visual language;
- safe-area mobile bottom navigation;
- mobile member dashboard cards;
- mobile payments, Digital ID, receipts, certificate, chapter/profile navigation;
- PWA shortcuts for core member functions.

Representative Android/iOS install/responsive smoke is mandatory before closure.

## PayMongo Platforms — Release Gate

**Code: IN IMPLEMENTATION/CI on PR #13**  
**PayMongo account capability: NOT YET VERIFIED**  
**Live processing: NOT APPROVED / FAIL-CLOSED**

Required server environment for the linked-account release:

- `PAYMONGO_PLATFORM_SECRET_KEY`
- `PAYMONGO_PLATFORM_ACCOUNT_ID`
- `PAYMENT_CONFIG_ENCRYPTION_KEY` (stable random secret, minimum 32 characters)
- `PLATFORM_CONVENIENCE_FEE_BPS` and/or `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`
- `PAYMONGO_LIVE_ENABLED=false` until explicit approval
- canonical `NEXT_PUBLIC_APP_URL`

External PayMongo requirements:

1. PayMongo Platforms/Linked Accounts capability enabled for PSP.
2. PSP parent/platform account active in TEST mode.
3. At least one chapter linked child account active with `org_*` Account ID.
4. Deliberate convenience-fee value configured.
5. Child webhook creation/signing proven.
6. DUES split payment TEST E2E.
7. CONTRIBUTION split payment TEST E2E.
8. OTHER split payment TEST E2E.
9. Verify platform receives fee and child chapter receives remainder.
10. Verify signed webhook, invalid-signature rejection and duplicate idempotency.
11. Verify chapter ledger/contribution totals exclude platform fee.
12. Verify receipt/reconciliation chapter amount + fee + total.

Only after TEST signoff and explicit product-owner approval may `PAYMONGO_LIVE_ENABLED=true` be used for a controlled low-value live validation.

## Security Cleanup — Still Required Before Final Operational Signoff

Earlier troubleshooting exposed runtime-secret values in screenshots. Their values are intentionally not recorded here.

Pending:

1. rotate temporary/admin password if not already rotated;
2. remove all `BOOTSTRAP_ADMIN_*` after password change and confirmed normal login;
3. rotate other exposed runtime secrets as applicable;
4. redeploy/restart;
5. reconfirm `/api/health/ready`;
6. reconfirm normal `/admin` login;
7. rerun production smoke.

Never record replacement secret values in GitHub, chat, screenshots, tickets, or documentation.

## Production Upgrade Safety for PR #13

The member-mobile release introduces additive tables/columns for passkeys, Digital Member ID, chapter payment config, payment category/description and certificate signatory.

Production build initialization:

- operates only for `APP_ENV=production`;
- recognizes empty DB, exact legacy PSP schema, exact current member-mobile schema, or partial/unknown states;
- applies Prisma sync automatically only for empty DB or recognized pre-member-mobile PSP schema;
- never passes `--accept-data-loss`;
- refuses partial member-mobile schema instead of guessing;
- runs existing idempotent production baseline;
- synchronizes Chapter Admin finance permissions additively;
- backfills Digital Member IDs idempotently.

## Pending External / Production Validation — Priority Order

1. Finish PR #13 code/docs and obtain exact-head green PSP CI.
2. Merge only the exact passing head.
3. Deploy merged build to Hostinger and prove readiness/release generation.
4. Complete outstanding security-secret cleanup/rotation and re-smoke.
5. Prove real registration → Chapter Admin approval → Chairman welcome email delivery.
6. Install/smoke PWA on representative Android and iOS devices/screens.
7. Prove passkey on real mobile/device authenticators.
8. Prove Digital ID QR verification from a second device/session.
9. Prove membership certificate QR verification from a second device/session.
10. Enable/verify PayMongo Platforms/Linked Accounts in TEST mode.
11. Configure actual approved convenience-fee value.
12. Run DUES / CONTRIBUTION / OTHER split-payment TEST E2E including settlement/webhook/idempotency/ledger/receipt/reconciliation.
13. Confirm production MySQL backup and tested rollback/restore evidence.
14. Only after explicit approval, run controlled low-value LIVE validation.

## Closure Rules

A task is `COMPLETE` only with appropriate evidence: exact-head merged code plus required CI, successful automated/live validation, or explicit product-owner confirmation for an external fact.

Credential-dependent, payment, email, backup, device and production-runtime checks must not be closed from source code alone.

## Documentation Discipline

After every material task:

1. update `AGENTS.md` when business/architecture/security/hosting/payment/isolation/delivery rules change;
2. update this status ledger;
3. update the applicable detailed runbook/document;
4. update `MEMBER_MOBILE_P0.md` for member-mobile acceptance state;
5. never leave deployment/phase checklists stale;
6. documentation is part of Definition of Done.
