# PSP PWA Install + Email Branding — 2026-09-04 / 2026-09-05

**Original feature PR:** #24  
**Corrective PRs:** #25, #26, #27  
**PWA simplification PR:** #30  
**Current main SHA:** `642f430194537e8be144f097f226e20565c2f251`  
**Observed live runtime:** `2026-09-05-r10 / 2026-09-05-simple-pwa-install-v1`  
**Active corrective branch:** `fix/pwa-install-cache-refresh-2026-09-05`  
**Corrective target:** `2026-09-05-r11 / 2026-09-05-pwa-install-cache-fix-v1`

## Canonical Product Direction — PWA Only

PSP mobile distribution is **PWA-only**. PR #29's native Android APK/Trusted Web Activity experiment was explicitly superseded by product direction and closed **without merge**.

The member experience is intentionally simple:

1. open `https://psp.hoahub.tech/install`;
2. install/add PSP using the phone browser's PWA mechanism;
3. PSP appears as one Home Screen/app-launcher icon;
4. future access is through that icon;
5. all installed devices use the same PSP account/backend.

Do not add APK, IPA, Play Store or App Store distribution unless the product owner explicitly changes this requirement later.

## PR #30 — Simplified Cross-Platform PWA UX

Android:

- **Install PSP App** is the primary action;
- Chromium `beforeinstallprompt` is invoked when available;
- fallback is browser menu → **Install app / Add to Home screen**;
- Messenger/Facebook/Instagram and similar in-app browsers are detected and users are directed to Chrome or Samsung Internet.

iPhone/iPad:

- primary action is **Add PSP to Home Screen**;
- Safari guidance is **Share → Add to Home Screen → Add**;
- iPad desktop-style user-agent mode is handled;
- in-app browser users are directed to Safari.

Shared behavior:

- standalone mode is treated as installed and offers **Open PSP**;
- manifest `id: "/"` remains stable;
- `start_url: "/member"`, scope `/`, display `standalone` remain unchanged;
- no APK/IPA/App Store explanation is part of the canonical member flow;
- `/install` exposes `data-pwa-install-version="simple-cross-platform-pwa-v1"` for CI/production proof.

Exact PR #30 evidence:

- exact passing head: `da6902fd51161473a250a984ec1a2fa69ec19951`
- PSP CI #497 / run `33929737781`: **PASSED**
- unresolved review threads: none
- merge SHA: `642f430194537e8be144f097f226e20565c2f251`
- post-merge PSP CI #498 / run `33929909162`: **PASSED**

## r10 Production Freshness Incident

Production Smoke run `33929909263` was executed against the PR #30 merge SHA.

Both attempt 1 and the exact-job retry reached exact r10 application identity successfully:

- `/api/health`: HTTP 200 with `release=2026-09-05-r10` and `deploymentGeneration=2026-09-05-simple-pwa-install-v1`;
- `/api/health/ready`: HTTP 200 / ready;
- database/auth/baseline/member-mobile/auth-config checks were green;
- SMTP was configured;
- PayMongo platform remained not configured and live payments disabled.

The production smoke then failed deterministically at:

`FAILED_ASSERTION=install-primary-action pattern=Install PSP App`

The public `/install` endpoint returned HTTP 200 but served the older installer HTML containing:

- `PSP Mobile App`;
- `Android / Chrome / Edge`;
- `No app-store download required`;

It did not contain the r10 `Install PSP App` action or the new installer marker. Re-running the exact production smoke produced the same stale response.

Conclusion: exact health identity alone did not guarantee that release-significant public HTML was fresh. The failure is classified as a public page/cache freshness defect, not a database/authentication/runtime-startup regression. The smoke assertion remains mandatory and was not weakened.

## r11 Corrective Strategy

Active branch: `fix/pwa-install-cache-refresh-2026-09-05`

Target release:

- `2026-09-05-r11`
- `2026-09-05-pwa-install-cache-fix-v1`

Correction:

- `/install` is forced dynamic;
- route revalidation is disabled (`revalidate = 0`);
- local CI must still see the simplified PWA content/marker;
- CI now checks `/install` response cache-control for `no-store` or `no-cache`;
- Production Smoke performs the same cache-control/fresh-content proof after exact r11 becomes live;
- readiness, security headers, origin controls, Chapter-logo fallback, login behavior, verification routes, cross-Chapter isolation and runtime dependency-audit enforcement remain unchanged.

If the framework-level dynamic response does not produce adequate cache-control under CI/production, the exact response/header policy must be corrected rather than weakening the freshness assertion.

r11 remains **NOT production-proven** until its final exact PR head passes the complete CI gate, is merged with exact-head protection, and exact r11 Production Smoke passes every required assertion.

## Email Branding

The shared PSP mailer provides a responsive black/gold/white email shell with:

- PSP seal or Chapter logo;
- `Ψ Σ Φ` identity;
- Chapter name for Chapter-linked communication;
- national PSP fallback when no Chapter logo exists;
- escaped dynamic values;
- security footer;
- plaintext alternative.

Branded workflows include approved-member welcome/activation, administrator Resend Invitation, application correction/pending/rejection notification, and active-account password reset.

Welcome/activation includes Membership Number, login email, Chapter, secure activation action when needed, 24-hour expiry, no-temporary-password wording, `/install` action and current Chapter Chairman sign-off.

## Admin Approval Email Contract

1. authorized Admin approves the application;
2. member records/history/role/Membership Number/Digital Member ID are committed;
3. server attempts welcome/activation email after the approval transaction;
4. API returns `welcomeDelivery` and `activationRequired`;
5. Admin UI displays sent versus failed;
6. email failure does not roll back approved membership;
7. failure creates `MEMBER_WELCOME_EMAIL_FAILED` audit evidence;
8. Resend Invitation is the recovery workflow.

CI proves this contract using an intentionally unconfigured SMTP environment. Production readiness reports SMTP `configured`, but real inbox receipt/rendering remains an external acceptance gate.

## Chapter Logo Management / r8-r9 History

- Chapter logo upload/removal is exact-Chapter authorized under `content.manage`.
- JPG/PNG/WEBP use byte-signature-validated private storage.
- public branding route is `/api/public/chapters/[id]/logo`.
- r8 exposed a Hostinger reverse-proxy redirect defect (`0.0.0.0:3000`).
- PR #25 diagnosed it; PR #26 changed fallback generation to the canonical PSP origin and added Admin approval-email delivery visibility; PR #27 retained all production assertions and improved diagnostics.
- exact r9 Production Smoke `33884003888` passed every gate before the r10 PWA simplification work.

## Still External / Controlled

Not closed by CI/public smoke alone:

- physical Android PWA installation;
- physical iPhone/iPad Add-to-Home-Screen installation;
- real welcome/activation email receipt/rendering after controlled Admin approval;
- real Chapter-logo upload/removal with production credentials;
- real passkey device acceptance;
- controlled authenticated Admin lifecycle/media/member-delete actions;
- second-device QR checks;
- PayMongo Platforms TEST linked-account split-payment E2E;
- database backup/restore drill.

Never mark these complete without direct evidence.
