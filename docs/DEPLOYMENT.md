# Hostinger Production Deployment Runbook

## Production Target

- Application: Psi Sigma Phi Philippines Inc. Digital Membership Platform
- Repository: `lowiesevilla-crypto/PSP_WEBSITE`
- Hosting: Hostinger managed Next.js / Node.js
- Canonical URL: `https://psp.hoahub.tech`
- Production branch: `main`
- Runtime: Node.js 22+
- Database: dedicated PSP MySQL, completely separate from HOAHub

## Current Deployment Status — 2026-09-04

Current production foundation is **GREEN** through the guarded Hostinger schema/bootstrap release and verified real System Administrator `/admin` browser login.

The next release is PR #13, branch `feat/member-mobile-core-2026-09-04`, covering member-mobile/PWA/passkey/Digital ID/Chairman certificate and PayMongo Platforms split payments. PR #13 is not production-complete until exact-head CI passes, it is merged, Hostinger deploys it, and the live validation gates in `STATUS.md` / `MEMBER_MOBILE_P0.md` are proven.

## Hostinger Application Setup

```text
Repository: lowiesevilla-crypto/PSP_WEBSITE
Branch: main
Node.js: 22 or later compatible LTS
Build command: npm run build
Start command supplied by repo: npm run start
Canonical URL: https://psp.hoahub.tech
```

Hostinger may manage runtime start itself, so required first-time/upgrade initialization is invoked by `npm run build` when `APP_ENV=production`.

## Production Schema / Member-Mobile Upgrade Safety

`scripts/production-build-init.mjs` runs before `next build` only for `APP_ENV=production`.

Safety rules:

1. Require `DATABASE_URL`.
2. Inspect only the connected DB's `information_schema` to classify schema state.
3. Empty dedicated PSP DB: may apply initial Prisma schema.
4. Recognized pre-member-mobile PSP schema: may apply the reviewed additive member-mobile schema sync.
5. Exact current member-mobile schema: automatic schema push is skipped.
6. Partial/unknown member-mobile schema: fail closed and refuse automatic sync.
7. Automatic Prisma invocation never passes `--accept-data-loss`.
8. Existing PSP baseline/System Admin synchronization remains idempotent.
9. Member-mobile upgrade additively synchronizes Chapter Admin `finance.view` / `finance.manage` permissions.
10. Existing active members receive Digital Member IDs through an idempotent backfill.
11. Any failure stops the build rather than publishing a partially upgraded release.

The additive member-mobile schema introduces/uses:

- `PasskeyCredential`
- `DigitalMemberId`
- `ChapterPaymentConfig`
- Payment category/description
- certificate Chairman signatory snapshot fields

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

Temporary bootstrap values exist only for initialization/recovery. The real production `/admin` login has already been verified by the product owner.

After a successful intended admin login and password change:

1. remove all `BOOTSTRAP_ADMIN_*` runtime variables;
2. restart/redeploy;
3. verify `/api/health/ready` remains green;
4. confirm normal `/admin` login without bootstrap variables.

Previously exposed secrets must be rotated before final operational signoff. Do not record replacements in docs/chat/screenshots.

## SMTP / Welcome Email

Supported variables:

```text
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_USERNAME=        # accepted alias
SMTP_PASSWORD=
SMTP_FROM=
MAIL_FROM_ADDRESS=    # accepted alias
MAIL_FROM_NAME=
MAIL_REPLY_TO=
SMTP_ENCRYPTION=
```

**Current fact:** product owner reported on 2026-09-04 that `SMTP_PASSWORD` has been created/configured in Hostinger.

This means SMTP password configuration is no longer the known missing setting. Email delivery is still **NOT VERIFIED** until a real member approval sends and delivers the Chairman welcome email with correct activation/login and PWA install links. Do not put the SMTP password in chat, GitHub or screenshots.

## PayMongo Platforms / Linked Accounts

New member payments use PayMongo Platforms / Linked Accounts.

Required platform environment:

```text
PAYMONGO_PLATFORM_SECRET_KEY=<PSP parent/platform secret key>
PAYMONGO_PLATFORM_ACCOUNT_ID=<PSP parent org_* account id>
PAYMENT_CONFIG_ENCRYPTION_KEY=<stable random secret, minimum 32 characters>
PLATFORM_CONVENIENCE_FEE_BPS=<approved integer basis points, optional when fixed fee used>
PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS=<approved fixed centavos, optional when percentage used>
PAYMONGO_LIVE_ENABLED=false
```

Rules:

- PSP is the parent/platform PayMongo account.
- Each chapter is configured with its linked child `org_*` Account ID through Chapter Finance/Admin UI.
- PSP does not store a chapter API secret key in linked-account mode.
- Child `org_*` account ID and child webhook signing secret are encrypted at rest using `PAYMENT_CONFIG_ENCRYPTION_KEY`.
- Chapter TEST/LIVE mode must match the PSP platform key mode.
- New online payments fail closed until a platform convenience fee is explicitly configured.
- No fee rate has been supplied by the product owner yet; do not invent one.

### Convenience fee

- `PLATFORM_CONVENIENCE_FEE_BPS`: `300` means 3.00%.
- `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`: fixed centavo fee.
- either or both may be used.

