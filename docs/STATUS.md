# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Release identity:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> Read with `../AGENTS.md`. Never claim provider-, credential-, device-, inbox-, payment-, backup-, or production-state behavior without direct evidence.

## Executive Status

PSP r14 backend/readiness and the Chapter PayMongo Draft UX are deployed. Two P0 production-review hotfix tracks are being closed independently:

1. **Certificate lifecycle hotfix PR #42** — merged on exact passing head `94770571b37806c17b9ab343d2df4fe3b5601f26`; merge SHA `80ab8b501a74b02995c4dd0fc0e71c5bf86fa511`; post-merge PSP CI #644 passed completely. Dedicated certificate production capability verification is pending Hostinger publication/combined follow-up deployment evidence.
2. **PayMongo National Admin activation UX PR #43** — active. It exposes credential-encryption setup guidance and makes the fail-closed Enable Online Payment control actionable instead of appearing broken.

The separate public-homepage Hostinger CDN cache defect remains open. It must not be conflated with certificate or Finance hotfix correctness.

## Proven Release Evidence

- PR #34 exact head `6a4fbe1552fdcd857363b12975f34c25f0c7b954` passed PSP CI #572 and merged.
- Merge SHA `3701313f371b473df8400ed7404359fb6a5ccf72` passed post-merge PSP CI #573.
- Production schema/build hotfix PR #37 exact head `c7b2e9f9a22cf36e107d94069f020f17214bf640` passed complete CI and merged.
- Next.js/security/cache PR #38 exact head `60fd5c7e04bd8ea95c97990586d14f61e3f77f89` passed exact-head CI and merged.
- PayMongo Chapter Draft UX PR #39 exact head `396e746e99ac765813f531822477659be0c9c26e` passed exact-head CI and merged.
- Deployment proof PR #40 exact head `870c84264947e05327b09fa41932cd7cb9099037` passed exact-head CI and merged.
- Production `/api/health` directly exposed `financePaymentConfigVersion=chapter-draft-ux-v2`, proving the Chapter Draft Finance code is live.
- Certificate PR #42 exact head `94770571b37806c17b9ab343d2df4fe3b5601f26` passed PSP CI #642, merged as `80ab8b501a74b02995c4dd0fc0e71c5bf86fa511`, and post-merge PSP CI #644 passed every gate.

## Dependency / Build Security

The original three high-severity findings were traced to `prisma@6.19.3 -> @prisma/config -> deepmerge-ts < 8.0.0`. The reviewed fix pins `deepmerge-ts` `8.0.1`; `npm audit fix --force` is not used.

Next.js and `eslint-config-next` are on `16.3.3`. Certificate image normalization uses patched `sharp 0.35.4`.

Permanent release gates include complete high/critical dependency audit, runtime-only audit, Prisma validate/generate/schema application, production-only additive schema regression, lint, typecheck, production build, and runtime/security isolation smoke.

## P0 Certificate Lifecycle — PR #42 MERGED

Implemented and CI-proven:

- Certificate PDF uses the issuing Chapter logo; stored JPG/PNG/WEBP logos are normalized before PDF embedding; national seal is fallback only when no usable Chapter logo exists.
- Successful issuance attempts an email to the member's registered account email with Chapter branding, Chairman message/signature, verification link, and attached certificate PDF.
- Email success/failure creates audit evidence and does not roll back a valid certificate when SMTP delivery fails.
- Chapter Admin/National Admin Delete / Invalidate uses existing `certificates.manage` Chapter scope.
- Delete / Invalidate is a legal/audit-preserving soft revocation: `REVOKED`, `revokedAt`, reason, member notification and audit record.
- QR verification displays `INVALID · REVOKED` for revoked certificates.
- Revoked certificate PDF download fails closed with HTTP 410.

Production capability marker:

`certificateHotfixVersion=chapter-logo-email-invalidation-v1`

A real recipient inbox receipt/rendering remains external acceptance until directly observed.

## P0 PayMongo National Admin Activation UX — PR #43 ACTIVE

