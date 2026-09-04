# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-05 07:20 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Current main SHA before r10:** `78b58a4437cb92c64f131f252dbace2c73fa3df7`  
**Accepted production-code baseline SHA:** `b14bb1b90eb38a703c233724ab77803f5838b17e`

> This is the authoritative operational status ledger. Read it with `../AGENTS.md` before changing code, schema, UI, security, payments, deployment, or documentation. Never claim credential-dependent, device-dependent, payment, email-inbox, backup or production state-changing behavior without direct evidence.

## Executive Status

The currently proven public production generation remains:

- release: `2026-09-04-r9`
- deployment generation: `2026-09-04-chapter-logo-origin-fix-v1`
- production-code baseline merge SHA: `b14bb1b90eb38a703c233724ab77803f5838b17e`
- post-PR-#27 PSP CI run `33884003915`: **PASSED**
- Production Smoke run `33884003888`: **PASSED**
- database: **ok**
- auth schema: **ok**
- baseline: **ok**
- member-mobile schema: **ok**
- auth configuration: **ok**
- SMTP configuration: **configured**
- PayMongo Platforms configuration: **not configured**
- PayMongo live gate: **disabled**

The r9 public smoke passed exact release identity, readiness, public/PWA assets, Chapter-logo fallback, production security headers, canonical/cross-site login behavior and public Digital Member ID / Certificate verification-route availability.

A new **r10 simplified PWA-only installer release is ACTIVE / NOT YET MERGED**. It replaces the abandoned native-APK experiment and must pass exact-head PSP CI, exact-head merge and exact r10 Production Smoke before being called production-proven.

## Completed Delivery History

### PR #13 — Member Mobile / PWA + PayMongo Linked-Account Architecture

- exact passing head `bb2cd5dc0bc261ead7628b52ede46f91da87b2c5`
- PSP CI #349 / run `33834687885`: **PASSED**
- merge `1e3a37fb9a01226b776932e0caeff9a70c124e0f`

Delivered secure approval/activation, Member PWA, Digital Member ID, certificate, passkeys, member finance UX and the PayMongo Platforms/Linked Accounts architecture with fee separation and signed/idempotent reconciliation.

### PR #14 — Professional Responsive UI/UX

- exact passing head `b45165d5f845edacf3c53caafd6a347b08452fdf`
- PSP CI #351: **PASSED**
- merge `f5d44d3bdb7db37ed5140aaca256fbff52d5b600`
- post-merge PSP CI #352: **PASSED**

National Admin, Chapter Admin and Member responsive UI became part of the accepted baseline.

### PR #16 — Admin Lifecycle + Announcement/Event Media

- exact passing head `971c9f7551f402b0c503c560e6fc292954c7b47f`
- PSP CI #394 / run `33846881681`: **PASSED**
- merge `58bb97c09ed6bc2989e9f8e3f79c9a56592b114b`
- post-merge PSP CI #395: **PASSED**

Delivered Chapter Administrator assignment reset correction, Chapter/user lifecycle controls, scoped private announcement/event images, cross-Chapter denial and responsive rendering.

### PR #19 / #20 — Runtime Dependency Audit + Evidence Reconciliation

- PR #19 exact head `6e8d530f4449c3f335be7f9562eca40bbf80008e`
- PSP CI #409: **PASSED**
- merge `0b10f2bf98678c5cda74450d0c55389895338949`

Runtime vulnerability evidence remains fail-closed when trusted audit data cannot be obtained. PR #20 reconciled retry evidence while retaining the same security requirement.

### PR #21 — Private-Media Turbopack Build-Tracing Correction

- exact head `04c96e0cfbf716a742fc9b11926a204195c44fb0`
- PSP CI #428 / run `33863646214`: **PASSED**
- merge `6fac2b58b9bc94d55958680ce44f90613d1c4fde`
- post-merge PSP CI #429: **PASSED**

Private runtime storage no longer causes whole-project build tracing while path containment, image validation, RBAC and Chapter isolation remain intact.

### PR #22 — Member Delete / Archive + Resend Invitation

- exact head `ce1bcbc95f448674519ae39a8a0c406b83f2dd2c`
- PSP CI #432 / run `33872811641`: **PASSED**
- merge `8bad0851c3fea15bb4f12687be0788ce7fe6e943`
- post-merge PSP CI #433 / run `33873028077`: **PASSED**
- Production Smoke #14 / run `33873028136`: **PASSED**

