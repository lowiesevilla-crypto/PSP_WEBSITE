# AGENTS.md — Psi Sigma Phi Philippines Inc. Digital Platform

> **Mandatory project knowledge base.** Read this file plus `docs/STATUS.md` before changing PSP code, schema, UI, security, payments, deployment, or documentation. Repository documentation is authoritative; chat history is not.

## 1. Product Identity & Isolation

- Project: Psi Sigma Phi Philippines Inc. Digital Membership Platform.
- Repository: `lowiesevilla-crypto/PSP_WEBSITE`.
- Production: `https://psp.hoahub.tech`.
- Product: public website + installable mobile-first PWA + Member Portal + Chapter Admin Portal + National/System Admin Portal.
- Organization model: `National Organization → Chapter → Officers/Committees → Members`.
- PSP is completely separate from HOAHub data, database, runtime, secrets, and tenant model. Never mix them.

## 2. Production / Canonical Origin

- Hosting: Hostinger.
- Canonical production origin: `https://psp.hoahub.tech`.
- Local origin: `http://localhost:3000`.
- Production email, PWA, QR verification, payment return, public asset, and webhook links use the canonical PSP origin.
- Liveness: `/api/health`.
- Readiness: `/api/health/ready`.
- Every production-significant release uses a new exact release/deployment-generation marker.
- Current hardening target: `2026-09-07-r15 / 2026-09-07-dues-billing-split-v1`.
- r15 capability markers: `billingDuesVersion=chapter-national-v1` and `splitPaymentContractVersion=linked-split-e2e-v1`.

## 3. Roles, Authorization & Chapter Isolation

Authorization is always:

`Authenticated User + Permission + Chapter Scope + Record Ownership (when applicable)`

UI hiding is never authorization.

- System/National Admin may act across Chapters only with explicit national/system permission.
- Chapter Admin/Chapter Finance/Chapter Officer authority is restricted to authorized Chapter scope.
- Member financial Chapter authority comes from authenticated membership, never arbitrary client `chapterId`.
- Chapter users must never access another Chapter through IDs, APIs, exports, reports, media, member lifecycle, organization, finance configuration, certificates, or webhooks.
- Privileged writes and security/financial state changes are audited.

## 4. Registration, Membership & Admin Editing

Registration does not create active membership. Chapter approval is required.

Approved registration fields include name, address, email, mobile, Date Survive, survive/initiation location, PSP Birthday Code, date of birth, and selected Chapter. Final application requires separate server-validated Membership Application and Data Privacy acknowledgements.

After approval PSP creates/activates the User/Member as applicable, MembershipHistory, MEMBER role/scope, membership number, Digital Member ID, welcome notification, and welcome/activation email workflow.

Member self-service may update approved personal/contact fields but cannot change Chapter, membership number, PSP Birthday Code, or login email/credential identity.

Authorized National/Chapter Admin member editing:

- is server-authorized against the member's exact Chapter;
- may edit approved identity/contact/profile fields;
- must not silently change membership number, login identity, or Chapter;
- Chapter transfer remains the separate audited transfer workflow;
- archive/delete remains non-destructive archival;
- finance, receipt, certificate, membership-history, application, and audit evidence is preserved.

## 5. Member Delete / Archive & Invitation

Delete Member means non-destructive archival, never physical erasure of required records.

Required archive behavior includes ending current Chapter assignments, revoking Digital Member ID and valid certificates, disabling member-only access when safe, preserving other valid authority, blocking administrator self-delete, and retaining accounting/audit/history.

Resend Invitation is available only for authorized approved active memberships still requiring activation. Activation tokens never appear in Admin UI/API/logs. Already activated accounts use password recovery.

## 6. Email

All outbound email uses the shared PSP mailer with plaintext alternative, PSP/Chapter branding, escaped dynamic content, and no plaintext passwords.

Membership approval is committed independently of SMTP delivery. Email failure must not roll back approved membership; Admin sees delivery status, failure is audit logged, and Resend Invitation is the recovery workflow.

SMTP readiness does not prove inbox delivery. Real recipient receipt/rendering remains controlled external acceptance.

## 7. Branding & Private Media

- PSP official seal is the national fallback mark.
- Chapter branding is Chapter-scoped and server-authorized.
- Validated images are JPG/PNG/WEBP with byte-signature/size checks.
- Runtime private media references remain protected.
- The public Chapter-logo endpoint is intentionally read-only/public.
- Public branding does not make community/announcement media public.

