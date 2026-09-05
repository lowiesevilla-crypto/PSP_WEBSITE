# AGENTS.md — Psi Sigma Phi Philippines Inc. Digital Platform

> **Mandatory project knowledge base.** Every AI agent and developer must read this file plus `docs/STATUS.md` before changing code, schema, UI, security, payments, deployment, or documentation. Update it whenever approved business, architecture, security, payment, isolation, hosting, branding, PWA, email or delivery rules change.

## 1. Project Identity

- **Project:** Psi Sigma Phi Philippines Inc. Digital Membership Platform
- **Repository:** `lowiesevilla-crypto/PSP_WEBSITE`
- **Production:** `https://psp.hoahub.tech`
- **Product:** public website + installable mobile-first PWA + Member Portal + Chapter Admin Portal + National/System Admin Portal
- **Organization model:** `National Organization → Chapter → Officers/Committees → Members`
- **Isolation:** PSP is completely separate from HOAHub application data, database, secrets and runtime. Never reuse or mix them.

## 2. Production / Canonical Origin

- Hosting: Hostinger
- Canonical production origin: `https://psp.hoahub.tech`
- Local origin: `http://localhost:3000`
- Production email links, PWA install links, verification QR URLs, payment return URLs and Chapter webhook URLs use the canonical PSP origin.
- Public redirects and externally rendered asset URLs must also use the canonical application origin; never derive an external redirect from an internal reverse-proxy request origin such as `0.0.0.0:3000`.
- QA/staging, when introduced, must use separate hostname, database and secrets.
- Liveness: `/api/health`
- Datastore/auth/member-mobile readiness: `/api/health/ready`
- Every production-significant release must use a new exact release/deployment-generation marker.

## 3. Official Branding / UX

Primary PSP palette:

- Gold `#FEC009`
- Black `#000000`
- Charcoal `#151515`
- White `#FFFFFF`

The official PSP seal is the national fallback mark. `Ψ Σ Φ` may be used as supporting identity.

Member experience is mobile-first/PWA-first, professional, accessible, touch-friendly, safe-area aware and free of uncontrolled horizontal overflow.

National and Chapter Administration share the professional responsive application shell while retaining server-enforced RBAC and Chapter scope. UI hiding is convenience only and is never authorization.

### Chapter branding

- `Chapters.logoUrl` is the Chapter branding source.
- Authorized Chapter branding writes require server authorization against the exact Chapter.
- Current Chapter-logo management uses existing exact-Chapter `content.manage` authority so System/National Admin and the authorized Chapter Admin may manage branding for the Chapter they are permitted to manage.
- Uploaded Chapter logos use the validated image-storage service: JPG, PNG or WEBP only, byte-signature validated, size governed by `MAX_IMAGE_UPLOAD_BYTES` with 5 MB default.
- Runtime storage references remain `private:` references; arbitrary client-supplied filesystem paths are never accepted.
- The intentionally public read-only branding endpoint is `/api/public/chapters/[id]/logo`.
- If no custom Chapter logo exists or a stored logo cannot be read, use the official `/brand/psp-logo.jpg` fallback through the canonical PSP origin.
- Replacing/removing a Chapter logo must clean up superseded private files after successful persistence and must be audit logged.
- Making the Chapter branding image public does not change the authenticated/scoped rules for community, announcement or event private media.

## 4. Registration / Membership

Registration never creates active membership automatically. Chapter approval is required.

Approved registration fields, in order:

1. First Name
2. Last Name
3. MI
4. Address
5. Email
6. Mobile No.
7. Date Survive
8. Location / survive-initiation location
9. PSP Birthday Code
10. Date of Birth
11. Select Chapter

Final registration requires separate server-validated Membership Application and Data Privacy acknowledgements. Current privacy notice version remains `2026-08-20-v1` unless explicitly superseded.

Registration acknowledgement UX is a mobile-critical control. Each required checkbox must remain clearly visible at phone width, must not shrink inside a flex row, should render at approximately 30×30 CSS px, and the complete acknowledgement card/label must remain tappable so users do not need to target a tiny browser-default checkbox.

After `APPROVED`:

- create/activate User/Member as applicable;
- create MembershipHistory;
- assign MEMBER role/scope;
- generate unique membership number;
- create Digital Member ID;
- identify current Chapter Chairman;
- send welcome/activation email;
- create in-app welcome notification.

