# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-04 11:45 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`

> This is the authoritative operational status ledger for AI agents and developers. Read it with `../AGENTS.md` and the applicable detailed runbooks before planning or implementing work. Update it after every material state change so project truth never depends on chat history.

## Executive Status

The current production PSP core is **GREEN** through the Hostinger schema/bootstrap release and verified real System Administrator `/admin` browser login. The P0 **Member Mobile / PWA + PayMongo Platforms Split Payment** release is implemented on PR #13 and has reached a technically green candidate, but it is **NOT YET PRODUCTION COMPLETE** because final documentation-head CI, merge, exact-generation Hostinger deployment smoke, and external/device/payment/email evidence remain.

### Current release candidate

- Branch: `feat/member-mobile-core-2026-09-04`
- PR: #13 — `feat: complete mobile member PWA and PayMongo split payments`
- Release ID: `2026-09-04-r3`
- Deployment generation: `2026-09-04-member-mobile-v1`
- Technical candidate head: `dc59a06b47d84b0e410699181500ecb15333dd2a`
- PSP CI #341: **PASSED** on that exact technical candidate
- Review threads at that candidate: **none unresolved**
- PR remains draft while final status/knowledge-base reconciliation receives a fresh exact-head CI run.

Do not merge a later documentation head merely because #341 passed the prior head. The exact final PR head must pass required CI immediately before merge.

## CI Failure → Fix Chronology — PR #13

### PSP CI #337 — FAILED / FIXED

Head: `d95edcb969a33f621b6b7e0c931dc77c48cd7ed3`  
Run ID: `33833115772`

Failed gate: **Typecheck**.

Exact cause:

- `src/app/api/auth/passkeys/authenticate/verify/route.ts`
- `src/app/api/auth/passkeys/register/verify/route.ts`
- SimpleWebAuthn requires `expectedChallenge` as a definite string/callback, but the signed-token payload exposed `challenge?: string` even after runtime validation.

Fix:

- narrowed the return type of `verifyPasskeyChallengeToken()` so a successfully verified challenge is statically guaranteed as `challenge: string`.

Result: later typecheck passed.

### PSP CI #340 — FAILED / FIXED

Head: `73b2c079ad517b400255b84679413bbc736c888e`  
Run ID: `33833857709`

Typecheck and production build passed. Failed gate: **Production runtime and security smoke**.

Exact cause:

- application correctly returned release `2026-09-04-r3` / generation `2026-09-04-member-mobile-v1`;
- CI still asserted the previous release marker `2026-09-04-r2`.

Fix:

- aligned `.github/workflows/ci.yml` runtime assertions with `r3` / `member-mobile-v1`;
- added `/install` to runtime public-route smoke.

### PSP CI #341 — PASSED

Exact head: `dc59a06b47d84b0e410699181500ecb15333dd2a`  
Run ID: `33834007195`

Passed required gates:

- committed high-risk secret pattern scan;
- security-header configuration;
- dependency install;
- Prisma schema validation;
- Prisma client generation;
- CI MySQL schema application;
- PSP baseline seed;
- System Admin + member-linked bootstrap validation;
- cross-chapter fixture preparation;
- strict TypeScript;
- optimized production build;
- production runtime/security smoke;
- production dependency pruning/audit;
- runtime dependency audit enforcement.

Runtime evidence from #341:

- health: `status=ok`, `release=2026-09-04-r3`, `deploymentGeneration=2026-09-04-member-mobile-v1`;
- readiness: `status=ready`, `database=ok`, `authSchema=ok`, `baseline=ok`, `authConfig=ok`;
- malicious cross-site login rejected HTTP 403;
- canonical-origin CI System Admin login returned HTTP 200;
- System Admin retained national `chapterId=null` assignment while also holding a chapter Member identity;
- authenticated `/login` redirected to `/admin`;
- unsigned/invalid legacy PayMongo webhook returned HTTP 401;
- cross-chapter isolation suite passed;
- runtime dependency audit passed.

Build has non-blocking Turbopack dynamic-filesystem tracing warnings for private media storage; they are not a CI failure but remain a deployment-size/performance observation.

## Production State — Before PR #13 Merge

Production is still the prior pre-member-mobile generation. Therefore **the new member-mobile functionality must not yet be claimed as working in production** solely from branch CI.

