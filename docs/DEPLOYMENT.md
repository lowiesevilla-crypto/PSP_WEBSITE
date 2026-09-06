# Hostinger Production Deployment Runbook

## Production Target

- Application: Psi Sigma Phi Philippines Inc. Digital Membership Platform
- Repository: `lowiesevilla-crypto/PSP_WEBSITE`
- Hosting: Hostinger managed Next.js / Node.js
- Canonical URL: `https://psp.hoahub.tech`
- Production branch: `main`
- Runtime: Node.js 22+
- Database: dedicated PSP MySQL, completely separate from HOAHub

## Current Deployment Status — 2026-09-06

PSP r14 application code is **MERGED AND POST-MERGE CI GREEN**, but exact production deployment is **NOT YET PROVEN**.

Current release evidence:

- target identity: `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`;
- PR #34 final exact head: `6a4fbe1552fdcd857363b12975f34c25f0c7b954`;
- exact-head PSP CI #572 / run `34004473069`: PASSED;
- merge/main SHA: `3701313f371b473df8400ed7404359fb6a5ccf72`;
- post-merge PSP CI #573 / run `34005600398`: PASSED every required gate.

Production Smoke run #25 has not yet proven r14:

- attempt 1: production was reachable on all 40 probes but remained on r13 for the complete deployment window;
- attempt 2: GitHub runner timed out on all 40 probes while DNS still resolved;
- attempt 3: exact retry initiated against the same merge SHA.

Do not mark r14 deployed until `/api/health` reports the exact r14 release/generation and the remaining readiness/public/PWA/security smoke steps pass.

## Hostinger Application Setup

```text
Repository: lowiesevilla-crypto/PSP_WEBSITE
Branch: main
Node.js: 22 or later compatible LTS
Build command: npm run build
Start command supplied by repo: npm run start
Canonical URL: https://psp.hoahub.tech
```

The repository contains CI and Production Smoke workflows only; it does **not** contain a GitHub Actions production-publish workflow. Hostinger deployment is therefore an external hosting/Git integration responsibility. A successful Git merge is not production evidence by itself.

Hostinger may manage runtime start itself, so guarded production initialization is invoked by `npm run build` when `APP_ENV=production`.

## Production Schema Upgrade Safety

`scripts/production-build-init.mjs` runs before `next build` only for `APP_ENV=production`.

Safety rules:

1. Require `DATABASE_URL`.
2. Inspect only the connected PSP DB `information_schema` to classify schema state.
3. Empty dedicated PSP DB may receive initial Prisma schema.
4. Recognized additive upgrade states may synchronize only the reviewed additive fields.
5. Exact current schema skips unnecessary push.
6. Partial/unknown schema fails closed.
7. Automatic Prisma invocation never passes `--accept-data-loss`.
8. Existing PSP baseline/System Admin synchronization remains idempotent.
9. Existing member-mobile/finance permissions and Digital Member ID backfill remain idempotent.
10. r14 hardening schema includes custom-certificate metadata and `Announcement.isPublic`.
11. Any initialization failure stops the build rather than publishing a partial release.

Before any future non-additive production schema change, take a verified backup and use a reviewed migration/recovery plan.

## Core Production Environment

```text
NODE_ENV=production
APP_ENV=production
NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech
DATABASE_URL=mysql://<user>:<password>@<host>:3306/<dedicated_psp_database>
AUTH_SECRET=<strong random secret at least 32 characters>
MEMBERSHIP_NUMBER_PREFIX=PSP
CERTIFICATE_REQUIRE_CURRENT_DUES=false
STORAGE_ROOT=<persistent private storage path>
MAX_IMAGE_UPLOAD_BYTES=5242880
```

Requirements:

- `DATABASE_URL` must be PSP-only, never HOAHub.
- `AUTH_SECRET` and all credential values are Hostinger secrets, never GitHub/chat/screenshots.
- `STORAGE_ROOT` must be persistent and private.

## System Admin Bootstrap

Temporary bootstrap values exist only for initialization/recovery. The real production `/admin` login has previously been verified by the product owner.

After an intended production admin password/bootstrap change:

1. remove all temporary `BOOTSTRAP_ADMIN_*` variables;
2. restart/redeploy;
3. verify `/api/health/ready` remains green;
4. confirm normal `/admin` login without bootstrap variables.

Previously exposed secrets must be rotated before final operational signoff. Never record replacements in documentation or logs.

## SMTP / Welcome Email

Supported variables include `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`/`SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`/`MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_REPLY_TO`, and `SMTP_ENCRYPTION`.

SMTP configuration does not prove inbox delivery. Real welcome/activation and recovery-email rendering remains controlled external acceptance.

## PayMongo Platforms / Linked Accounts

