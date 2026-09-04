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

PSP is an installable **Progressive Web App**. It is not currently distributed as a sideloaded APK/IPA and the website must not imply that a normal hyperlink can silently install mobile software.

Mandatory PWA baseline:

- valid manifest;
- stable manifest `id: "/"` to retain one PSP application identity;
- service worker;
- standalone installation where supported;
- Android/Chromium native install support;
- iPhone/iPad Add-to-Home-Screen guidance;
- branded icons;
- portrait/landscape and safe-area support;
- touch-friendly controls;
- PWA shortcuts for Member Home, Digital ID, Payments and Certificate.

Installer UX rules:

- `/install` is the canonical install guidance page.
- Browser `beforeinstallprompt` must be captured/shared so the global PWA helper and `/install` do not race and cause the Install action to disappear.
- When Chromium exposes the native prompt, **Install PSP App** opens the native browser/platform confirmation.
- If the native prompt is unavailable, show exact Android Chrome/Edge installation guidance.
- On iPhone/iPad, show Safari → Share → Add to Home Screen → Add; Apple does not permit silent website-driven installation.
- Observe standalone and `appinstalled` state and stop encouraging duplicate installation when the browser recognizes the existing PSP installation.
- Do not change the manifest app ID merely to force a new install; doing so can create multiple PSP app identities.

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
- Production smoke failures must identify and fix the exact failed public/auth/security assertion; diagnostic improvements may add labels/evidence but may not weaken or remove acceptance assertions.
- Email/payment/passkey/device/QR/backup/authenticated production state-changing gates require real evidence; source code/public smoke alone cannot close them.

## 18. Current Delivery Baseline — 2026-09-04

Accepted `main` baseline includes:

- PR #13 member mobile/PWA + PayMongo linked-account architecture;
- PR #14 professional responsive UI;
- PR #16 admin lifecycle + secure announcement/event media;
- PR #17 production-smoke reliability;
- PR #18 r5 production-proof documentation;
- PR #19 runtime dependency-audit fail-closed hardening;
- PR #20 evidence reconciliation;
- PR #21 private-media build-tracing correction;
- PR #22 safe Member Delete/Archive + Resend Invitation;
- PR #23 PSP login UX redesign;
- PR #24 PWA install flow + shared branded PSP/Chapter email + Chapter logo management;
- PR #25 r8 public-asset production diagnostic;
- PR #26 canonical Chapter-logo fallback + Admin approval email-delivery visibility/CI contract;
- PR #27 exact r9 production-smoke diagnostics.

Current accepted main SHA:

`b14bb1b90eb38a703c233724ab77803f5838b17e`

Current publicly proven production identity:

- release `2026-09-04-r9`;
- deployment generation `2026-09-04-chapter-logo-origin-fix-v1`;
- PR #26 exact passing head `72c605dc2568c9acb362c481eebe58efd4ad5ec0`, PSP CI #468 / run `33882933038`: PASSED;
- PR #26 merge SHA `b5788298d50981d26c531e746b55149daf1afb42`;
- post-PR-#26 main PSP CI run `33883183121`: PASSED;
- PR #27 exact passing head `d7655723676d21da5bdaae881f43510d39e82c05`, PSP CI #470 / run `33883716480`: PASSED;
- PR #27 merge SHA / current main `b14bb1b90eb38a703c233724ab77803f5838b17e`;
- post-PR-#27 main PSP CI run `33884003915`: PASSED;
- Production Smoke run `33884003888`: PASSED every exact-r9 readiness, public/PWA, Chapter-logo fallback, security-header, login-origin/JSON-failure and public verification-route gate.

r8 incident evidence retained for traceability:

- PR #24 exact head `30efed5f0f80a8e943ee9be0f89ae2cbbe98bcf2`, PSP CI #453 / run `33880569148`: PASSED; merge `aee0a73b694d9e84fec73129e1951fb214bbdb68`;
- r8 became live and ready, but Production Smoke #16 failed because the Chapter-logo fallback redirect inherited Hostinger's internal request origin and pointed at `0.0.0.0:3000`;
- PR #25 diagnostic isolated the failed redirect; PR #26 corrected external fallback generation to use PSP's canonical application origin and advanced release proof to r9;
- the first r9 Production Smoke run `33883183222` still reported an aggregated public-assets failure; PR #27 preserved all assertions while adding per-assertion diagnostics, after which exact r9 Production Smoke `33884003888` passed the complete gate set.

Approval-email implementation evidence:

- the approval route attempts the welcome/activation email after successful member creation and returns delivery status to the Admin UI;
- Admin approval UI now surfaces sent versus failed delivery rather than showing only the Membership Number;
- CI verifies that unconfigured SMTP reports `welcomeDelivery=failed`, preserves the approved membership transaction, and records `MEMBER_WELCOME_EMAIL_FAILED` audit evidence;
- production readiness reports SMTP `configured`;
- actual inbox receipt/rendering after a controlled real Admin approval is still an external acceptance item and must not be claimed solely from configuration/source/CI evidence.

Detailed tracker: `docs/PWA_INSTALL_EMAIL_BRANDING_2026-09-04.md`.

## 19. Open External / Controlled Acceptance Gates

Still require safe credentials, controlled records, representative devices or external provider access:

- controlled National/Chapter Admin lifecycle actions;
- controlled member invitation delivery and archive/delete;
- controlled Chapter logo upload/removal in production;
- real branded welcome/activation email receipt and rendering after a controlled Admin approval;
- real application-status and password-reset email rendering;
- Android PWA native installation acceptance;
- iPhone/iPad Add-to-Home-Screen acceptance;
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