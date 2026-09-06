# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Release identity:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> Read with `../AGENTS.md`. Never claim provider-, credential-, device-, inbox-, payment-, backup-, approval-, or production-state behavior without direct evidence.

## Executive Status

PSP r14 is deployed with the Chapter PayMongo Draft UX and certificate lifecycle hotfix. Production review then exposed a governance defect in LIVE payment activation: the UI said **"pending test-mode signoff and explicit approval"**, but no actual National Admin signoff workflow existed. `PAYMONGO_LIVE_ENABLED` was acting as the entire LIVE gate.

P0 hotfix PR #44 adds the missing auditable National Admin TEST Acceptance & LIVE Approval workflow while preserving the Hostinger server LIVE kill-switch as an independent safeguard.

The new workflow is intentionally **not an automatic approval**. Real TEST acceptance evidence must exist before a National Admin records approval.

## Proven Release Evidence

- PR #34 exact head `6a4fbe1552fdcd857363b12975f34c25f0c7b954` passed PSP CI #572 and merged.
- Merge SHA `3701313f371b473df8400ed7404359fb6a5ccf72` passed post-merge PSP CI #573.
- Production schema/build hotfix PR #37 exact head `c7b2e9f9a22cf36e107d94069f020f17214bf640` passed complete CI and merged.
- Next.js/security/cache PR #38 exact head `60fd5c7e04bd8ea95c97990586d14f61e3f77f89` passed exact-head CI and merged.
- PayMongo Chapter Draft UX PR #39 exact head `396e746e99ac765813f531822477659be0c9c26e` passed exact-head CI and merged.
- Deployment proof PR #40 exact head `870c84264947e05327b09fa41932cd7cb9099037` passed exact-head CI and merged.
- Production `/api/health` exposed `financePaymentConfigVersion=chapter-draft-ux-v2`, proving the Chapter Draft Finance code live.
- Certificate PR #42 exact head `94770571b37806c17b9ab343d2df4fe3b5601f26` passed PSP CI #642, merged as `80ab8b501a74b02995c4dd0fc0e71c5bf86fa511`, and post-merge PSP CI #644 passed every gate.
- Dedicated certificate production smoke passed on current r14, proving `certificateHotfixVersion=chapter-logo-email-invalidation-v1` with readiness green.
- PayMongo National Admin activation UX PR #43 exact head `c1b9a7e7b278ddb00d25c9a0c73713a28b8653c7` passed PSP CI #647, merged as `f3d8de0792d733c71f4b44258a917d999ff1bfd5`, and post-merge PSP CI #648 passed every gate.

## Dependency / Build Security

The original three high-severity findings were traced to `prisma@6.19.3 -> @prisma/config -> deepmerge-ts < 8.0.0`. The reviewed fix pins `deepmerge-ts` `8.0.1`; `npm audit fix --force` is not used.

Next.js and `eslint-config-next` are on `16.3.3`. Certificate image normalization uses patched `sharp 0.35.4`.

Permanent release gates include complete high/critical dependency audit, runtime-only audit, Prisma validate/generate/schema application, production-only additive schema regression, lint, typecheck, production build, and runtime/security isolation smoke.

## P0 Certificate Lifecycle — PRODUCTION CAPABILITY PROVEN

Implemented and production-capability proven:

- Certificate PDF uses the issuing Chapter logo; stored JPG/PNG/WEBP logos are normalized before PDF embedding; national seal is fallback only when no usable Chapter logo exists.
- Successful issuance attempts an email to the member's registered account email with Chapter branding, Chairman message/signature, verification link, and attached certificate PDF.
- Email success/failure creates audit evidence and does not roll back a valid certificate when SMTP delivery fails.
- Chapter Admin/National Admin Delete / Invalidate uses existing `certificates.manage` Chapter scope.
- Delete / Invalidate is a legal/audit-preserving soft revocation: `REVOKED`, `revokedAt`, reason, member notification and audit record.
- QR verification displays `INVALID · REVOKED` for revoked certificates.
- Revoked certificate PDF download fails closed with HTTP 410.

Production capability marker:

`certificateHotfixVersion=chapter-logo-email-invalidation-v1`

Actual receipt/rendering in a real recipient inbox remains controlled external acceptance until directly observed.

## P0 PayMongo National Admin Activation UX — MERGED / CI PROVEN

PR #43 fixed the production-review UX where Credential Encryption was required but the activation control appeared broken:

- dedicated Credential Encryption Setup panel when `PAYMENT_CONFIG_ENCRYPTION_KEY` is absent;
- Hostinger Environment Variables instructions without exposing the key in PSP;
- stable key requirement of at least 32 characters;
- actionable **Re-check activation readiness**;
- Enable Online Payment remains clickable for blocker visibility while fail-closed;
- exact saved Chapter draft remains required before activation;
- activation still requires explicit **Save & Activate Online Payment**;
- encryption readiness is checked before child-webhook provider creation.

Production capability marker:

`paymentActivationUxVersion=national-admin-v2`

