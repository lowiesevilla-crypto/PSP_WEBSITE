# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-05 08:16 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Current proven main SHA:** `588e528962c2e21c3238cbcac76a0aa20107b7a9`

> This is the authoritative operational status ledger. Read it with `../AGENTS.md` before changing code, schema, UI, security, payments, deployment, or documentation. Never claim credential-dependent, device-dependent, payment, email-inbox, backup or production state-changing behavior without direct evidence.

## Executive Status

The exact **r11 PWA installer correction is live and publicly proven**.

Current proven production identity:

- release: `2026-09-05-r11`
- deployment generation: `2026-09-05-pwa-install-cache-fix-v1`
- PR #31 exact passing head: `995385a57101e5598f28b5f76f020e44035a2bcf`
- PSP CI #507 / run `33930404982`: **PASSED**
- PR #31 merge SHA: `588e528962c2e21c3238cbcac76a0aa20107b7a9`
- post-merge PSP CI #508 / run `33930559567`: **PASSED**
- Production Smoke run `33930559380`: first attempt failed at stale `/install` content; exact failed-job retry **PASSED every gate**
- database: **ok**
- auth schema: **ok**
- baseline: **ok**
- member-mobile schema: **ok**
- auth configuration: **ok**
- SMTP configuration: **configured**
- PayMongo Platforms configuration: **not configured**
- PayMongo live gate: **disabled**

Successful r11 production smoke explicitly verified:

- `/api/health` exact r11 identity;
- `/api/health/ready` ready;
- stable manifest `id: "/"`;
- `/install` contains **Install PSP App**;
- `/install` contains **One PSP app**;
- `/install` contains `data-pwa-install-version="simple-cross-platform-pwa-v1"`;
- `/install` cache-control is non-stale (`no-store` or `no-cache`);
- login UX marker and recovery/registration links;
- public Chapter-logo fallback;
- production security headers;
- canonical invalid login 401;
- cross-site login rejection 403;
- public Digital Member ID / Certificate verification routes without application 500.

Therefore the automated/public **installable PWA delivery gate is CLOSED / PASSED**. Physical Android installation and physical iPhone/iPad Add-to-Home-Screen validation remain separate device acceptance gates and are not fabricated from HTTP smoke.

A new **r12 mobile registration accessibility correction is ACTIVE / NOT YET MERGED**.

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

Runtime vulnerability evidence remains fail-closed when trusted audit data cannot be obtained. PR #20 reconciled retry evidence while retaining the same security requirement.

### PR #21 — Private-Media Turbopack Build-Tracing Correction

- exact head `04c96e0cfbf716a742fc9b11926a204195c44fb0`
- PSP CI #428 / run `33863646214`: **PASSED**
- merge `6fac2b58b9bc94d55958680ce44f90613d1c4fde`
- post-merge PSP CI #429: **PASSED**

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

### PR #24 — PWA Install + Shared PSP/Chapter Email Branding

- exact head `30efed5f0f80a8e943ee9be0f89ae2cbbe98bcf2`
- PSP CI #453 / run `33880569148`: **PASSED**
- merge `aee0a73b694d9e84fec73129e1951fb214bbdb68`
- post-merge PSP CI `33880808705`: **PASSED**

Delivered shared `beforeinstallprompt` ownership, stable manifest identity, responsive PSP/Chapter email shell, Chapter-aware member emails and Chapter-logo management.

### PR #25 / #26 / #27 — r8 Diagnosis and r9 Production Closure

- PR #25 exact head `31093dcae13a396a554af3828e16dc5082b0a4c2`, PSP CI #457: **PASSED**, merge `56ce7fc6ced8e8c182a6ec031d7d99aa9ccf3a24`
- PR #26 exact head `72c605dc2568c9acb362c481eebe58efd4ad5ec0`, PSP CI #468 / run `33882933038`: **PASSED**, merge `b5788298d50981d26c531e746b55149daf1afb42`
- PR #27 exact head `d7655723676d21da5bdaae881f43510d39e82c05`, PSP CI #470 / run `33883716480`: **PASSED**, merge `b14bb1b90eb38a703c233724ab77803f5838b17e`
- post-PR-#27 PSP CI run `33884003915`: **PASSED**
- exact-r9 Production Smoke run `33884003888`: **PASSED every gate**

The Chapter-logo fallback uses the configured canonical PSP origin. Admin approval email result visibility reports sent/failed state, preserves approved membership when SMTP fails, and audit logs failure.