The prior production foundation remains verified:

- canonical domain/HTTPS;
- dedicated PSP MySQL connectivity;
- auth schema and PSP baseline;
- `AUTH_SECRET` session readiness;
- production security headers/origin protection;
- real System Administrator `/admin` login.

PR #13 updates the production smoke workflow to wait specifically for:

- release `2026-09-04-r3`;
- deployment generation `2026-09-04-member-mobile-v1`.

After merge, GitHub Actions production smoke is the automated proof that Hostinger is actually serving the new member-mobile build rather than the old release.

## P0 Member Mobile Implementation

### Registration / approval / Chairman welcome

**CODE: IMPLEMENTED**

- online registration + chapter selection;
- Chapter Admin scoped review/approval;
- approval creates/activates Member, MembershipHistory, Member role, membership number and Digital Member ID;
- Chairman-signed welcome/activation email;
- email includes login identity, membership number, secure activation/login link and `/install` PWA link;
- no plaintext password email;
- in-app welcome notification.

**SMTP:** product owner reported `SMTP_PASSWORD` configured in Hostinger on 2026-09-04. Status is **CONFIGURED / DELIVERY NOT VERIFIED** until a real controlled approval produces a delivered Chairman welcome email.

### Member dashboard / chapter / finance

**CODE: IMPLEMENTED**

Member PWA includes:

- chapter information + current officers;
- outstanding balance;
- total confirmed contributions;
- DUES / CONTRIBUTION / OTHER online payments;
- QR Ph / GCash / Maya;
- recent payment history and receipt archive.

### Digital Member ID

**CODE: IMPLEMENTED**

- one unique Digital Member ID/token per member;
- created on approval;
- existing active members backfilled idempotently during production upgrade;
- mobile ID at `/member/id`;
- public QR verification at `/verify/member/[token]` with minimum disclosure.

Production second-device QR validation remains open.

### Membership certificate

**CODE: IMPLEMENTED**

- active eligible member self-generates;
- current Chapter Chairman required at issuance;
- Chairman name/title saved as signatory snapshot;
- PDF + unique certificate number + QR verification;
- revocation/status history preserved.

Production second-device QR validation remains open.

### Profile self-service

**CODE: IMPLEMENTED**

Member may update approved personal/contact fields but cannot self-change chapter, membership number/code, PSP Birthday Code or login email/credential identity. Updates are audit logged.

### Passkey login

**CODE: IMPLEMENTED / CI TYPECHECK + BUILD GREEN**

- WebAuthn discoverable passkeys;
- user verification required;
- normal PSP secure session after cryptographic verification;
- registration/auth/revocation audit;
- passkey prioritized with password fields hidden by default after enablement;
- password/recovery fallback remains available.

Real iOS/Android/desktop authenticator smoke remains open.

### Mobile PWA

**CODE: IMPLEMENTED / CI BUILD GREEN**

- standalone manifest/service worker;
- private/auth/payment/API state excluded from unsafe public caching;
- Android install prompt support;
- iOS Add to Home Screen guidance;
- `/install` page;
- black/gold PSP visual language;
- safe-area bottom navigation;
- mobile dashboard/payment/receipt/ID/certificate/profile flows;
- PWA shortcuts.

Representative Android/iOS physical-device acceptance remains open.

## PayMongo Platforms / Linked Accounts

**CODE: IMPLEMENTED**  
**ACCOUNT CAPABILITY / TEST SETTLEMENT: NOT YET VERIFIED**  
**LIVE: DISABLED / FAIL-CLOSED**

Architecture:

- PSP = PayMongo parent/platform account;
- each chapter = linked child `org_*` account;
- parent secret is server-only;
- child account ID + child webhook signing secret encrypted at rest;
- no chapter API secret stored in linked-account mode;
- chapter is derived from authenticated member on member payment operations;
- chapter payment config is scoped server-side;
- same linked child account cannot be assigned to multiple PSP chapters;
- child webhook verifies raw signature, Payment Intent, chapter, event idempotency and gross amount before posting.

### Platform Convenience Fee

Approved rule: every online payment contains a separately disclosed PSP Platform Convenience Fee, with PayMongo split settlement directing the fee to PSP and the remainder to the chapter child account.

Configuration:

- `PLATFORM_CONVENIENCE_FEE_BPS`
- `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`