## P0 PayMongo TEST Signoff / LIVE Approval — PR #44 ACTIVE

### Root cause

The platform configuration error stated that LIVE processing was disabled pending TEST signoff and explicit approval, but the product had no Admin surface or persisted governance record for that approval. The only implemented switch was the Hostinger environment variable `PAYMONGO_LIVE_ENABLED`.

### Hotfix design

PR #44 adds a real National-only workflow at:

**Admin → Live Approval**  
`/admin/finance/live-approval`

Only a national-scoped assignment with `finance.manage` may approve/revoke LIVE processing.

National Admin must explicitly confirm all controlled TEST acceptance evidence before the API accepts approval:

1. TEST dues payment and expected split amounts verified;
2. TEST contribution/other payment and expected split amounts verified;
3. TEST child webhook, payment status, receipt and reconciliation verified.

Approval/revocation uses append-only AuditLog events with actor, timestamp, checklist/notes or revocation reason. The latest event determines the current governance state.

### Dual-control LIVE safety

LIVE provider actions require both:

1. current National Admin TEST Acceptance & LIVE Approval in PSP; and
2. Hostinger production `PAYMONGO_LIVE_ENABLED=true`.

The PSP approval never changes the Hostinger variable. The Hostinger variable never substitutes for National approval.

Outbound LIVE provider operations centrally enforce the approval before:

- linked Payment Intent creation;
- linked Payment Method creation;
- Payment Method attachment;
- child webhook creation.

TEST-mode provider operations are unaffected by the approval gate.

Production capability marker introduced by PR #44:

`paymongoLiveApprovalVersion=national-signoff-v1`

The dedicated PayMongo activation production smoke is updated to require this marker, the existing Finance/activation/certificate markers, exact r14 identity, and green readiness.

## Current Payment Safety State

`PAYMENT_CONFIG_ENCRYPTION_KEY` is a server secret and must not be pasted into Chapter settings, chat, email, screenshots, source code or GitHub. Existing encrypted webhook secrets depend on the stable key unless a controlled rotation migration is performed.

The National LIVE approval itself must not be fabricated. CI can prove authorization, fail-closed contracts and source/runtime behavior, but real TEST acceptance requires actual provider evidence.

When the National approval has genuinely been recorded, the infrastructure kill-switch is enabled in Hostinger by setting `PAYMONGO_LIVE_ENABLED=true` and redeploying. Only after both controls and all Chapter prerequisites are ready may an authorized Admin deliberately activate LIVE Online Payment.

## Public Homepage Production Smoke

The Hostinger CDN cache-control defect is now improved: the latest inspected normal `/` response returned `Cache-Control: no-store` and `x-hcdn-cache-status: DYNAMIC`. A general Production Smoke still failed because the intermediate deployed homepage response lacked `data-public-chapter-feed-version="global-chapter-feed-v1"`.

This public-homepage assertion is separate from the PayMongo approval hotfix. It must be rerun against the final deployment and must not be weakened.

## Immediate Release Sequence

1. PR #44 final documentation-bearing head must pass every CI gate.
2. If a gate fails, inspect the exact job, fix the exact cause, create a new head, and rerun.
3. Confirm no unresolved review threads and merge only the exact passing PR #44 head.
4. Verify post-merge `main` CI.
5. Verify Hostinger exposes `paymongoLiveApprovalVersion=national-signoff-v1` together with `paymentActivationUxVersion=national-admin-v2`, `financePaymentConfigVersion=chapter-draft-ux-v2`, `certificateHotfixVersion=chapter-logo-email-invalidation-v1` and green readiness.
6. National Admin opens **Live Approval** and records approval only after real TEST evidence exists.
7. After National approval, set `PAYMONGO_LIVE_ENABLED=true` in Hostinger, save and redeploy/restart production.
8. Return to Finance, re-check activation readiness and deliberately activate the Chapter only when all blockers are clear.
9. Rerun the general Production Smoke against the final deployment and separately close any remaining public-homepage assertion.

## Controlled / External Pending

- real PayMongo TEST DUES split-payment evidence;
- real PayMongo TEST CONTRIBUTION/OTHER split-payment evidence;
- real child webhook/signature, payment-status and receipt/reconciliation evidence;
- National Admin TEST Acceptance & LIVE Approval after that evidence exists;
- Hostinger `PAYMONGO_LIVE_ENABLED=true` only after National approval, followed by production redeploy;
- controlled first LIVE payment and split-settlement acceptance;
- actual recipient certificate-email receipt/rendering in a real inbox;
- physical Android/iOS installed-PWA acceptance;
- real passkey-device acceptance;
- second-device Digital ID / Certificate QR acceptance where required;
- database backup/restore drill;
- full general Production Smoke closure for the public homepage.

Payment architecture: `PAYMENTS.md`  
Deployment runbook: `DEPLOYMENT.md`  
Detailed tracker: `PSP_PLATFORM_HARDENING_2026-09-06.md`  
UI/UX: `UI_UX.md`