## 8. Public Website Content

The public homepage may aggregate National/Chapter content only when explicitly safe for anonymous visitors.

Events:

- require `isPublished=true` and published lifecycle state;
- may show Chapter attribution, title, description excerpt, date, and venue.

Announcements:

- `Announcement.isPublic` defaults **false**;
- only `isPublic=true` announcements may appear on the anonymous homepage;
- existing/member-only announcements must never become public merely because they are active;
- Admin UI must clearly distinguish `PUBLIC WEBSITE` vs `MEMBERS ONLY`;
- protected uploaded announcement images remain authenticated/private unless a future reviewed public-media design is approved.

## 9. PWA / Mobile Rules

**PSP mobile distribution is PWA-only.** Do not add APK/IPA/native-store distribution unless the product owner explicitly changes direction.

Required baseline:

- stable manifest `id: "/"`;
- `start_url: "/member"`, scope `/`, standalone display;
- service worker scoped to `/`;
- Android/Chromium browser-native install support;
- iPhone/iPad Safari Add-to-Home-Screen guidance;
- safe-area, portrait/landscape, touch-friendly responsive UI;
- `/install` is canonical and release-significant, non-stale content;
- authenticated/private/API/payment/certificate content must not become authoritative public offline cache state;
- offline behavior never fabricates payment/member/security state.

## 10. Administration UI / Table Standard

National and Chapter Administration use one professional responsive shell with server-enforced RBAC.

High-density business registers use the PSP Table Standard:

- server-driven pagination; no silent fixed-record truncation;
- default bounded page size;
- search using relevant human identifiers;
- Chapter/lifecycle/status/category filters where applicable;
- search/filter/page state in URL query parameters;
- explicit result count and `Page X of Y`;
- Previous/Next boundary handling;
- semantic desktop/tablet table;
- below 768px, labeled record-card transformation using `data-label` cells;
- usable mobile actions without horizontal scrolling;
- authorization/Chapter scope reapplied on every query/write.

Current covered registers include Members/Member Directory, Users, Chapter Management, Organization history, Finance registers, and Certificate register.

## 11. Member Mobile Experience

Core Member PWA should expose directly or within one tap:

- member identity/membership number and Chapter;
- outstanding balance;
- Pay/View Dues;
- online-payment readiness/methods;
- total confirmed contributions;
- receipts;
- Digital Member ID;
- all assigned certificates;
- Chapter/officers;
- profile/security/passkey;
- install guidance;
- announcements/events/community/notifications.

The member dashboard is payment-first. If Chapter online payment is unavailable, the UI must explain that state and must not start fee-preview/checkout calls.

## 12. Finance / Accounting Invariants

Supported categories: `DUES`, `CONTRIBUTION`, `OTHER`.

- Chapter rates are effective-dated.
- Historical assessments are not rewritten by later rate changes.
- Corrections use adjustments/reversals/refunds, not destructive edits.
- `PAID` comes only from trusted server/webhook evidence.
- Webhook processing is idempotent.
- Receipt is unique per confirmed Payment.
- Platform convenience fee is never credited to Chapter dues/contribution/ledger/collection totals.
- Member archival never rewrites posted financial history.
- Summary/report totals must not be silently calculated from a capped recent subset.
- Chapter billing requires exact `finance.manage` authority for the selected Chapter.
- National dues require national-scoped `finance.manage`; Chapter Admin attempts to use National billing fail closed.
- National dues fan out to active Chapters while preserving Chapter-specific assessments and member ledger entries.
- National/multi-Chapter administrators must explicitly select a Chapter for Chapter-scoped rates/assessments; the UI must not silently choose the first Chapter.
- Billing duplicate detection must be enforced inside an atomic database transaction so overlapping equivalent requests cannot create duplicate charges.
- PSP finance civil dates are interpreted in `Asia/Manila` (UTC+08:00) before UTC persistence, independent of the administrator browser timezone.
- Member payment UI shows the exact outstanding `Amount to Pay` for assigned Chapter/National dues.

## 13. PayMongo Platforms / Linked Accounts — Canonical Model

New member online payments use **PayMongo Platforms / Linked Accounts**, not independent per-Chapter secret-key Checkout.