Member Delete is non-destructive archival. Resend Invitation is Chapter-scoped, rate limited, audited and never exposes activation tokens to administrators.

### PR #23 — PSP Login UX Redesign

- exact head `aa72e3671c59bbab4c55a57ac546123b9f6ae812`
- PSP CI #437: **PASSED**
- merge `c643791273ba4a233a530526cf9a34e9c333b218`
- post-merge PSP CI #438 / run `33877018203`: **PASSED**
- Production Smoke #15 / run `33877018268`: **PASSED**
- exact identity `2026-09-04-r7 / 2026-09-04-login-ux-v1`

### PR #24 — PWA Install + Shared PSP/Chapter Email Branding

- exact head `30efed5f0f80a8e943ee9be0f89ae2cbbe98bcf2`
- PSP CI #453 / run `33880569148`: **PASSED**
- merge `aee0a73b694d9e84fec73129e1951fb214bbdb68`
- post-merge PSP CI run `33880808705`: **PASSED**
- r8 identity became live and readiness was green

Delivered shared `beforeinstallprompt` ownership, stable manifest identity, responsive PSP/Chapter email shell, Chapter-aware member emails and Chapter logo management. r8 was not final production proof because the Chapter-logo fallback exposed a reverse-proxy origin defect.

### PR #25 / #26 / #27 — r8 Diagnosis and r9 Production Closure

- PR #25 exact head `31093dcae13a396a554af3828e16dc5082b0a4c2`, PSP CI #457: **PASSED**, merge `56ce7fc6ced8e8c182a6ec031d7d99aa9ccf3a24`
- PR #26 exact head `72c605dc2568c9acb362c481eebe58efd4ad5ec0`, PSP CI #468 / run `33882933038`: **PASSED**, merge `b5788298d50981d26c531e746b55149daf1afb42`
- PR #27 exact head `d7655723676d21da5bdaae881f43510d39e82c05`, PSP CI #470 / run `33883716480`: **PASSED**, merge `b14bb1b90eb38a703c233724ab77803f5838b17e`
- post-PR-#27 PSP CI run `33884003915`: **PASSED**
- exact-r9 Production Smoke run `33884003888`: **PASSED every gate**

The Chapter-logo fallback now uses the configured canonical PSP origin. Admin approval email result visibility was also added: approval stays committed if SMTP fails, the Admin sees sent/failed state, and failure is audit logged.

### PR #28 — r9 Evidence Documentation Reconciliation

- merged to main; current main SHA before r10 work: `78b58a4437cb92c64f131f252dbace2c73fa3df7`
- documentation-only reconciliation; r9 production-code proof remains based on PR #27 / `b14bb1b90eb38a703c233724ab77803f5838b17e` and Production Smoke `33884003888`.

## Closed Unmerged — PR #29 Native Android Installer Experiment

PR #29 was **closed without merge** by explicit product direction.

- no APK/TWA/native Android distribution changes from PR #29 are on `main`;
- PSP does not currently require APK, IPA, Play Store or App Store distribution;
- canonical mobile distribution is the existing cross-platform PWA.

This closure prevents unnecessary signing/store complexity and keeps one PSP web-app identity.

## Active — r10 Simple Cross-Platform PWA Installer

Branch: `fix/simple-cross-platform-pwa-install-2026-09-05`

Target identity:

- release `2026-09-05-r10`
- generation `2026-09-05-simple-pwa-install-v1`

Implemented scope:

- simplified `/install` page focused on one action: install/add PSP to the phone;
- Android detects and uses `beforeinstallprompt` when the browser exposes it;
- Android fallback is browser menu → **Install app / Add to Home screen**;
- iPhone/iPad guidance is Safari → **Share → Add to Home Screen → Add**;
- iPad desktop-mode user-agent handling included;
- Messenger/Facebook/Instagram and other common in-app browsers are detected because they can suppress PWA install capability;
- in-app browser users are directed to Chrome/Samsung Internet on Android or Safari on iOS;
- standalone mode reports PSP as installed and offers **Open PSP**;
- stable manifest `id: "/"` is preserved so releases do not intentionally create multiple PSP identities;
- same PSP account/backend is used from every installed device;
- no APK/IPA/App Store language remains in the canonical member installation experience;
- CI and Production Smoke are being advanced to assert exact r10 identity and the `simple-cross-platform-pwa-v1` installer marker.

