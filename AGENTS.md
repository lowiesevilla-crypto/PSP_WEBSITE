# AGENTS.md — Psi Sigma Phi Philippines Inc. Digital Platform

> **Mandatory project knowledge base.** Every AI agent and developer must read this file plus `docs/STATUS.md` before changing code, schema, UI, security, payments, deployment, or documentation. Update it whenever an approved business/architecture/security/payment/delivery rule changes.

## 1. Project Identity

- **Project:** Psi Sigma Phi Philippines Inc. Digital Membership Platform
- **Repository:** `lowiesevilla-crypto/PSP_WEBSITE`
- **Product form:** public website + installable mobile-first PWA + Member Portal + Chapter Admin Portal + National/System Admin Portal.
- **Organization:** `National Organization → Chapter → Officers/Committees → Members`
- **Isolation:** PSP is completely separate from HOAHub application data, database, secrets and runtime. Never reuse or mix them.

## 2. Production Hosting / Canonical Origin

- Hosting: Hostinger
- Production: `https://psp.hoahub.tech`
- Local: `http://localhost:3000`
- Production email links, PWA links, verification QR URLs, payment return URLs and chapter webhook URLs use the canonical production origin.
- QA/staging, when introduced, must use separate hostname, secrets and database.
- Production liveness: `/api/health`
- Production datastore/auth/member-mobile readiness: `/api/health/ready`

## 3. Official Branding / UX

Official PSP seal is the primary mark.

Palette:

- Gold `#FEC009`
- Black `#000000`
- Charcoal `#151515`
- White `#FFFFFF`

Member experience is **mobile-first/PWA-first**, premium/professional fraternity identity (`Ψ Σ Φ` acceptable), accessible contrast, touch-friendly controls, safe areas, no uncontrolled horizontal overflow.

National and Chapter Administration use the same professional responsive application shell while retaining server-enforced RBAC and chapter scope. Administration must expose clear National-vs-Chapter context, permission-filtered navigation for convenience, touch-friendly mobile controls, and mobile-safe finance/report presentation. UI hiding is never authorization.

## 4. Core Business Scope

### Registration / membership

Registration never automatically creates an active member. Chapter approval is required.

Approved registration fields, in order:

1. First Name
2. Last Name
3. MI
4. Address
5. Email
6. Mobile No.
7. Date Survive
8. Location (survive/initiation location)
9. PSP Birthday Code
10. Date of Birth
11. Select Chapter

Final registration requires two separate server-validated acknowledgements: Membership Application and Data Privacy. Current privacy notice version: `2026-08-20-v1`.

After APPROVED:

- create/activate User/Member as applicable;
- create MembershipHistory;
- assign Member permission scope;
- create unique membership number;
- create Digital Member ID;
- identify current Chapter Chairman;
- send welcome/activation email signed by Chapter Chairman;
- welcome email includes login email, membership number, secure activation/login link and `/install` PWA link;
- never email a plaintext password;
- create in-app welcome notification.

### Member self-service

Member may update approved personal/contact fields. Member self-service must **not** change:

- chapter;
- membership number/code;
- PSP Birthday Code;
- login email/credential identity.

Chapter transfer is an authorized admin workflow with history/audit.

### Chapter / organization

- System Admin creates/changes chapter lifecycle.
- Chapter Admin reviews applications and manages authorized chapter operations.
- Chapter structures/officers/committees are configurable; never hardcode one officer hierarchy for every chapter.
- Officer assignments retain term history.
- Member sees their chapter information and current officers.

### Member mobile dashboard

Core member PWA must expose directly or within one tap:

- chapter + officers;
- outstanding balance;
- total confirmed contributions;
- Pay Now;
- Digital Member ID;
- membership certificate;
- receipts;
- profile/security/passkey;
- PWA install guidance;
- announcements/events/community/notifications.

### Community / events

Posts, images, comments, announcements, moderation, events and notifications remain chapter/national scoped as authorized.

## 5. Finance / Accounting Invariants

Supported member payment categories:

- `DUES`
- `CONTRIBUTION`
- `OTHER`

Rates are chapter-specific and effective-dated. Historical assessments are not rewritten by later rate changes.

Financial invariants:

- posted financial history is append/trace oriented;
- corrections use adjustments/reversals/refunds rather than destructive edits;
- Payment becomes PAID only from trusted server/webhook evidence;
- webhook processing is idempotent;
- receipt is unique per confirmed internal Payment;
- chapter scope is server validated;
- platform convenience fee is **never** credited to dues, contribution totals, member ledger, or chapter collections.

## 6. PayMongo Platforms / Linked Accounts — Canonical Architecture