- PSP PayMongo account = parent/platform account.
- Each Chapter = linked child `org_*` account.
- Parent secret is server-only.
- Child operations use parent authentication + PayMongo `Account-Id`.
- PSP does not store Chapter PayMongo API secret keys in linked-account mode.
- Chapter `org_*` Account ID is a non-secret provider identifier and may be stored directly.
- Real child webhook signing secret is encrypted at rest.
- One linked child account may belong to only one PSP Chapter.
- Production provider calls are pinned to `https://api.paymongo.com/v1`; `PAYMONGO_API_BASE_URL` overrides are accepted only for loopback test doubles when `APP_ENV=test`.

### Chapter configuration states

1. `NOT_CONFIGURED` — no linked child account saved.
2. `DRAFT` — linked child account/methods are saved, Online Payment disabled; parent/webhook may still be incomplete.
3. `READY` — parent platform, fee, mode, linked account and webhook prerequisites are valid.
4. `ENABLED` — online payment is active for the Chapter in permitted mode.
5. `BLOCKED` — an enabled/saved setup requires remediation and must fail closed.

A **disabled Draft must be saveable even when the PSP parent platform is not configured**. Draft save must not call PayMongo or make the Chapter payable. A staged internal webhook marker is not a real signing secret and runtime payment code must reject it.

Enabling Online Payment requires parent-platform readiness, convenience-fee configuration, matching TEST/LIVE mode, valid child account, and real child webhook signing readiness. Changing linked account while enabled must re-establish webhook readiness or remain disabled.

### Platform fee and settlement

Configured only by approved operations values:

- `PLATFORM_CONVENIENCE_FEE_BPS`
- `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`

Do not invent a fee default. Definitions:

- Chapter amount = amount credited to Chapter records;
- platform fee = PSP convenience fee;
- gross total = Chapter amount + platform fee.

`Payment.amount` remains Chapter amount. Split amounts are snapshotted and historical evidence is immutable.

Payment Intent gross amount is total paid. Split settlement sends configured platform fee to PSP parent and remainder to Chapter child. Current methods: QR Ph, GCash, Maya. Browser return/polling is UX only; signed child webhook is authoritative. Paid ledger entry posts Chapter amount only; receipt shows Chapter amount, platform fee, gross total.

`PAYMONGO_LIVE_ENABLED=false` remains mandatory until real controlled PayMongo TEST split-payment acceptance passes and the audited National Admin TEST Acceptance & LIVE Approval is recorded. The Hostinger LIVE flag and PSP National approval are separate required controls.

See `docs/PAYMENTS.md`.

## 14. Certificates / Digital ID / Passkeys

### Certificates

Standard Membership Certificate remains independently available to eligible members.

Admin-issued certificate model supports Membership, Attendance, Appreciation, Recognition, Outstanding Member, and Custom types with snapshotted:

- certificate type/title;
- citation/text;
- certificate date/reference;
- Chapter/member;
- signatory name/title;
- unique certificate number and QR verification token;
- optional issuance batch ID.

Bulk issuance may target one, multiple, or all eligible in-scope active members. Chapter Admin cannot issue to another Chapter. Batch+recipient idempotency prevents duplicate issuance on retry. Member receives notification and can download all valid assigned certificates. PDF/public QR verification must display actual certificate type/title/date/reference rather than labeling every record Membership Certificate. Revocation preserves history.

### Digital Member ID

One ID per member with unique token; public verification exposes minimum required membership/chapter/status information. Archival revokes rather than deletes.

### Passkeys

WebAuthn requires user verification, creates normal PSP session on successful verification, is audited, retains password recovery fallback, and never weakens RBAC/Chapter scope.

## 15. Security Baseline

Mandatory controls include HTTPS, secure cookie sessions, origin/CSRF protection, input validation, rate limiting for abuse-prone actions, IDOR/BOLA protection, least privilege, secure upload/path containment, secrets only in environment/secret store, no secret/token/password logging, privileged/financial audit logs, and tested backup/recovery before final production signoff.

Payment secrets:

- `PAYMONGO_PLATFORM_SECRET_KEY` server-only;
- `PAYMENT_CONFIG_ENCRYPTION_KEY` stable minimum 32 chars, server-only;
- child webhook signing secret encrypted at rest;
- none may appear in browser/PWA/manifest/service worker/GitHub/logs/screenshots.

Design for Philippine privacy obligations: purpose limitation, minimization, access control, notice/acknowledgement, retention, and incident handling.

## 16. Technology Baseline

- Next.js App Router 16.x
- React 19.x
- strict TypeScript
- Node 22+
- MySQL + Prisma
- Zod
- SimpleWebAuthn
- PWA manifest/service worker
- Nodemailer
- PayMongo server integration
- QR/PDF generation