**Current gate:** NOT MERGE-ELIGIBLE until the newest exact branch head passes complete PSP CI and has no unresolved review threads. After merge, exact r10 Production Smoke must pass before production closure.

## Admin Approval Email — Current Verified Behavior

The approval path has been checked end-to-end at code/CI-contract level:

1. authorized Chapter/National Admin approves a pending application;
2. User/Member, MembershipHistory, MEMBER role, Membership Number and Digital Member ID are created transactionally;
3. the application becomes `APPROVED`;
4. the server determines whether activation is required;
5. it attempts the branded welcome/activation email using the applicant email, Chapter name/logo/fallback, Membership Number, secure 24-hour activation action, `/install` action and current Chapter Chairman sign-off;
6. the API returns `welcomeDelivery: "sent" | "failed"` and `activationRequired` to the Admin UI;
7. the Admin UI displays the actual delivery result;
8. if delivery fails, approval remains valid, failure is audit logged and Resend Invitation is the recovery workflow.

**Production evidence:** `/api/health/ready` reports SMTP `configured`.  
**Not yet proven:** a real controlled recipient inbox has not yet been observed receiving/rendering this approval email. Configuration plus CI/source evidence is not treated as inbox-delivery proof.

## Pending — Controlled Authenticated Production Acceptance

Public smoke proves release/runtime/public-security surfaces. The following still require safe production credentials, controlled records, representative devices or recipient access:

- controlled Chapter Administrator assignment through National Admin UI;
- controlled Chapter deactivate/reactivate;
- controlled user suspend/disable/reactivate;
- same-Chapter announcement/event image access and live cross-Chapter denial;
- authenticated mobile Member/Admin rendering;
- actual branded welcome/activation email receipt after controlled Admin approval;
- Chapter Admin and National Admin Resend Invitation with actual recipient evidence;
- controlled Chapter Admin / National Admin member archive/delete;
- controlled Chapter logo upload/removal in production;
- physical Android PWA installation acceptance;
- physical iPhone/iPad Add-to-Home-Screen acceptance;
- real passkey registration/authentication;
- Digital Member ID QR validation on a second device;
- Membership Certificate QR validation on a second device.

Do not perform destructive-looking or identity-changing tests against real production members without an explicitly controlled test record.

## Pending — Applicant Onboarding Improvements

Still identified but not implemented:

- registration-submission confirmation email;
- public applicant application-status checker;
- applicant-facing resend-activation self-service independent of an administrator.

Administrator Resend Invitation solves the approved-member support case but does not provide public applicant self-service before approval.

## External / Credential-Dependent Gates Still Open

- real branded Chairman welcome/activation email receipt after controlled approval;
- PayMongo Platforms / Linked Accounts capability enabled for PSP;
- PSP parent platform account confirmation;
- at least one Chapter child `org_*` linked in TEST mode;
- approved platform convenience fee configured;
- PayMongo TEST split settlement for DUES / CONTRIBUTION / OTHER and QR Ph / GCash / Maya;
- valid/invalid/duplicate child webhook E2E evidence;
- database backup/restore drill;
- security cleanup/credential rotation/bootstrap cleanup where required.

Current readiness evidence explicitly shows PayMongo platform configuration `not_configured` and live payments `disabled`.

## Closure Rules

A task is `COMPLETE` only when its required evidence exists: exact-head merged code plus required CI, successful automated/live validation, or explicit product-owner confirmation for an external fact.

Credential-dependent, payment, email-inbox, backup, device and production state-changing checks must not be closed from source code, configuration flags or public smoke alone.

## Documentation Discipline

After every material state change:

1. update `AGENTS.md` when architecture/security/hosting/payment/isolation/branding/PWA/email/delivery rules or accepted baseline state change;
2. update this status ledger with current evidence/state;
3. update the relevant detailed active-work tracker;
4. document material UI/UX changes in `docs/UI_UX.md` or an approved detailed UX tracker;
5. never leave phase/deployment checklists stale;
6. repository documentation, not chat history, is authoritative;
7. never record replacement secrets in GitHub, chat, screenshots, tickets or logs.
