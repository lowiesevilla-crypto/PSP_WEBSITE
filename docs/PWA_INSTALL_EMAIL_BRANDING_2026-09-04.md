# PSP PWA Install + Email Branding — 2026-09-04

**Original feature branch:** `feat/pwa-install-email-branding-2026-09-04`  
**Feature PR:** #24  
**Corrective PRs:** #25, #26, #27  
**Final proven release:** `2026-09-04-r9`  
**Final proven generation:** `2026-09-04-chapter-logo-origin-fix-v1`  
**Accepted production-code baseline:** `b14bb1b90eb38a703c233724ab77803f5838b17e`

## Objective

Remove ambiguity from PSP mobile installation, standardize professional PSP/Chapter email branding, permit scoped Chapter-logo management, and prove the resulting production behavior without weakening authentication, Chapter isolation, or release governance.

## Delivered PWA Install Behavior

- PSP remains an installable Progressive Web App; no fake APK/IPA download is presented.
- Manifest keeps stable `id: "/"` so PSP retains one official application identity.
- Global PWA registration captures/shares Chromium `beforeinstallprompt` with `/install` instead of racing for it.
- `/install` presents **Install PSP App** and opens the native confirmation when the browser exposes it.
- Android Chrome/Edge manual guidance appears when no native prompt is available.
- iPhone/iPad guidance correctly uses Safari → Share → Add to Home Screen → Add.
- standalone and `appinstalled` state are observed so users are not encouraged to create duplicate installs.
- Production Smoke verifies manifest, installer content and public PWA surfaces.

## Delivered Email Branding

The shared PSP mailer provides a responsive black/gold/white email shell with:

- PSP seal or Chapter branding logo;
- `Ψ Σ Φ` identity;
- Chapter name for Chapter-linked communication;
- national PSP fallback when no Chapter logo exists;
- escaped dynamic values;
- security footer;
- plaintext alternative.

Branded workflows include:

- approved-member welcome / activation;
- administrator Resend Invitation;
- application correction / pending-requirements / rejection notification;
- active-account password reset.

Welcome / activation includes Membership Number, login email, Chapter, secure activation action where needed, 24-hour expiry, no-temporary-password wording, `/install` action and current Chapter Chairman sign-off.

## Admin Approval Email Contract

The approval workflow was specifically rechecked after the r9 correction.

Expected behavior:

1. authorized Admin approves the application;
2. member records, membership history, role assignment, Membership Number and Digital Member ID are committed;
3. server attempts the welcome/activation email after the approval transaction;
4. API returns `welcomeDelivery` and `activationRequired`;
5. Admin UI displays whether the email was sent or failed;
6. email failure does **not** roll back the approved membership;
7. failure creates `MEMBER_WELCOME_EMAIL_FAILED` audit evidence;
8. Admin is directed to verify the email/SMTP configuration and use Resend Invitation when recovery is required.

CI coverage now performs a real Chapter Admin approval against CI fixtures. With SMTP intentionally unconfigured in CI it verifies `welcomeDelivery=failed`, preserves `APPROVED` state, and verifies the failure audit event. This proves the application/email failure contract without pretending to prove external inbox delivery.

Production readiness currently reports SMTP `configured`. A real controlled recipient inbox receipt/rendering remains an external acceptance item.

## Chapter Logo Management

- Chapter logo upload/removal is authorized under exact-Chapter `content.manage` scope.
- System/National Admin may act nationally; Chapter Admin may act only within assigned scope.
- JPG/PNG/WEBP are accepted through byte-signature-validated private image storage.
- 5 MB remains the default maximum unless `MAX_IMAGE_UPLOAD_BYTES` is explicitly configured.
- `Chapters.logoUrl` retains a private storage reference.
- public read-only branding route: `/api/public/chapters/[id]/logo`.
- community/announcement/event private media remains authenticated/scoped.
- replacement/removal cleans up superseded private files and is audit logged.