The canonical architecture for **new member payments** is PayMongo Platforms / Linked Accounts, not per-chapter API-secret Hosted Checkout.

- PSP PayMongo account = parent/platform account.
- Each PSP chapter = linked child PayMongo account (`org_*`).
- Parent platform secret key exists only in server environment.
- PSP acts for a child using parent authentication plus PayMongo `Account-Id` header.
- No chapter PayMongo API secret key is stored by PSP in linked-account mode.
- Child `org_*` Account ID and child webhook signing secret are encrypted at rest.
- Chapter payment configuration is server-side chapter scoped.

### Platform Convenience Fee

Every online member payment includes a separately disclosed **Platform Convenience Fee**.

Configured by operations through:

- `PLATFORM_CONVENIENCE_FEE_BPS` — integer basis points (`300 = 3.00%`);
- `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS` — optional fixed centavos;
- either or both may be used.

Do not invent a default rate. Payments fail closed if both are unset/zero.

Amount definitions:

- **chapter amount** = member obligation/contribution/other amount credited to chapter records;
- **platform fee** = PSP platform convenience fee;
- **gross total** = chapter amount + platform fee.

`Payment.amount` remains the chapter amount. Historical split amounts are snapshotted in immutable audit metadata so later fee changes do not rewrite prior transactions.

### Split settlement

PayMongo Payment Intent:

- gross amount = total paid;
- `split_payment.recipients` sends the configured fixed platform fee to the PSP parent/platform account;
- `split_payment.transfer_to` identifies the chapter linked account for the remainder.

Supported member methods in the current linked-account server flow:

- QR Ph
- GCash
- Maya

Do not collect/process raw card details on the PSP backend. Card support, if later approved, requires a reviewed client-side PayMongo public-key/tokenization flow.

### Webhook / reconciliation

Canonical child webhook pattern:

`https://psp.hoahub.tech/api/webhooks/paymongo/[CHAPTER_CODE]`

Controls:

- verify raw body using child webhook signing secret before parsing/mutation;
- handle `payment.paid` / `payment.failed` for linked Payment Intents;
- match Payment Intent ID to internal Payment within the same chapter;
- compare gateway amount with persisted gross total;
- unique gateway event prevents duplicate posting;
- paid chapter ledger entry posts **chapter amount only**;
- receipt shows chapter amount, platform fee and total paid;
- failed event posts no chapter ledger payment/receipt.

### Live gate

`PAYMONGO_LIVE_ENABLED=false` remains mandatory until TEST-mode split-payment E2E passes and explicit product-owner live approval is given. Presence of a live key is not approval.

External PayMongo Platforms/Linked Accounts capability must be verified before release closure.

See `docs/PAYMENTS.md` for the complete flow/test matrix.

## 7. Certificates / Digital Member ID

### Certificate

- active eligible member may self-generate;
- current Chapter Chairman required at issue time;
- Chairman name/title captured as signatory snapshot;
- unique certificate number + verification token;
- PDF includes signatory and official seal;
- QR verification mandatory under production origin;
- revoked/superseded/expired history is preserved;
- public verification exposes minimum appropriate data.

### Digital Member ID

- one Digital Member ID per member with unique verification token;
- created at approval; existing active members backfilled idempotently;
- mobile card at `/member/id`;
- public verification at `/verify/member/[token]`;
- verification exposes only membership/chapter/status information required to establish validity.

## 8. Passkey / Authentication

- passwords remain strongly hashed; never plaintext.
- passkeys use WebAuthn discoverable credentials and require user verification.
- verified passkey creates the normal PSP secure session.
- passkey registration/authentication/revocation are audit logged.
- after passkey enablement on a device, login hides email/password by default and prioritizes passkey.
- password fallback remains deliberately available for recovery.
- session/RBAC/chapter scope remain server enforced regardless of login method.

## 9. PWA / Responsive Requirements

Mandatory member experience:

- valid web app manifest;
- service worker;
- standalone installation where supported;
- Android install support;
- iOS/iPad Add-to-Home-Screen guidance;
- branded icons;
- portrait/landscape support;
- safe areas;
- touch-friendly controls;
- no uncontrolled horizontal overflow;
- mobile cards instead of desktop-only tables for core member finance/status;
- PWA shortcuts to Member Home, Digital ID, Payments and Certificate.

Authenticated/private/API/payment/certificate pages must not be cached as public offline content. Financial writes require live connectivity. Offline behavior must never fabricate payment state.

Core mobile flows: registration, activation/login/recovery/passkey, dashboard/profile, chapter/officers, events/community, dues/payment, receipts, certificate, Digital Member ID, notifications.