The login User may remain `INVITED` until secure activation is completed. PSP never emails a temporary or plaintext password. The member creates their own password through the time-limited activation link.

## 5. PSP Email Rules

All outbound PSP email must use the shared PSP mailer and must retain a plaintext alternative.

Shared HTML email rules:

- professional PSP black/gold/white shell;
- PSP seal / Chapter logo;
- `Ψ Σ Φ` identity;
- Chapter name for Chapter-linked communication;
- PSP national fallback branding when no Chapter logo exists;
- dynamic names/content must be escaped;
- security footer must never encourage password sharing.

Current branded workflows include:

- approved-member welcome / activation;
- administrator Resend Invitation;
- membership application correction / pending requirements / rejection;
- active-account password reset.

Welcome / Resend Invitation content must include, as applicable:

- member name;
- Chapter name;
- Membership Number;
- login email;
- secure activation link/action;
- 24-hour activation expiry notice;
- explicit statement that PSP does not send a temporary/plaintext password;
- PSP `/install` link/action;
- current Chapter Chairman name/title;
- Chapter reply-to email when configured.

Admin approval behavior:

- membership approval is committed independently of SMTP delivery so an email-provider failure does not roll back an already-approved member record;
- the approval API returns `welcomeDelivery` and `activationRequired` status to the authorized Admin UI;
- the Admin UI must clearly report whether the welcome/activation email was sent or failed;
- a failed welcome email must create audit evidence and direct the Admin to verify the member email/SMTP configuration and use **Resend Invitation** where appropriate;
- activation tokens remain only in the intended recipient email and must never be returned in Admin API/UI payloads or logs.

Password-reset links remain short-lived and must never be logged or exposed through administrator UI.

SMTP configuration/readiness does not prove actual inbox delivery. Real email delivery/rendering remains a controlled external acceptance gate until a real recipient confirms receipt.

## 6. Invitation Resend

National/System Admin and exact-authorized Chapter Admin may resend activation invitation under `members.manage` only when an approved active membership still requires account activation.

Rules:

- Chapter Admin is restricted to the member's exact Chapter.
- National scope may act across Chapters.
- Suspended/disabled User accounts cannot receive activation invitation.
- Already activated accounts use password recovery instead.
- Resend generates a new secure activation link.
- Activation token is never returned to admin UI/logs.
- Resend is rate-limited and audit logged for success/failure.

## 7. Member Delete / Archive

**Delete Member is non-destructive archival, not physical erasure.**

Authorized National/System Admin and exact-Chapter Chapter Admin may perform it under `members.manage`.

Required behavior:

- set membership to `ARCHIVED`;
- close current MembershipHistory and append archived history;
- end Chapter role, officer and committee assignments;
- revoke Digital Member ID;
- revoke currently valid membership certificates;
- disable the whole User account only when no valid national/other-Chapter authority must remain;
- preserve valid national/other-Chapter authority when required;
- block administrator self-deletion;
- preserve assessments, ledger, payments, receipts, certificate history, approved application history and audit logs;
- archived members are removed from the normal active directory but remain available to authorized reporting/audit.

## 8. Member Self-Service / Chapter Organization

Member self-service may update approved personal/contact fields but must not change:

- Chapter;
- membership number;
- PSP Birthday Code;
- login email/credential identity.

Chapter transfer is an authorized audited workflow preserving history.

Chapter rules:

- System/National Admin creates and changes Chapter lifecycle.
- Chapter Admin reviews applications and manages exact-Chapter operations.
- Chapter structure/officers/committees are configurable; do not hardcode a universal officer hierarchy.
- Officer assignments preserve term history.
- Member can see Chapter information/current officers.

## 9. Member PWA / Installer Rules

**PSP mobile distribution is PWA-only.** Do not introduce APK, IPA, Play Store, App Store, Trusted Web Activity or another separate native-app distribution path unless the product owner explicitly changes this direction in a future approved requirement.

The required experience is simple: a member visits `https://psp.hoahub.tech/install`, adds PSP to the phone, receives one PSP Home Screen/app-launcher icon, and subsequently opens the same PSP website/account directly from that icon.

Mandatory PWA baseline:

