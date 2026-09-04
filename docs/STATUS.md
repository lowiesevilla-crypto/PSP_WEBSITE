# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-04 22:31 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Accepted production-code baseline SHA:** `b14bb1b90eb38a703c233724ab77803f5838b17e`

> This is the authoritative operational status ledger. Read it with `../AGENTS.md` before changing code, schema, UI, security, payments, deployment, or documentation. Never claim credential-dependent, device-dependent, payment, email-inbox, backup or production state-changing behavior without direct evidence.

## Executive Status

The currently proven public production generation is:

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

Member Delete is non-destructive archival. Resend Invitation is chapter scoped, rate limited, audited and never exposes activation tokens to administrators.

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

Delivered:

- shared `beforeinstallprompt` ownership and `/install` UX;
- stable PWA manifest `id: "/"`;
- responsive PSP black/gold/white email shell;
- Chapter-aware welcome/activation, Resend Invitation, application-status and password-reset email branding;
- Chapter logo upload/removal under exact-Chapter authorization;
- byte-validated JPG/PNG/WEBP storage through private runtime storage;
- intentionally public read-only Chapter branding endpoint `/api/public/chapters/[id]/logo`.

r8 was **not** accepted as final production proof because the public Chapter-logo fallback failed behind Hostinger's reverse proxy.

### PR #25 — r8 Public-Asset Diagnostic

- exact head `31093dcae13a396a554af3828e16dc5082b0a4c2`
- PSP CI #457 / run `33881287338`: **PASSED**
- merge `56ce7fc6ced8e8c182a6ec031d7d99aa9ccf3a24`

The diagnostic isolated the exact issue: the Chapter-logo fallback route derived its redirect from the incoming `request.url`; Hostinger presented the internal request origin, producing a redirect to `http://0.0.0.0:3000/brand/psp-logo.jpg`. The GitHub production runner correctly failed instead of accepting that public URL.

### PR #26 — Canonical Chapter-Logo Fallback + Approval Email Visibility

- exact passing head `72c605dc2568c9acb362c481eebe58efd4ad5ec0`
- PSP CI #468 / run `33882933038`: **PASSED**
- unresolved review threads: **none**
- merge `b5788298d50981d26c531e746b55149daf1afb42`
- post-merge PSP CI run `33883183121`: **PASSED**
- target/live identity `2026-09-04-r9 / 2026-09-04-chapter-logo-origin-fix-v1`

Delivered:

- public Chapter-logo fallback now uses the configured canonical PSP origin instead of reverse-proxy internal request origin;
- approval confirmation tells the Admin that approval will create the member and attempt welcome/activation delivery;
- approval result UI now distinguishes **email sent** from **email failed**;
- failed email delivery does not roll back the already-approved member transaction;
- failed delivery is audit logged and Admin is directed to verify email/SMTP and use Resend Invitation where appropriate;
- CI performs a real Chapter Admin approval against the CI database, verifies membership creation/activation requirement, intentionally observes `welcomeDelivery=failed` under unconfigured CI SMTP, verifies the approval remains committed and verifies `MEMBER_WELCOME_EMAIL_FAILED` audit evidence.

The first r9 Production Smoke run `33883183222` proved exact r9 identity/readiness but still returned an aggregated public-assets failure, so release closure remained open until the exact assertion could be isolated.

### PR #27 — Exact r9 Production-Smoke Diagnostics

- exact passing head `d7655723676d21da5bdaae881f43510d39e82c05`
- PSP CI #470 / run `33883716480`: **PASSED**
- unresolved review threads: **none**
- merge / accepted production-code baseline `b14bb1b90eb38a703c233724ab77803f5838b17e`
- post-merge PSP CI run `33884003915`: **PASSED**
- Production Smoke run `33884003888`: **PASSED every gate**

PR #27 did not weaken any assertion. It added explicit fetch/status/assertion evidence around the same production public/PWA checks. The resulting exact-r9 main smoke passed in full, closing the public production gate for the r9 release.

## Admin Approval Email — Current Verified Behavior

The approval path has now been checked end-to-end at code/CI-contract level:

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
- physical Android native PWA install acceptance;
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

## Documentation Reconciliation

This status update is being reconciled on branch `docs/reconcile-r9-email-production-proof-2026-09-04`. Documentation-only changes still require their own exact-head PSP CI before merge. The production-code baseline and exact r9 runtime proof above are already established independently by PR #26/#27 and Production Smoke run `33884003888`.

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