Administration responsive rules:

- desktop may use compact navigation and semantic high-density tables;
- tablet/mobile must use a touch-friendly administration menu;
- controls should be approximately 44–48px minimum touch height;
- finance and operational-report tables transform into labeled record cards below the mobile breakpoint when columns would become unusable;
- normal admin work must not require phone users to zoom a desktop table.

## 10. Roles / Authorization / Isolation

Authorization model:

`Authenticated User + Permission + Chapter Scope + Record Ownership (when applicable)`

UI hiding is not authorization.

Role families include System/National Admin, Chapter Admin, Chapter Treasurer/Finance, Chapter Officer, Member and other configured roles.

Chapter Administrator is permitted to view/manage chapter finance so they can configure the linked chapter PayMongo account; Chapter Treasurer/Finance retains finance permissions. Existing production CHAPTER_ADMIN permissions are synchronized additively during the member-mobile production upgrade.

Chapter users must never access another chapter through APIs, IDs, exports, files, reports, payment configuration or webhooks. National cross-chapter access requires explicit national/system permission.

Chapter-owned entities include Members/applications, positions/officers, committees, content/events, assessments/rates, ledger, payments/receipts, certificates, Digital Member ID status, payment configuration and reports.

Never trust client-supplied `chapterId` without authenticated authority; member payment chapter must be derived from authenticated membership.

## 11. Security Baseline

Mandatory:

- HTTPS production;
- secure cookie sessions;
- origin/CSRF protections for browser writes;
- Zod/input validation at trust boundaries;
- rate limiting for auth/registration/verification/abuse-prone APIs;
- IDOR/BOLA protection;
- least privilege;
- secure upload validation;
- secrets only in environment/secret store;
- no secret/password/token/PayMongo-key logging;
- audit privileged/financial/security actions;
- backups + tested recovery before final production signoff;
- secrets shown in chat/screenshots/tickets/logs are considered exposed and require rotation.

Linked-payment secrets:

- `PAYMONGO_PLATFORM_SECRET_KEY` — server only;
- `PAYMENT_CONFIG_ENCRYPTION_KEY` — stable minimum 32 chars; server only;
- child webhook signing secrets — encrypted at rest;
- never expose these in PWA/browser/manifest/service worker/GitHub/logs/screenshots.

Design for Philippine privacy obligations: purpose limitation, minimization, access control, notice/acknowledgement, retention and incident handling.

## 12. Technology / Domain Baseline

- Next.js App Router 16.x
- React 19.x
- strict TypeScript
- Node 22+
- MySQL + Prisma
- Zod
- SimpleWebAuthn
- PWA manifest/service worker
- Nodemailer abstraction
- PayMongo server integration
- QR/PDF generation

Core entities include Organization, Chapters, User, Role/Permission/Assignment, MembershipApplication, Member/History, ChapterPosition/OfficerAssignment, Committee/Membership, content/events/notifications, assessments/rates, ledger, Payment/Transaction/Receipt, Certificate, PasskeyCredential, DigitalMemberId, ChapterPaymentConfig and AuditLog.

## 13. Production Deployment Rules

- Keep `main` releasable; branch + PR + CI.
- Merge only the **exact head** that passed required CI.
- Production database is dedicated to PSP and separate from HOAHub/dev/QA.
- `npm run build` executes guarded production build initialization when `APP_ENV=production`.
- Empty dedicated DB may receive initial Prisma schema.
- Recognized pre-member-mobile PSP schema may receive the reviewed **additive** member-mobile schema sync.
- Partial/unknown member-mobile schema must fail closed.
- Never pass Prisma `--accept-data-loss` for automatic production upgrade.
- Production initialization must not destructively reseed customized operational data.
- Member-mobile upgrade additively synchronizes Chapter Admin finance permissions and backfills Digital Member IDs idempotently.
- `/api/health/ready` must verify passkey, Digital Member ID and chapter payment configuration tables before returning ready; missing member-mobile schema is a deployment failure.
- Readiness may expose non-secret operational flags for SMTP configuration, PayMongo platform configuration and the live-payment gate. These flags help diagnose production but do not replace real email/payment E2E evidence.
- Post-deploy `/api/health`, `/api/health/ready`, release/generation and functional smoke are mandatory.
- Every production-significant release must use a new release/deployment generation marker when exact-generation proof is required; do not reuse an older marker and then treat a smoke pass as proof of the newer build.
- Email/payment/passkey/device/QR gates require real evidence; source code alone does not close them.

## 14. Current Delivery Baseline — 2026-09-04

### Member Mobile / PWA release

PR #13 is **MERGED** and the production member-mobile schema/runtime is verified.