## r8 Production Incident

PR #24 passed exact-head CI and merged, and r8 became live/ready. Production Smoke failed the Chapter-logo fallback because the route built a relative redirect from `request.url`.

Behind Hostinger, the internal request origin was `0.0.0.0:3000`, so the public redirect became effectively:

`http://0.0.0.0:3000/brand/psp-logo.jpg`

The GitHub production runner correctly refused that internal target.

PR #25 added bounded diagnostics and isolated this exact cause. No acceptance gate was weakened.

## r9 Correction

PR #26 changed Chapter-logo fallback generation to use the configured canonical PSP application origin, never the reverse-proxy internal request origin. The release marker advanced to:

- `2026-09-04-r9`
- `2026-09-04-chapter-logo-origin-fix-v1`

PR #26 also surfaced approval welcome-email delivery status in the Admin UI and added the CI approval/email failure contract described above.

The first r9 Production Smoke proved exact generation/readiness but still reported an aggregated public-assets failure without naming the exact assertion. PR #27 retained every existing check and added explicit fetch/assertion diagnostics. The next exact-r9 Production Smoke passed every gate.

## Exact Release Evidence

### PR #24

- exact head: `30efed5f0f80a8e943ee9be0f89ae2cbbe98bcf2`
- PSP CI #453 / run `33880569148`: **PASSED**
- merge: `aee0a73b694d9e84fec73129e1951fb214bbdb68`
- post-merge PSP CI `33880808705`: **PASSED**
- r8 health/readiness: live/green
- r8 public Production Smoke: **FAILED**, superseded by corrective work

### PR #25

- exact head: `31093dcae13a396a554af3828e16dc5082b0a4c2`
- PSP CI #457 / run `33881287338`: **PASSED**
- merge: `56ce7fc6ced8e8c182a6ec031d7d99aa9ccf3a24`
- diagnostic result: identified internal-origin Chapter-logo fallback defect

### PR #26

- exact head: `72c605dc2568c9acb362c481eebe58efd4ad5ec0`
- PSP CI #468 / run `33882933038`: **PASSED**
- unresolved review threads: none
- merge: `b5788298d50981d26c531e746b55149daf1afb42`
- post-merge PSP CI `33883183121`: **PASSED**
- exact r9 generation observed live and ready
- first r9 Production Smoke `33883183222`: aggregated public-assets failure; release closure remained open

### PR #27

- exact head: `d7655723676d21da5bdaae881f43510d39e82c05`
- PSP CI #470 / run `33883716480`: **PASSED**
- unresolved review threads: none
- merge / accepted production-code baseline: `b14bb1b90eb38a703c233724ab77803f5838b17e`
- post-merge PSP CI `33884003915`: **PASSED**
- Production Smoke `33884003888`: **PASSED EVERY GATE**

## Final Public Production State

Exact production identity is now proven as:

`2026-09-04-r9 / 2026-09-04-chapter-logo-origin-fix-v1`

Public production evidence verifies:

- liveness identity;
- database/auth/baseline/member-mobile readiness;
- manifest and stable PWA identity;
- installer public content;
- Chapter-logo fallback delivery;
- login UX marker/content;
- production security headers;
- canonical invalid-login response;
- cross-site login rejection;
- public Digital Member ID / Certificate verification routes do not produce application 500s.

## Still External / Controlled

The following are not closed by public smoke or CI alone:

- real welcome/activation email receipt and rendering after controlled Admin approval;
- real Chapter-logo upload/removal with production credentials;
- physical Android PWA installation;
- iPhone/iPad Add-to-Home-Screen acceptance;
- real passkey device acceptance;
- controlled authenticated Admin lifecycle/media/member-delete actions;
- second-device QR checks;
- PayMongo Platforms TEST linked-account split-payment E2E;
- database backup/restore drill.

Never mark these complete without direct evidence.