Member sees before confirmation:

```text
Chapter amount
Platform convenience fee
Total to pay
```

PayMongo split settlement sends the configured fee to the PSP parent/platform account and the remainder to the chapter linked child account. Chapter ledger/collection/contribution totals include chapter amount only.

### Chapter child setup

For each chapter:

1. Ensure PayMongo Platforms/Linked Accounts capability is enabled on PSP account.
2. Link/onboard the chapter as a child account in PayMongo TEST mode.
3. Obtain the child Account ID (`org_*`).
4. In PSP Admin → Finance, select chapter and save the linked `org_*` ID.
5. Select enabled methods: QR Ph, GCash, Maya.
6. PSP creates/maintains the child webhook using parent authentication + child `Account-Id` when a signing secret is not already available.
7. PSP encrypts the returned child webhook signing secret.
8. Enable online payments only after platform configuration is ready.

Canonical child webhook pattern:

```text
https://psp.hoahub.tech/api/webhooks/paymongo/<CHAPTER_CODE>
```

### Linked payment TEST gate

Before live activation prove all of the following in TEST mode:

1. parent platform account + chapter child linkage active;
2. approved convenience-fee value configured;
3. DUES Payment Intent and settlement succeed;
4. CONTRIBUTION payment succeeds;
5. OTHER payment succeeds;
6. QR Ph works and status is confirmed server-side;
7. GCash works;
8. Maya works;
9. gross charged = chapter amount + platform fee;
10. PSP platform receives configured fee;
11. child chapter receives remainder;
12. signed child `payment.paid` webhook posts exactly once;
13. invalid signature rejected;
14. duplicate event is idempotent;
15. cross-chapter Payment Intent/webhook rejected;
16. chapter ledger posts chapter amount only;
17. contribution total excludes platform fee;
18. digital receipt shows chapter amount + fee + total;
19. admin reconciliation agrees with member receipt/history.

Only after TEST signoff and explicit product-owner approval may:

```text
PAYMONGO_LIVE_ENABLED=true
```

be configured for one controlled low-value live validation.

### Legacy PayMongo transition

Legacy `PAYMONGO_SECRET_KEY` / `PAYMONGO_WEBHOOK_SECRET` may remain temporarily only to reconcile pre-linked-account transactions created before the member-mobile release. No new linked member payment should use the legacy global Hosted Checkout architecture.

## Production Health / Smoke

### Liveness

```text
GET https://psp.hoahub.tech/api/health
```

### Datastore/auth readiness

```text
GET https://psp.hoahub.tech/api/health/ready
```

HTTP 200 is required with database/auth schema/baseline/auth config ready. Endpoints must never reveal secrets.

After PR #13 merge/deploy, production smoke must additionally prove the intended exact release/generation is serving so an older Hostinger build cannot satisfy the gate.

## Member-Mobile Live Smoke

After merged deployment, test with real production UI:

1. public registration submits successfully;
2. Chapter Admin can review only their chapter;
3. approve a controlled member application;
4. welcome email arrives with correct Chairman, login identity, activation/login link and `/install` link;
5. activation/login succeeds;
6. member dashboard shows chapter, officers, balance and contribution total;
7. profile updates allowed fields but cannot alter chapter/member code;
8. Digital ID opens and QR verifies from a second device/session;
9. membership certificate generates with Chairman signatory and QR verifies;
10. receipt archive opens;
11. passkey enrollment/login works on real device;
12. installed PWA launches standalone and core member journey fits mobile screen without horizontal overflow.

## PWA Device Gate

Representative physical-device acceptance:

- Android Chrome install + standalone launch;
- iOS Safari Add to Home Screen + standalone launch;
- safe-area navigation;
- portrait/landscape;
- small/normal mobile widths;
- payment QR rendering;
- no private/API/payment data cached as false offline truth.

## Backup / Recovery Gate

Before final operational release:

1. confirm current production MySQL backup;
2. document restore procedure;
3. prove restore/recovery method is available;
4. retain last known-good Git release SHA;
5. do not perform destructive rollback after member/financial data exists without reviewed recovery.

## Current Release Checklist

- [x] canonical domain / HTTPS
- [x] production database connectivity/schema/baseline/auth readiness
- [x] real System Admin `/admin` login verified
- [x] `SMTP_PASSWORD` reported configured in Hostinger
- [ ] PR #13 exact-head CI green
- [ ] PR #13 merged
- [ ] member-mobile release deployed and exact generation verified
- [ ] secret rotation/bootstrap cleanup completed and re-smoked
- [ ] Chairman approval/welcome email delivery proven
- [ ] Android/iOS PWA physical-device smoke
- [ ] passkey physical-device smoke
- [ ] Digital ID QR production verification
- [ ] certificate QR production verification
- [ ] PayMongo Platforms capability enabled/verified
- [ ] parent + chapter child TEST linkage proven
- [ ] actual platform convenience fee configured
- [ ] DUES/CONTRIBUTION/OTHER split-payment TEST E2E
- [ ] MySQL backup/restore evidence
- [ ] controlled low-value PayMongo LIVE validation after explicit approval

See `STATUS.md`, `PAYMENTS.md`, and `MEMBER_MOBILE_P0.md` for authoritative details.
