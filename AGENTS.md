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
- Production datastore/auth readiness: `/api/health/ready`

## 3. Official Branding / UX

Official PSP seal is the primary mark.

Palette:

- Gold `#FEC009`
- Black `#000000`
- Charcoal `#151515`
- White `#FFFFFF`

Member experience is **mobile-first/PWA-first**, premium/professional fraternity identity (`Ψ Σ Φ` acceptable), accessible contrast, touch-friendly controls, safe areas, no uncontrolled horizontal overflow.

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

Core mobile flows: registration, activation/login/recovery/passkey, dashboard/profile, chapter/officers, events/community, dues/payment, receipts, certificate, Digital ID, notifications.

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

Core entities include Organization, Chapters, User, Role/Permission/Assignment, MembershipApplication, Member/History, ChapterPosition/OfficerAssignment, Committee/Membership, content/events/notifications, assessments/rates/ledger, Payment/Transaction/Receipt, Certificate, PasskeyCredential, DigitalMemberId, ChapterPaymentConfig and AuditLog.

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
- Post-deploy `/api/health`, `/api/health/ready`, release/generation and functional smoke are mandatory.
- Email/payment/passkey/device/QR gates require real evidence; source code alone does not close them.

## 14. Current Delivery Baseline — 2026-09-04

Current production foundation is green through the Hostinger greenfield schema/bootstrap release and verified real System Administrator `/admin` browser login. Production remains on the pre-member-mobile generation until PR #13 is merged and Hostinger serves the new exact generation.

Current P0 release:

- branch `feat/member-mobile-core-2026-09-04`;
- PR #13 `feat: complete mobile member PWA and PayMongo split payments`;
- release identity is `2026-09-04-r3`, deployment generation `2026-09-04-member-mobile-v1`;
- member registration/welcome, mobile dashboard, chapter/officers, balance/contributions, Digital Member ID, Chairman certificate, self-service profile, receipts, passkey, PWA and linked PayMongo split-payment implementation are present on the release branch;
- PSP CI #337 failed typecheck because a validated WebAuthn challenge still had the inferred type `string | undefined`; the challenge verifier was narrowed to a required string type;
- PSP CI #340 then passed typecheck/build but failed runtime smoke because CI still asserted the old `r2` release marker; the runtime gate was updated to require `r3` and `member-mobile-v1`;
- exact technical candidate head `dc59a06b47d84b0e410699181500ecb15333dd2a` passed PSP CI #341, including Prisma/MySQL, seed/bootstrap, strict TypeScript, production build, runtime/security smoke, canonical admin login + `/admin` redirect, cross-chapter isolation and runtime dependency audit;
- PR #13 had no unresolved inline review threads at that candidate;
- documentation is being reconciled on top of that candidate, so a fresh CI run on the final documentation head is required before merge;
- production smoke has been stamped to require the exact `r3` / `member-mobile-v1` Hostinger deployment after merge so an old deployment cannot satisfy the release gate;
- product owner reports Hostinger `SMTP_PASSWORD` configured; actual delivered Chairman welcome email remains unverified;
- actual convenience-fee value has not been supplied, so split payments intentionally fail closed until operations configures it;
- PayMongo Platforms capability/account linkage and TEST E2E remain external gates;
- real Android/iOS PWA, passkey and QR smoke remain external gates.

Authoritative task/evidence status: `docs/STATUS.md`.  
Member-mobile acceptance matrix: `docs/MEMBER_MOBILE_P0.md`.

## 15. Documentation Definition of Done

After every material task:

1. update this file when business/architecture/security/hosting/payment/isolation/delivery rules change;
2. update `docs/STATUS.md` with current evidence/state;
3. update the relevant detailed document (`BRD`, `ARCHITECTURE`, `DATA_MODEL`, `DEPLOYMENT`, `IMPLEMENTATION_PLAN`, `PAYMENTS`, `REGISTRATION`, `SECURITY`, `UI_UX`, `MEMBER_MOBILE_P0`);
4. do not leave stale phase/deployment checklists;
5. repository documentation, not chat history, is authoritative;
6. never mark credential/payment/email/device/production checks complete without evidence.