### PR #28 — r9 Documentation Reconciliation

- merged main SHA after documentation closure: `78b58a4437cb92c64f131f252dbace2c73fa3df7`

### PR #30 — Simplified Cross-Platform PWA Installation

Product direction is PWA-only. PR #29's native Android/APK experiment was closed without merge.

PR #30 delivered the simple PWA-only flow and passed exact-head/post-merge CI, but its first production release exposed stale `/install` HTML through hosting/cache behavior. That release therefore remained open until PR #31 corrected and proved the effective public page.

### PR #31 — PWA Installer Cache/Freshness Correction

- exact passing head `995385a57101e5598f28b5f76f020e44035a2bcf`
- PSP CI #507 / run `33930404982`: **PASSED**
- no unresolved review threads
- merge `588e528962c2e21c3238cbcac76a0aa20107b7a9`
- post-merge PSP CI #508 / run `33930559567`: **PASSED**
- exact r11 identity became live
- Production Smoke run `33930559380`: exact failed-job retry **PASSED every gate**

PR #31 closes the public installer freshness defect. The production installer now returns the new simplified PWA content and non-stale cache policy in automated smoke.

## Active — r12 Mobile Registration Checkbox Accessibility

Branch: `fix/mobile-registration-checkbox-2026-09-05`

Target identity:

- release `2026-09-05-r12`
- generation `2026-09-05-registration-checkbox-v1`

Problem confirmed from mobile screenshot and source inspection:

- the final Registration Review & Acknowledgement step used 20×20 checkbox styles;
- the acknowledgement row is a flex container;
- because application layout applies `min-width: 0` and the checkbox had no non-shrinking flex basis, a narrow mobile/in-app-browser layout could visually compress the checkbox to an almost invisible mark while the legal text wrapped.

Implemented correction:

- both required acknowledgement checkboxes are now 30×30 CSS px;
- explicit `minWidth`, `minHeight` and `flex: 0 0 30px` prevent flex shrink;
- acknowledgement spacing/padding is increased for mobile readability;
- the entire acknowledgement card remains the native nested `<label>` touch target;
- native checkbox semantics and keyboard operation remain intact;
- Submit Application still requires both acknowledgements;
- `/register` exposes `data-registration-acknowledgement-version="mobile-checkbox-v1"`;
- PSP CI and Production Smoke assert that marker while retaining all r11 installer/readiness/security/isolation/dependency-audit checks.

**Current gate:** NOT MERGE-ELIGIBLE until the newest exact branch head passes complete PSP CI and has no unresolved review threads. After exact-head merge, r12 Production Smoke must prove the registration marker in production before closure.

## Admin Approval Email — Current Verified Behavior

The approval path is verified at code/CI-contract level:

1. authorized Chapter/National Admin approves a pending application;
2. User/Member, MembershipHistory, MEMBER role, Membership Number and Digital Member ID are created transactionally;
3. application becomes `APPROVED`;
4. server determines activation requirement;
5. branded welcome/activation email is attempted using applicant email, Chapter name/logo/fallback, Membership Number, secure 24-hour activation action, `/install` action and current Chapter Chairman sign-off;
6. API returns `welcomeDelivery: "sent" | "failed"` and `activationRequired`;
7. Admin UI displays actual delivery result;
8. delivery failure does not roll back approval, is audit logged, and Resend Invitation is the recovery workflow.

**Production evidence:** readiness reports SMTP `configured`.  
**Still external:** actual inbox receipt/rendering after a controlled production approval has not yet been observed.

## Pending — Controlled / External Acceptance

These still require safe credentials, controlled records, representative devices or external provider access:

- controlled National/Chapter Admin lifecycle actions;
- controlled member invitation delivery and archive/delete;
- controlled Chapter logo upload/removal in production;
- real branded welcome/activation email receipt and rendering;
- real application-status and password-reset email rendering;
- physical Android PWA installation acceptance;
- physical iPhone/iPad Add-to-Home-Screen acceptance;
- real passkey device acceptance;
- second-device Digital Member ID QR validation;
- second-device Certificate QR validation;
- PayMongo Platforms/Linked Accounts TEST split-payment E2E;
- database backup/restore drill;
- credential rotation/bootstrap cleanup where required.

Applicant onboarding improvements still identified but not yet implemented:

- registration-submission confirmation email;
- public applicant application-status checker;
- public applicant resend-activation self-service.

Current readiness evidence keeps PayMongo platform configuration `not_configured` and live payments `disabled`.

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