**Actual business fee value is still not supplied.** No default was invented. Payment creation fails closed while both controls are unset/zero.

Accounting rules:

- `Payment.amount` = chapter amount only;
- member ledger posts chapter amount only;
- contribution totals exclude platform fee;
- platform fee and gross total are persisted as immutable split-payment evidence;
- receipt/admin reconciliation display chapter amount, platform fee and total paid separately.

Required environment for linked-payment production deployment:

- `PAYMONGO_PLATFORM_SECRET_KEY`
- `PAYMONGO_PLATFORM_ACCOUNT_ID`
- `PAYMENT_CONFIG_ENCRYPTION_KEY`
- configured approved platform fee;
- `PAYMONGO_LIVE_ENABLED=false` until TEST signoff and explicit approval.

Required TEST evidence:

1. Platforms/Linked Accounts enabled for PSP;
2. PSP parent + at least one chapter child linked in TEST mode;
3. approved fee configured;
4. DUES split payment;
5. CONTRIBUTION split payment;
6. OTHER split payment;
7. QR Ph / GCash / Maya as enabled;
8. gross = chapter + platform fee;
9. PSP receives fee, chapter receives remainder;
10. valid signed child webhook posts exactly once;
11. invalid signature rejected;
12. duplicate event does not duplicate posting;
13. cross-chapter reference rejected;
14. chapter ledger/contribution totals exclude fee;
15. receipt/reconciliation agree.

Only after TEST signoff and explicit approval may `PAYMONGO_LIVE_ENABLED=true` be enabled for controlled low-value LIVE validation.

## Security Cleanup — Still Open

Earlier troubleshooting exposed sensitive runtime values in screenshots. Values are intentionally not copied here.

Before final operational signoff:

1. rotate temporary/admin password if not already rotated;
2. remove `BOOTSTRAP_ADMIN_*` after password change and verified normal login;
3. rotate other exposed runtime secrets as applicable;
4. redeploy/restart;
5. reconfirm readiness;
6. reconfirm normal `/admin` login;
7. rerun production smoke.

Never record replacement secrets in GitHub/chat/screenshots/tickets.

## Production Upgrade Safety — PR #13

The member-mobile release adds passkeys, Digital Member ID, chapter payment configuration, payment category/description and certificate signatory data.

Guardrails:

- initialization runs only under `APP_ENV=production`;
- recognizes empty DB, recognized pre-member-mobile PSP schema, current schema, or partial/unknown state;
- automatic schema sync only for empty DB or recognized additive legacy PSP state;
- never uses `--accept-data-loss`;
- partial/unknown schema fails closed;
- baseline initialization remains idempotent;
- Chapter Admin finance permissions are synchronized additively;
- Digital Member IDs are backfilled idempotently.

## Immediate Execution Queue

1. **IN PROGRESS:** run fresh exact-head CI after final AGENTS/STATUS reconciliation.
2. If any gate fails, inspect exact failing job, fix cause, push new head and rerun.
3. When exact final head is green, reconfirm no unresolved review threads and mark PR #13 ready.
4. Merge only with `expected_head_sha` equal to the exact passing head.
5. Monitor automatic Production Smoke on `main` until Hostinger serves `r3` / `member-mobile-v1`.
6. If production smoke fails, inspect exact failing job and remediate before claiming production release success.
7. After production smoke passes, update AGENTS/STATUS with merge SHA + production smoke evidence.
8. Then proceed through external gates: security rotation/bootstrap cleanup; real Chairman welcome email; Android/iOS PWA; real passkey; Digital ID QR; certificate QR; PayMongo TEST split settlement; DB backup/restore.

## Closure Rules

A task is `COMPLETE` only with evidence: exact-head merged code plus required CI, successful automated/live validation, or explicit product-owner confirmation for an external fact.

Credential-dependent, payment, email, backup, device and production-runtime checks must not be closed from source code alone.

## Documentation Discipline

After every material state change:

1. update `AGENTS.md` when business/architecture/security/hosting/payment/isolation/delivery rules change;
2. update this status ledger;
3. update applicable detailed runbooks/documents;
4. update `MEMBER_MOBILE_P0.md` for member-mobile acceptance;
5. never leave phase/deployment checklists stale;
6. documentation is part of Definition of Done.