The production review showed a valid saved Chapter LIVE draft and parent setup, but Credential Encryption remained required and the Enable Online Payment checkbox appeared unclickable.

PR #43 implements:

- dedicated **Credential Encryption Setup** panel when `PAYMENT_CONFIG_ENCRYPTION_KEY` is absent;
- exact explanation that the key protects Chapter child-webhook signing secrets;
- direction to the production Hostinger app Environment Variables; the PSP browser never stores/displays the master key;
- stable key requirement of at least 32 characters;
- explicit Hostinger hPanel entry point and **Re-check activation readiness** action;
- Enable Online Payment remains clickable for visibility even when blocked;
- clicking while blocked keeps `isEnabled=false` and displays exact blockers;
- once the exact saved Chapter draft, parent platform, encryption and mode prerequisites are ready, selecting Enable prepares activation and still requires explicit **Save & Activate Online Payment** submission;
- backend activation remains fail-closed and checks encryption readiness before any PayMongo child-webhook creation call.

Production capability marker:

`paymentActivationUxVersion=national-admin-v2`

A dedicated production smoke requires this marker, `financePaymentConfigVersion=chapter-draft-ux-v2`, the certificate capability marker, exact r14 identity and green readiness before the PayMongo UX hotfix is called deployed.

## Current Payment Safety State

`PAYMENT_CONFIG_ENCRYPTION_KEY` is a server secret and must not be pasted into Chapter settings, chat, email, screenshots, source code or GitHub. Existing encrypted webhook secrets depend on the stable key unless a controlled rotation migration is performed.

Chapter Online Payment must remain disabled until the activation API confirms all prerequisites. The UI never bypasses this gate.

Real PayMongo split-payment/provider acceptance remains external: no automated CI claim proves real provider settlement or webhook delivery.

## Remaining Production Defect — Hostinger Homepage CDN

The latest completed general Production Smoke again passed exact r14 health/readiness and then failed normal `/` freshness. Live headers included:

- `x-nextjs-cache: HIT`
- `x-nextjs-prerender: 1`
- `cache-control: s-maxage=31536000`
- `x-hcdn-cache-status: HIT`

This is the already-known upstream homepage cache defect. Hostinger CDN/server cache must be purged/corrected and the unchanged general Production Smoke rerun. Do not weaken the no-store/public-feed assertion.

## Immediate Release Sequence

1. PR #43 final documentation-bearing head must pass every CI gate.
2. Inspect/fix any failed exact job; any source change creates a new head and restarts eligibility.
3. Confirm no unresolved review threads and merge only the exact passing PR #43 head.
4. Verify post-merge `main` CI.
5. Verify Hostinger exposes both `certificateHotfixVersion=chapter-logo-email-invalidation-v1` and `paymentActivationUxVersion=national-admin-v2` with readiness green.
6. Confirm the National Admin Finance page shows the Credential Encryption Setup panel while the key is absent and the actionable fail-closed Enable control.
7. After the server encryption key is configured/reloaded, use Re-check activation readiness; only then may an authorized Admin deliberately proceed to Save & Activate Online Payment when all other blockers are clear.
8. Keep the separate homepage CDN defect open until normal `/` passes the unchanged Production Smoke.

## Controlled / External Pending

- configure a stable production `PAYMENT_CONFIG_ENCRYPTION_KEY` in Hostinger and reload/redeploy the application;
- real PayMongo TEST DUES/CONTRIBUTION/OTHER split-payment E2E;
- real child webhook/signature and split settlement;
- controlled LIVE payment only after deliberate acceptance/approval;
- actual recipient certificate-email receipt/rendering in a real inbox;
- physical Android/iOS installed-PWA acceptance;
- real passkey-device acceptance;
- second-device Digital ID / Certificate QR acceptance where required;
- database backup/restore drill;
- Hostinger homepage CDN cache purge/correction and full Production Smoke closure.

Payment architecture: `PAYMENTS.md`  
Deployment runbook: `DEPLOYMENT.md`  
Detailed tracker: `PSP_PLATFORM_HARDENING_2026-09-06.md`  
UI/UX: `UI_UX.md`
