# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-04 21:55 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Current accepted main SHA:** `c643791273ba4a233a530526cf9a34e9c333b218`

> This is the authoritative operational status ledger. Read it with `../AGENTS.md` before changing code, schema, UI, security, payments, deployment, or documentation. Never claim credential-dependent, device-dependent, payment or production state-changing behavior without direct evidence.

## Executive Status

The currently proven public production generation is:

- release: `2026-09-04-r7`
- deployment generation: `2026-09-04-login-ux-v1`
- main merge SHA: `c643791273ba4a233a530526cf9a34e9c333b218`
- post-merge PSP CI #438 / run `33877018203`: **PASSED**
- Production Smoke #15 / run `33877018268`: **PASSED**
- database/auth/baseline/member-mobile/auth-config readiness: green on the successful smoke.

A new production-significant installer/email-branding release is active in **PR #24** from branch `feat/pwa-install-email-branding-2026-09-04`.

Target identity:

- release: `2026-09-04-r8`
- deployment generation: `2026-09-04-pwa-email-branding-v1`

PR #24 is **not production-proven** until the final documentation-reconciled exact head passes complete PSP CI, that exact head is merged, post-merge CI passes, and Production Smoke observes the exact r8 generation.

## Accepted Delivery History

### PR #13 — Member Mobile / PWA + PayMongo Linked-Account Architecture

- exact passing head: `bb2cd5dc0bc261ead7628b52ede46f91da87b2c5`
- PSP CI #349 / run `33834687885`: **PASSED**
- merge SHA: `1e3a37fb9a01226b776932e0caeff9a70c124e0f`

Delivered registration/approval, secure account activation, member dashboard, Chapter/officer experience, Digital Member ID, certificate, profile, receipts, passkeys, installable PWA, PayMongo Platforms/Linked Accounts architecture, fee separation, signed/idempotent webhook reconciliation and member-mobile RBAC/schema synchronization.

### PR #14 — Professional Responsive UI/UX

- exact passing head: `b45165d5f845edacf3c53caafd6a347b08452fdf`
- PSP CI #351: **PASSED**
- merge SHA: `f5d44d3bdb7db37ed5140aaca256fbff52d5b600`
- post-merge PSP CI #352: **PASSED**

National Admin, Chapter Admin and Member responsive UI became part of the accepted baseline.

### PR #16 — Admin Lifecycle + Announcement/Event Media

- exact passing head: `971c9f7551f402b0c503c560e6fc292954c7b47f`
- PSP CI #394 / run `33846881681`: **PASSED**
- merge SHA: `58bb97c09ed6bc2989e9f8e3f79c9a56592b114b`
- post-merge PSP CI #395: **PASSED**

Delivered Chapter Administrator assignment reset correction, National Admin Chapter lifecycle, National Admin user lifecycle, secure announcement/event images, scoped private media, cross-Chapter denial, responsive member rendering and non-active Chapter assignment guard.

PR #17 improved production-smoke deployment waiting/diagnostics. PR #18 reconciled exact r5 production proof.

### PR #19 / #20 — Runtime Dependency Audit + Evidence Reconciliation

- PR #19 exact passing head: `6e8d530f4449c3f335be7f9562eca40bbf80008e`
- PSP CI #409: **PASSED**
- merge SHA: `0b10f2bf98678c5cda74450d0c55389895338949`
- Production Smoke #11: **PASSED**
- dependency audit remains fail-closed when trusted vulnerability evidence cannot be obtained.

PR #20 reconciled post-merge evidence; its post-merge PSP CI #416 passed. A Hostinger browser challenge encountered by one Production Smoke attempt remained a failure until the exact retry passed.

### PR #21 — Private-Media Turbopack Build-Tracing Correction

- final exact passing head: `04c96e0cfbf716a742fc9b11926a204195c44fb0`
- PSP CI #428 / run `33863646214`: **PASSED**
- merge SHA: `6fac2b58b9bc94d55958680ce44f90613d1c4fde`
- post-merge PSP CI #429: **PASSED**

Private-media runtime storage no longer causes Turbopack whole-project filesystem-tracing warnings while preserving runtime `STORAGE_ROOT`, traversal containment, secure delivery, image validation, RBAC and Chapter isolation.