Required server-only platform environment:

```text
PAYMONGO_PLATFORM_SECRET_KEY=<PSP parent/platform secret key>
PAYMONGO_PLATFORM_ACCOUNT_ID=<PSP parent org_* account id>
PAYMENT_CONFIG_ENCRYPTION_KEY=<stable random secret, minimum 32 characters>
PLATFORM_CONVENIENCE_FEE_BPS=<approved integer basis points, optional when fixed fee used>
PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS=<approved fixed centavos, optional when percentage used>
PAYMONGO_LIVE_ENABLED=false
```

r14 Chapter configuration behavior:

1. Chapter Admin/Finance may save a disabled linked-account Draft without parent platform readiness.
2. Draft save does not contact PayMongo or create a child webhook.
3. Chapter remains non-payable while Draft/Blocked.
4. Activation validates parent platform, fee, mode, unique child `org_*`, methods and real child webhook signing readiness.
5. Failed activation preserves `isEnabled=false`.
6. LIVE remains blocked unless `PAYMONGO_LIVE_ENABLED=true` after controlled TEST signoff.

Member must see Chapter amount, PSP platform convenience fee and total before confirmation. Chapter ledger and contribution totals include Chapter amount only.

### PayMongo TEST gate

Before LIVE prove actual provider behavior for DUES, CONTRIBUTION and OTHER; QR Ph/GCash/Maya; exact gross/fee/child settlement; signed webhook; invalid signature rejection; idempotent duplicate handling; cross-Chapter rejection; Chapter-only ledger posting; and receipt/admin reconciliation.

## Production Health / Smoke

### Liveness

```text
GET https://psp.hoahub.tech/api/health
```

For r14 closure it must report:

```text
release = 2026-09-06-r14
deploymentGeneration = 2026-09-06-platform-hardening-v1
```

### Readiness

```text
GET https://psp.hoahub.tech/api/health/ready
```

HTTP 200 is required with at least:

- database `ok`;
- auth schema `ok`;
- baseline `ok`;
- member-mobile schema `ok`;
- custom-certificate schema `ok`;
- public-announcement schema `ok`;
- auth configuration `ok`.

### Exact Production Smoke

The GitHub `PSP Production Smoke` workflow must prove the exact release before it checks the rest. An older Hostinger build must never satisfy the release gate.

After exact r14 appears, smoke also verifies:

- public homepage and r14 public-feed marker;
- manifest stable `id: "/"`;
- registration mobile acknowledgement marker;
- install page content and r14 deployment marker;
- login/recovery/registration markers;
- production security headers;
- canonical-origin invalid login 401;
- cross-site login 403;
- public Digital Member ID/Certificate verification routes do not return application 500.

## Member / Admin Live Acceptance

Credential-dependent production validation still requires controlled records/accounts for:

- Chapter/National member editing;
- Chapter payment Draft/config readiness;
- custom certificate issuance and member download;
- real member dashboard/payment readiness;
- approval/welcome email;
- Digital ID and Certificate second-device QR validation;
- passkey enrollment/login.

Do not perform state-changing acceptance against real member/financial records without an agreed controlled record.

## PWA Device Gate

Representative physical-device acceptance remains required for Android Chrome and iOS/iPadOS Add to Home Screen, standalone launch, safe areas, portrait/landscape, payment QR rendering and no false offline financial state.

## Backup / Recovery Gate

Before final operational signoff:

1. confirm current production MySQL backup;
2. document restore procedure;
3. prove restore/recovery method is available;
4. retain last known-good Git release SHA;
5. do not perform destructive rollback after member/financial data exists without reviewed recovery.

## Current r14 Release Checklist

- [x] canonical domain / HTTPS previously proven
- [x] PR #34 exact-head CI #572 green
- [x] PR #34 exact passing head merged
- [x] post-merge `main` PSP CI #573 green
- [x] r14 code/schema/runtime/security contracts automated in CI
- [ ] Hostinger serves exact r14 release/generation
- [ ] r14 Production Smoke passes readiness/public/PWA/security checks
- [ ] controlled production Admin/Member workflow acceptance where required
- [ ] real recipient email delivery/rendering
- [ ] Android/iOS physical PWA smoke
- [ ] passkey physical-device smoke
- [ ] second-device Digital ID/Certificate QR acceptance
- [ ] PayMongo Platforms real TEST split-payment/provider-webhook acceptance
- [ ] MySQL backup/restore evidence
- [ ] controlled low-value PayMongo LIVE validation after explicit approval

See `STATUS.md`, `PSP_PLATFORM_HARDENING_2026-09-06.md`, `PAYMENTS.md`, and `MEMBER_MOBILE_P0.md` for authoritative details.