- valid manifest;
- stable manifest `id: "/"` to retain one PSP application identity;
- `start_url: "/member"` and scope `/`;
- `display: "standalone"`;
- service worker scoped to `/`;
- standalone installation where supported;
- Android/Chromium browser-native PWA install support;
- iPhone/iPad Safari Add-to-Home-Screen support/guidance;
- branded icons;
- portrait/landscape and safe-area support;
- touch-friendly controls;
- PWA shortcuts for Member Home, Digital ID, Payments and Certificate.

Installer UX and delivery rules:

- `/install` is the canonical install page and must remain simple/mobile-first.
- `/install` is operational release content referenced from member emails and must not remain stale after a new exact release becomes live. It must be served dynamically/no-store (or an equivalently proven non-stale strategy) and CI/Production Smoke must verify its cache-control behavior.
- Browser `beforeinstallprompt` must be captured/shared so the global PWA helper and `/install` do not race and cause the Install action to disappear.
- On supported Android Chrome/Edge/Chromium, **Install PSP App** opens the browser/OS PWA installation confirmation when `beforeinstallprompt` is available.
- If Android does not expose the direct prompt, show the exact browser-menu fallback: **Install app / Add to Home screen**.
- On iPhone/iPad, show **Safari → Share → Add to Home Screen → Add**. Apple requires the user confirmation; PSP must not present a fake automatic installer.
- Detect common in-app browsers such as Messenger/Facebook/Instagram. These may suppress PWA install capability; direct Android users to Chrome/Samsung Internet and iPhone/iPad users to Safari.
- Observe standalone and `appinstalled` state. Once PSP is running standalone, show **Open PSP** rather than prompting for another install.
- Keep the manifest `id: "/"` stable. Never change it merely to force another installation because doing so can create multiple PSP app identities.
- Installing PSP on another compatible device uses the same PSP account/backend and does not create another member account.
- No APK/IPA download language is part of the canonical PSP member experience.

Authenticated/private/API/payment/certificate content must not be cached as public offline content. Financial writes require live connectivity. Offline behavior must never fabricate payment state.

## 10. Member Mobile Experience

Core Member PWA must expose directly or within one tap:

- Chapter and officers;
- outstanding balance;
- total confirmed contributions;
- Pay Now;
- Digital Member ID;
- Membership Certificate;
- receipts;
- profile/security/passkey;
- PWA install guidance;
- announcements/events/community/notifications.

## 11. Finance / Accounting Invariants

Supported member payment categories:

- `DUES`
- `CONTRIBUTION`
- `OTHER`

Rules:

- Chapter rates are effective-dated.
- Historical assessments are not rewritten by later rate changes.
- Posted finance history is append/trace oriented.
- Corrections use adjustments/reversals/refunds, not destructive edits.
- Payment becomes PAID only from trusted server/webhook evidence.
- Webhook processing is idempotent.
- Receipt is unique per confirmed internal Payment.
- Chapter scope is server validated.
- Platform convenience fee is never credited to Chapter dues/contribution/ledger/collection totals.
- Member archival never deletes or rewrites posted financial history.

## 12. PayMongo Platforms / Linked Accounts — Canonical Architecture

For new member online payments, the canonical model is PayMongo Platforms / Linked Accounts, not independent per-Chapter secret-key Hosted Checkout.

- PSP PayMongo account = parent/platform account.
- Each Chapter = linked child `org_*` account.
- Parent platform secret is server-only.
- Child operations use parent authentication plus PayMongo `Account-Id`.
- PSP does not store a Chapter PayMongo API secret in linked-account mode.
- Child Account ID and webhook secret are encrypted at rest.
- Chapter payment configuration is server-side and Chapter-scoped.

### Platform convenience fee

Configured only through approved operations values:

- `PLATFORM_CONVENIENCE_FEE_BPS`
- `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`

Do not invent a default rate. Payment creation fails closed if both are unset/zero.

Definitions:

- chapter amount = amount credited to Chapter records;
- platform fee = PSP convenience fee;
- gross total = chapter amount + platform fee.

`Payment.amount` remains chapter amount. Historical split amounts are snapshotted and are not rewritten by later fee changes.

### Split settlement / webhook