- PR #13: `feat: complete mobile member PWA and PayMongo split payments`
- exact passing head: `bb2cd5dc0bc261ead7628b52ede46f91da87b2c5`
- PSP CI #349: **PASSED**
- merge SHA: `1e3a37fb9a01226b776932e0caeff9a70c124e0f`
- production readiness includes `database=ok`, `authSchema=ok`, `baseline=ok`, `memberMobileSchema=ok`, `authConfig=ok`, `smtpConfig=configured`.

### Professional responsive UI/UX release

PR #14 is **MERGED** after exact-head CI.

- exact passing head: `b45165d5f845edacf3c53caafd6a347b08452fdf`
- PSP CI #351: **PASSED**
- merge SHA: `f5d44d3bdb7db37ed5140aaca256fbff52d5b600`
- National Admin, Chapter Admin and Member responsive UI is included in the current proven production generation.

### Admin lifecycle + announcement/event media — DEPLOYED; AUTOMATED PUBLIC PROOF COMPLETE

PR #16:

- exact passing head: `971c9f7551f402b0c503c560e6fc292954c7b47f`
- PSP CI #394 / run `33846881681`: **PASSED**
- merge SHA: `58bb97c09ed6bc2989e9f8e3f79c9a56592b114b`
- post-merge PSP CI #395 / run `33847400145`: **PASSED**

PR #17 Production Smoke reliability/status follow-up:

- exact passing head: `44b8a711f773cc546993fb9b8e981c5e55edb81d`
- PSP CI #401 / run `33850830369`: **PASSED**
- merge SHA: `2a1e9a1d40d4b92e407068626744f101b9ff2cd0`
- post-merge PSP CI #402 / run `33851027472`: **PASSED**

Current production proof:

- Production Smoke #9 / run `33851027538`: **PASSED**
- exact production release: `2026-09-04-r5`
- exact deployment generation: `2026-09-04-admin-lifecycle-media-v1`
- `/api/health/ready`: ready
- database/auth/baseline/member-mobile/auth-config: green
- public/PWA routes: green
- required security headers: green
- canonical-origin invalid login: expected 401
- cross-site login: rejected 403
- member/certificate public verification routes: no application 500

Merged/deployed scope includes the Chapter Administrator form-reset correction, National Admin chapter lifecycle controls, National Admin user lifecycle controls, secure private announcement/event image handling, authenticated/scoped media delivery, cross-chapter denial enforcement, and responsive member image presentation.

Production currently reports `payMongoPlatformConfig=not_configured` and `payMongoLive=disabled`. Linked-account payments remain intentionally fail-closed until PayMongo Platforms configuration and TEST settlement signoff are complete.

### Next acceptance gate — controlled authenticated production workflows

The exact r5 implementation is live and its automated/public surface is proven. These state-changing/scoped flows still require controlled production credentials and safe test records before they may be called production-proven:

- Chapter Administrator assignment through the actual National Admin UI;
- controlled chapter deactivate/reactivate;
- controlled user suspend/disable/reactivate;
- same-chapter announcement image access with cross-chapter denial;
- same-chapter event image access with cross-chapter denial;
- representative authenticated mobile Member/Admin rendering.

External gates still open and requiring real evidence:

- controlled Chairman welcome email delivery;
- physical Android/iOS PWA acceptance;
- real passkey registration/authentication;
- Digital Member ID second-device QR validation;
- certificate second-device QR validation;
- PayMongo Platforms capability/linkage, approved fee configuration and TEST split-settlement E2E;
- valid/invalid/duplicate child webhook E2E;
- database backup/restore drill;
- security rotation/bootstrap cleanup where earlier values were exposed.

Authoritative task/evidence status: `docs/STATUS.md`.  
Detailed PR #16 tracker: `docs/ADMIN_LIFECYCLE_CONTENT_MEDIA_2026-09-04.md`.  
Member-mobile acceptance matrix: `docs/MEMBER_MOBILE_P0.md`.

## 15. Documentation Definition of Done

After every material task:

1. update this file when business/architecture/security/hosting/payment/isolation/delivery rules or current baseline state change;
2. update `docs/STATUS.md` with current evidence/state;
3. update the relevant detailed document (`BRD`, `ARCHITECTURE`, `DATA_MODEL`, `DEPLOYMENT`, `IMPLEMENTATION_PLAN`, `PAYMENTS`, `REGISTRATION`, `SECURITY`, `UI_UX`, `MEMBER_MOBILE_P0`);
4. do not leave stale phase/deployment checklists;
5. repository documentation, not chat history, is authoritative;
6. never mark credential/payment/email/device/production checks complete without evidence.
