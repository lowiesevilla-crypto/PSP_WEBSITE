# AGENTS.md — Psi Sigma Phi Philippines Inc. Digital Platform

> **Mandatory project knowledge base.** Every AI agent and developer must read this file plus `docs/STATUS.md` before changing code, schema, UI, security, payments, deployment, or documentation. Update it whenever an approved business, architecture, security, payment, isolation, hosting, or delivery rule changes.

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

Member experience is **mobile-first/PWA-first**, premium/professional fraternity identity (`Ψ Σ Φ` acceptable), accessible contrast, touch-friendly controls, safe areas and no uncontrolled horizontal overflow.

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
- activation link is time-limited and member creates their own password;
- never email a plaintext or temporary password;
- create in-app welcome notification.

### Invitation resend

National/System Admin and the exact authorized Chapter Admin may resend an activation invitation under `members.manage` when an approved active membership still requires account activation.

Rules:

- Chapter Admin is restricted to the member's exact chapter; national scope may act across chapters.
- Suspended or disabled User accounts cannot receive an activation invitation.
- Already activated accounts use normal password recovery instead of activation resend.
- Resend generates a new secure activation link and includes membership number, login email, 24-hour activation expiry notice, `/install` PWA link and current Chapter Chairman identity.
- Activation tokens must never be returned to the administrator UI or logs.
- Resend is rate-limited and audit logged for success/failure.

### Member deletion / archival

National/System Admin and the exact authorized Chapter Admin may use **Delete Member** under `members.manage`.

Deletion is **non-destructive archival**, not physical erasure, because membership, finance, certificate and audit history must remain traceable.

Required behavior:

- set membership to `ARCHIVED`;
- close open MembershipHistory periods and append an archived history record;
- end the member's chapter role assignments, officer assignments and committee memberships;
- revoke Digital Member ID;
- revoke currently valid membership certificates;
- disable the whole User account only when there is no national or other-chapter assignment that must remain usable;
- preserve the User account when national/other-chapter authority must remain valid;
- block administrator self-deletion to prevent lockout;
- preserve assessments, ledger entries, payments, receipts, certificate history, approved application history and audit logs;
- remove archived members from the normal active Member Directory while retaining authorized reporting/audit access.

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
- platform convenience fee is **never** credited to dues, contribution totals, member ledger, or chapter collections;
- member deletion must never erase or rewrite posted financial history.

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
- public verification exposes minimum appropriate data;
- deleting/archiving a member revokes currently valid certificates rather than deleting certificate history.

### Digital Member ID

- one Digital Member ID per member with unique verification token;
- created at approval; existing active members backfilled idempotently;
- mobile card at `/member/id`;
- public verification at `/verify/member/[token]`;
- verification exposes only membership/chapter/status information required to establish validity;
- deleting/archiving a member revokes the Digital Member ID.

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
- normal admin work must not require phone users to zoom a desktop table;
- privileged member actions show clear busy/disabled/error/success states and prevent duplicate execution.

## 10. Roles / Authorization / Isolation

Authorization model:

`Authenticated User + Permission + Chapter Scope + Record Ownership (when applicable)`

UI hiding is not authorization.

Role families include System/National Admin, Chapter Admin, Chapter Treasurer/Finance, Chapter Officer, Member and other configured roles.

Chapter Administrator has `members.manage` for the exact assigned chapter and may therefore perform approved member lifecycle actions, including invitation resend and safe member deletion/archive, only in that chapter. National/System Admin with national `members.manage` may perform those actions across chapters.

Chapter Administrator is permitted to view/manage chapter finance so they can configure the linked chapter PayMongo account; Chapter Treasurer/Finance retains finance permissions. Existing production CHAPTER_ADMIN permissions are synchronized additively during the member-mobile production upgrade.

Chapter users must never access another chapter through APIs, IDs, exports, files, reports, member lifecycle actions, payment configuration or webhooks. National cross-chapter access requires explicit national/system permission.

Chapter-owned entities include Members/applications, positions/officers, committees, content/events, assessments/rates, ledger, payments/receipts, certificates, Digital Member ID status, payment configuration and reports.

Never trust client-supplied `chapterId` without authenticated authority; member payment chapter must be derived from authenticated membership.

## 11. Security Baseline

Mandatory:

- HTTPS production;
- secure cookie sessions;
- origin/CSRF protections for browser writes;
- Zod/input validation at trust boundaries;
- rate limiting for auth/registration/verification/abuse-prone APIs and repeated invitation delivery;
- IDOR/BOLA protection;
- least privilege;
- secure upload validation;
- secrets only in environment/secret store;
- no secret/password/token/PayMongo-key logging;
- activation tokens never exposed to Admin UI;
- audit privileged/financial/security actions;
- backups + tested recovery before final production signoff;
- secrets shown in chat/screenshots/tickets/logs are considered exposed and require rotation.

Linked-payment secrets:

- `PAYMONGO_PLATFORM_SECRET_KEY` — server only;
- `PAYMENT_CONFIG_ENCRYPTION_KEY` — stable minimum 32 chars; server only;
- child webhook signing secrets — encrypted at rest;
- never expose these in PWA/browser/manifest/service worker/GitHub/logs/screenshots.

Design for Philippine privacy obligations: purpose limitation, minimization, access control, notice/acknowledgement, retention and incident handling. Administrative deletion must respect retention/legal/accounting obligations instead of performing indiscriminate physical erasure.

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
- Runtime dependency-audit evidence is a required security gate: registry/transport errors, timeouts, malformed reports, or missing vulnerability metadata must fail closed rather than be interpreted as zero vulnerabilities.
- A dependency-audit failure caused solely by unavailable evidence is an external CI security-gate condition, not proof of an application regression. Inspect the exact log and rerun the exact job/head; never bypass or reinterpret missing evidence as a pass.
- Audit-source outage tolerance may use multiple independent bounded attempts, explicit fetch timeouts and workflow-controlled backoff, but every accepted result must still pass trusted audit-report schema validation. Missing, stale, malformed, timed-out or operational-error evidence must never be substituted for a successful audit report.
- Hosting/WAF browser challenges that return non-application HTTP responses to automated health checks are operational reachability failures. Inspect the exact response and rerun the exact smoke job; never call the release healthy from that failed attempt and never change application security merely to make the bot challenge pass.
- Email/payment/passkey/device/QR and authenticated production state-changing gates require real evidence; source code alone does not close them.

## 14. Current Delivery Baseline — 2026-09-04

Accepted merged production baseline on `main` includes:

- PR #13 member mobile/PWA + linked-payment architecture;
- PR #14 professional responsive UI;
- PR #16 admin lifecycle + secure announcement/event media;
- PR #17 production-smoke reliability;
- PR #18 r5 production-proof documentation closure;
- PR #19 runtime dependency-audit fail-closed hardening;
- PR #20 evidence reconciliation;
- PR #21 private-media Turbopack build-tracing correction.

Current main SHA: `6fac2b58b9bc94d55958680ce44f90613d1c4fde`.

Current publicly proven production identity remains:

- release `2026-09-04-r5`;
- deployment generation `2026-09-04-admin-lifecycle-media-v1`.

Active production-significant branch:

- `feat/member-delete-resend-invitation-2026-09-04`;
- target release `2026-09-04-r6`;
- target deployment generation `2026-09-04-member-admin-invitation-v1`;
- implements National/System Admin and Chapter Admin safe Delete Member + Resend Invitation under `members.manage` scope;
- not accepted or production-proven until final exact-head CI, merge, post-merge CI and exact r6 Production Smoke pass.

Controlled authenticated production acceptance still requires safe credentials/test records. Never fabricate completion for member delete, invitation delivery, chapter/user lifecycle, scoped media, device, email, PayMongo, QR or backup/restore gates.

Authoritative evidence/state: `docs/STATUS.md`.  
Member administration tracker: `docs/MEMBER_ADMIN_DELETE_INVITATION_2026-09-04.md`.  
Private-media tracker: `docs/PRIVATE_MEDIA_BUILD_TRACING_2026-09-04.md`.  
Runtime-audit tracker: `docs/CI_RUNTIME_AUDIT_HARDENING_2026-09-04.md`.  
Member-mobile acceptance: `docs/MEMBER_MOBILE_P0.md`.

## 15. Documentation Definition of Done

After every material task:

1. update this file when business/architecture/security/hosting/payment/isolation/delivery rules or current baseline state change;
2. update `docs/STATUS.md` with current evidence/state;
3. update the relevant detailed document (`BRD`, `ARCHITECTURE`, `DATA_MODEL`, `DEPLOYMENT`, `IMPLEMENTATION_PLAN`, `PAYMENTS`, `REGISTRATION`, `SECURITY`, `UI_UX`, `MEMBER_MOBILE_P0` or current work tracker);
4. do not leave stale phase/deployment checklists;
5. repository documentation, not chat history, is authoritative;
6. never mark credential/payment/email/device/production checks complete without evidence.