- Payment Intent gross amount = total paid.
- `split_payment.recipients` sends configured platform fee to PSP parent/platform.
- `split_payment.transfer_to` identifies Chapter linked account for the remainder.
- Current member methods: QR Ph, GCash, Maya.
- Browser return/polling never authoritatively sets PAID.
- Child webhook pattern: `https://psp.hoahub.tech/api/webhooks/paymongo/[CHAPTER_CODE]`.
- Verify raw body/signature before parsing/mutation.
- Match Payment Intent to internal Payment in same Chapter.
- Compare gateway amount to persisted gross total.
- Unique gateway event prevents duplicate posting.
- Paid ledger entry posts Chapter amount only.
- Receipt shows Chapter amount, platform fee and total paid.
- Failed event creates no Chapter ledger payment/receipt.

`PAYMONGO_LIVE_ENABLED=false` remains mandatory until TEST split-payment E2E passes and explicit product-owner live approval is recorded.

See `docs/PAYMENTS.md`.

## 13. Certificates / Digital Member ID / Passkeys

Certificate:

- active eligible member may self-generate;
- current Chapter Chairman required at issue time;
- Chairman name/title captured as signatory snapshot;
- unique certificate number and verification token;
- PDF includes official seal/signatory;
- QR verification uses production origin;
- revoked/superseded/expired history is preserved;
- public verification exposes minimum necessary data.

Digital Member ID:

- one ID per member with unique verification token;
- created at approval/backfilled idempotently;
- member card at `/member/id`;
- public verification at `/verify/member/[token]`;
- public verification exposes minimum membership/chapter/status information;
- archival revokes ID rather than deleting history.

Passkeys:

- passwords remain strongly hashed;
- WebAuthn discoverable credentials require user verification;
- verified passkey creates normal PSP session;
- registration/authentication/revocation are audit logged;
- password fallback remains available for recovery;
- session/RBAC/Chapter scope remain server enforced regardless of login method.

## 14. Authorization / Isolation

Authorization model:

`Authenticated User + Permission + Chapter Scope + Record Ownership (when applicable)`

UI hiding is never authorization.

Role families include System/National Admin, Chapter Admin, Chapter Treasurer/Finance, Chapter Officer, Member and configured roles.

Chapter users must never access another Chapter through APIs, IDs, exports, files, reports, branding, member lifecycle, payment configuration or webhooks. National cross-Chapter access requires explicit national/system permission.

Never trust client-supplied `chapterId` without authenticated authority. Member payment Chapter must come from authenticated membership.

## 15. Security Baseline

Mandatory controls:

- HTTPS production;
- secure cookie sessions;
- origin/CSRF protections for browser writes;
- Zod/input validation at trust boundaries;
- rate limiting for auth/registration/verification/abuse-prone actions;
- IDOR/BOLA protection;
- least privilege;
- secure upload validation;
- path containment for runtime storage;
- secrets only in environment/secret store;
- no secret/password/token/PayMongo-key logging;
- activation/reset tokens never exposed to administrator UI;
- audit privileged/financial/security actions;
- backups + tested recovery before final production signoff;
- secrets exposed in chat/screenshots/tickets/logs must be treated as exposed and rotated.

Linked-payment secrets:

- `PAYMONGO_PLATFORM_SECRET_KEY` server only;
- `PAYMENT_CONFIG_ENCRYPTION_KEY` stable minimum 32 chars, server only;
- child webhook signing secrets encrypted at rest;
- none may appear in PWA/browser/manifest/service worker/GitHub/logs/screenshots.

Design for Philippine privacy obligations: purpose limitation, minimization, access control, notice/acknowledgement, retention and incident handling. Administrative delete/archive must respect accounting/legal retention.

## 16. Technology Baseline

- Next.js App Router 16.x
- React 19.x
- strict TypeScript
- Node 22+
- MySQL + Prisma
- Zod
- SimpleWebAuthn
- PWA manifest/service worker
- Nodemailer shared mailer
- PayMongo server integration
- QR/PDF generation

## 17. CI / Release Governance