## 17. CI / Release Governance

- Keep `main` releasable.
- Use branch + PR + CI for material changes.
- Required application gate includes secret scan, security-header checks, Prisma validation/client generation/schema application, deterministic fixtures, lint, hardening contracts/typecheck, production build, runtime/security/isolation smoke, and fail-closed production dependency audit.
- Merge only the **exact PR head** that passed every required gate.
- Before merge, re-read exact PR head and unresolved review threads.
- Use `expected_head_sha` when merging.
- Never use Prisma `--accept-data-loss` for automatic production upgrade.
- Production initializer must refuse partial schema upgrades and must not destructively reseed customized operational data.
- `/api/health/ready` fails when required schema/auth prerequisites are absent.
- After merge, exact post-merge CI and Production Smoke must prove the new release identity and release-significant public/auth/security/PWA markers.
- Production Smoke failures must be investigated/fixed exactly; never weaken an acceptance assertion to make a release pass.
- Missing/malformed/stale/timed-out dependency audit evidence is not a clean audit.
- Email/payment/passkey/device/QR/backup/authenticated production state-changing gates require real evidence; source/public smoke alone cannot close them.

## 18. Current Delivery Baseline — r15 Dues Billing & Split-Payment Hotfix

Active release program: PR #48, branch `hotfix/dues-billing-split-e2e-2026-09-07`, target `2026-09-07-r15 / 2026-09-07-dues-billing-split-v1`.

r15 adds to the prior r14 hardening baseline:

- dedicated **Create Dues / Bill** Admin workflow;
- explicit `CHAPTER` vs `NATIONAL` billing scope;
- Chapter Admin exact-scope billing and National escalation denial;
- National Admin National Dues fan-out across active Chapters;
- member-visible exact `Amount to Pay`;
- transactionally protected duplicate-billing prevention;
- Asia/Manila civil-date handling independent of browser timezone;
- deliberate Chapter selection for multi-Chapter/National administrators;
- PayMongo test endpoint override restricted to isolated loopback TEST use;
- deterministic authenticated Chapter Admin + National Admin + Member billing/split-payment E2E;
- exact split contract: Chapter amount + PSP fee = gross, `transfer_to` Chapter linked account, fixed PSP fee recipient, Chapter ledger credits Chapter amount only;
- exact r15 production capability markers and smoke assertions.

Prior r14 scope remains part of the current product baseline: PayMongo Chapter Draft→Activate, scoped Admin member editing, complete-history Finance summaries/registers, responsive Admin Table Standard, payment-first Member Dashboard, privacy-safe public content, custom/bulk certificates, additive schema/readiness hardening and CI isolation/security gates.

Automated evidence is recorded in `docs/STATUS.md`, `docs/PAYMENTS.md`, `docs/BILLING_DUES_SPLIT_E2E_2026-09-07.md`, and `docs/PSP_PLATFORM_HARDENING_2026-09-06.md`. Do not call r15 production-proven until exact merge, post-merge CI, and exact r15 billing capability production smoke are successful.

## 19. Open External / Controlled Acceptance

Even after automated r15 release closure, these remain external until real evidence exists:

- real PayMongo Platforms/Linked Accounts TEST DUES split-payment transaction and observed settlement;
- real PayMongo TEST CONTRIBUTION/OTHER split-payment transaction and observed settlement;
- real child webhook delivery/signature and settlement observation;
- audited National Admin TEST Acceptance & LIVE Approval only after the real TEST evidence exists;
- Hostinger `PAYMONGO_LIVE_ENABLED=true` only after National approval and controlled redeploy;
- controlled first LIVE payment only after TEST signoff and LIVE controls;
- real production admin/member credential workflows where state-changing evidence is required;
- actual recipient email receipt/rendering;
- physical Android PWA installation;
- physical iPhone/iPad Add-to-Home-Screen installation;
- real passkey device acceptance;
- second-device Digital Member ID/Certificate QR acceptance where required;
- database backup/restore drill;
- credential/bootstrap cleanup/rotation where required.

## 20. Documentation Definition of Done

After every material task:

1. update this file when architecture/security/payment/isolation/PWA/public-content/delivery rules change;
2. update `docs/STATUS.md` with current exact evidence;
3. update the relevant detailed tracker;
4. update `docs/UI_UX.md` / `docs/PAYMENTS.md` for material UX/payment behavior;
5. never leave phase/deployment status stale;
6. never mark payment/email/device/QR/backup/production checks complete without direct evidence.