Tracker: `docs/PRIVATE_MEDIA_BUILD_TRACING_2026-09-04.md`.

### PR #22 — Member Delete / Archive + Resend Invitation

- final exact passing head: `ce1bcbc95f448674519ae39a8a0c406b83f2dd2c`
- PSP CI #432 / run `33872811641`: **PASSED**
- unresolved review threads: none
- merge SHA: `8bad0851c3fea15bb4f12687be0788ce7fe6e943`
- post-merge PSP CI #433 / run `33873028077`: **PASSED**
- Production Smoke #14 / run `33873028136`: **PASSED**
- exact production identity at that release: `2026-09-04-r6 / 2026-09-04-member-admin-invitation-v1`

Delivered behavior:

- National/System Admin and exact-Chapter Chapter Admin may resend activation invitations under `members.manage`;
- invitation contains Membership Number, login email, secure 24-hour activation link, PWA installation link and current Chapter Chairman identity;
- PSP does not generate/email a temporary plaintext password;
- suspended/disabled and already activated accounts are blocked from activation resend;
- resend is rate-limited and audit logged;
- **Delete Member** is non-destructive archival, not physical deletion;
- member Chapter/officer/committee access is ended;
- Digital Member ID and valid certificates are revoked;
- member-only user access is disabled while valid national/other-Chapter authority is preserved;
- administrator self-delete is blocked;
- finance, receipt, certificate, application, membership and audit history remains preserved;
- archived members are removed from the normal active Member Directory;
- cross-Chapter lifecycle actions are denied by server authorization and automated isolation tests.

Tracker: `docs/MEMBER_ADMIN_DELETE_INVITATION_2026-09-04.md`.

### PR #23 — PSP Login UX Redesign

- final exact passing head: `aa72e3671c59bbab4c55a57ac546123b9f6ae812`
- PSP CI #437: **PASSED**
- merge SHA: `c643791273ba4a233a530526cf9a34e9c333b218`
- post-merge PSP CI #438 / run `33877018203`: **PASSED**
- Production Smoke #15 / run `33877018268`: **PASSED**
- exact production identity: `2026-09-04-r7 / 2026-09-04-login-ux-v1`

Delivered a clearer PSP-branded login experience with explicit Email & Password versus Passkey choice, improved hierarchy, password visibility, recovery/registration/support links, responsive behavior and unchanged server authentication/RBAC semantics.

Tracker: `docs/LOGIN_UX_REDESIGN_2026-09-04.md`.

## Active — PR #24 PSP PWA Install + Email Branding

Branch: `feat/pwa-install-email-branding-2026-09-04`  
PR: #24  
Base main: `c643791273ba4a233a530526cf9a34e9c333b218`  
Target release: `2026-09-04-r8`  
Target generation: `2026-09-04-pwa-email-branding-v1`

### Implemented on branch

PWA installation:

- PSP remains a PWA; no fake APK/IPA download is presented;
- global PWA registration and `/install` share the browser `beforeinstallprompt` event instead of racing for it;
- `/install` always presents a primary **Install PSP App** action;
- supported Chromium browsers open the native installation confirmation when the browser provides it;
- Android/Chrome/Edge manual installation guidance appears when the native prompt is unavailable;
- iPhone/iPad displays Safari → Share → Add to Home Screen guidance because iOS does not allow silent PWA installation;
- installed/standalone state and `appinstalled` are observed;
- the manifest keeps stable `id: "/"` so PSP retains one official application identity;
- CI/Production Smoke assert the stable manifest identity and installer content.

Email branding:

- the shared mailer wraps PSP HTML email in a responsive professional black/gold/white PSP shell;
- welcome/activation, Resend Invitation, application status update and password-reset emails use the shared branded mailer;
- Chapter name is displayed for Chapter-linked communication;
- Chapter logo is used when configured; otherwise the official PSP national logo is used;
- plaintext email alternatives remain available;
- welcome/resend email includes Membership Number, login email, Chapter, secure activation action, 24-hour expiry, explicit no-temporary-password wording, installation action and Chapter Chairman sign-off.

Chapter logo management:

- scoped Chapter logo upload/removal added to Chapter Management;
- write authorization uses `content.manage` against the exact Chapter scope, allowing System/National Admin and the authorized Chapter Admin for their own Chapter;
- JPG/PNG/WEBP bytes are validated by the existing secure image-storage service, max 5 MB by default;
- logo is stored using the runtime private-media abstraction and `private:` reference;
- `/api/public/chapters/[id]/logo` intentionally exposes only the Chapter branding logo for email/UI rendering and falls back to `/brand/psp-logo.jpg` when no custom logo is available;
- logo update/removal is audit logged and previous private files are cleaned up after successful replacement/removal;
- community/announcement/event private-media authorization is unchanged.

Detailed tracker: `docs/PWA_INSTALL_EMAIL_BRANDING_2026-09-04.md`.

### Current gate

PR #24 is **NOT MERGE-ELIGIBLE** until its final documentation-reconciled exact head passes the complete PSP CI gate set and there are no unresolved review threads. No r8 production claim is allowed until exact-head merge, post-merge CI and exact r8 Production Smoke complete.

## Pending — Controlled Authenticated Production Acceptance

Public smoke proves release identity/runtime/public security surfaces only. The following still require safe production credentials, controlled test records, representative devices or email access:

- Chapter Administrator assignment through actual National Admin UI;
- controlled Chapter deactivate/reactivate;
- controlled user suspend/disable/reactivate;
- same-Chapter announcement/event image access plus cross-Chapter denial;
- authenticated mobile Member/Admin rendering;
- Chapter Admin and National Admin Resend Invitation with actual recipient email evidence;
- Chapter Admin and National Admin controlled member archive/delete;
- live cross-Chapter denial for member-management actions;
- actual Chapter-logo upload/removal using controlled Chapter credentials;
- actual branded welcome/application/reset email rendering in a real mailbox;
- physical Android native PWA install confirmation and installed-app behavior;
- physical iPhone/iPad Add-to-Home-Screen behavior;
- real-device passkey registration/authentication;
- Digital Member ID QR validation on a second device;
- Membership Certificate QR validation on a second device.

Do not perform destructive-looking or identity-changing tests against real production members without an explicitly controlled test record.

## Pending — Applicant Onboarding Improvements Identified

The accepted production code still lacks:

- registration-submission confirmation email;
- public applicant self-service application-status checker;
- applicant-facing resend-activation flow independent of an administrator.

Administrator Resend Invitation solves the approved-member support case but does not provide public applicant self-service.

## External / Credential-Dependent Gates Still Open

- real Chairman welcome email delivery after controlled member approval;
- PayMongo Platforms / Linked Accounts capability enabled for PSP;
- PSP parent platform account confirmation;
- at least one Chapter child `org_*` linked in TEST mode;
- approved platform convenience fee configured;
- PayMongo TEST split settlement for DUES / CONTRIBUTION / OTHER and enabled QR Ph / GCash / Maya methods;
- valid/invalid/duplicate child webhook E2E evidence;
- database backup/restore drill;
- security cleanup/credential rotation/bootstrap cleanup where earlier values were exposed.

Production readiness has previously shown SMTP configured. PayMongo platform configuration/live enablement remain external gates unless newer direct evidence is recorded.

## Internal Documentation Task Still Pending

Branch `docs/reconcile-implementation-baseline-2026-09-04` was started to reconcile `docs/IMPLEMENTATION_PLAN.md` with the current linked-account payment architecture and mandatory Digital Member ID baseline. Keep that documentation work separate and merge it only after its own exact-head CI evidence.

## Closure Rules

A task is `COMPLETE` only when its required evidence exists: exact-head merged code plus required CI, successful automated/live validation, or explicit product-owner confirmation for an external fact.

Credential-dependent, payment, email, backup, device and production state-changing checks must not be closed from source code or public smoke alone.

## Documentation Discipline

After every material state change:

1. update `AGENTS.md` when architecture/security/hosting/payment/isolation/delivery rules or accepted baseline state change;
2. update this status ledger with current evidence/state;
3. update the relevant detailed active-work tracker;
4. document material UI/UX changes in `docs/UI_UX.md` or an approved detailed UX tracker;
5. never leave phase/deployment checklists stale;
6. repository documentation, not chat history, is authoritative;
7. never record replacement secrets in GitHub, chat, screenshots, tickets or logs.