- Keep `main` releasable.
- Use branch + PR + CI for material changes.
- Merge only the **exact PR head** that passed all required gates.
- Before merge, re-read PR head SHA and unresolved review threads.
- Use `expected_head_sha` on merge.
- Production database is dedicated to PSP and separate from HOAHub/dev/QA.
- Never use Prisma `--accept-data-loss` for automatic production upgrade.
- Production initialization must not destructively reseed customized operational data.
- `/api/health/ready` must fail when required schema/auth prerequisites are absent.
- Post-deploy exact `/api/health`, `/api/health/ready`, public functional and security smoke are mandatory.
- Runtime dependency audit is fail-closed: missing, malformed, stale, timed-out or operational-error audit evidence is not a clean audit.
- Audit-source tolerance may use bounded independent retries, explicit fetch timeout and backoff only when every accepted report still passes trusted audit schema validation.
- Hostinger/WAF browser challenges are operational reachability failures; inspect/rerun exact smoke. Never weaken application security merely to make a bot challenge pass.
- Exact health identity alone does not prove that every public HTML route is from the same effective release. Production Smoke must assert release-significant public route markers and cache behavior where stale content could survive deployment.
- Production smoke failures must identify and fix the exact failed public/auth/security assertion; diagnostic improvements may add labels/evidence but may not weaken or remove acceptance assertions.
- Email/payment/passkey/device/QR/backup/authenticated production state-changing gates require real evidence; source code/public smoke alone cannot close them.

## 18. Current Delivery Baseline — 2026-09-05

Accepted implementation history includes PR #13, #14, #16, #17, #18, #19, #20, #21, #22, #23, #24, #25, #26, #27, #28, #30 and #31.

PR #29 native Android installer experiment was closed without merge and is not part of the product baseline.

PR #30 simplified the canonical mobile installation to PWA-only. PR #31 closed the stale-installer production issue:

- PR #31 exact passing head `995385a57101e5598f28b5f76f020e44035a2bcf`;
- PSP CI #507 / run `33930404982`: PASSED;
- merge SHA `588e528962c2e21c3238cbcac76a0aa20107b7a9`;
- post-merge PSP CI #508 / run `33930559567`: PASSED;
- exact r11 identity `2026-09-05-r11 / 2026-09-05-pwa-install-cache-fix-v1` is live;
- Production Smoke run `33930559380` first attempt found stale installer HTML, exact failed-job retry then PASSED every public/runtime/security gate;
- successful production evidence specifically passed `Install PSP App`, `One PSP app`, `data-pwa-install-version="simple-cross-platform-pwa-v1"`, manifest stable `id: "/"`, and non-stale `/install` cache-control assertions.

Therefore the automated/public **installable PWA delivery gate is CLOSED / PASSED for r11**. Physical Android installation and physical iPhone/iPad Add-to-Home-Screen acceptance remain separate real-device gates.

Active r12 registration accessibility release:

- branch `fix/mobile-registration-checkbox-2026-09-05`;
- target release `2026-09-05-r12`;
- target generation `2026-09-05-registration-checkbox-v1`;
- the two final registration acknowledgement checkboxes are increased to 30×30 CSS px, explicitly non-shrinking in the flex row, and the full acknowledgement card remains a tappable label;
- CI and Production Smoke require `data-registration-acknowledgement-version="mobile-checkbox-v1"` on `/register` while retaining the already-proven PWA installer checks.

r12 must not merge until its final exact PR head passes the complete PSP CI gate and has no unresolved review threads. After merge, exact r12 Production Smoke must pass before the checkbox change is called production-proven.

Approval-email behavior remains as previously proven at code/CI-contract level: Admin sees sent/failed delivery state, approval is not rolled back on SMTP failure, failure is audit logged, and production SMTP readiness is configured. Actual recipient inbox receipt remains external acceptance.

Detailed PWA/email tracker: `docs/PWA_INSTALL_EMAIL_BRANDING_2026-09-04.md`.

## 19. Open External / Controlled Acceptance Gates

Still require safe credentials, controlled records, representative devices or external provider access:

- controlled National/Chapter Admin lifecycle actions;
- controlled member invitation delivery and archive/delete;
- controlled Chapter logo upload/removal in production;
- real branded welcome/activation email receipt and rendering after a controlled Admin approval;
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

Current production readiness evidence keeps PayMongo platform configuration `not_configured` and live payments `disabled`; do not treat online-payment E2E as closed.

## 20. Documentation Definition of Done

After every material task:

1. update this file when business/architecture/security/hosting/payment/isolation/branding/PWA/email/delivery rules or baseline state change;
2. update `docs/STATUS.md` with current evidence/state;
3. update the relevant detailed tracker/document;
4. document material UI/UX behavior in `docs/UI_UX.md` or the approved detailed UX tracker;
5. never leave deployment/phase status stale;
6. repository documentation, not chat history, is authoritative;
7. never mark credential/payment/email/device/QR/backup/production checks complete without evidence.
