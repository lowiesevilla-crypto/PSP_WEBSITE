# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-06 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Release identity:** `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`

> Read with `../AGENTS.md`. Never claim provider-, credential-, device-, inbox-, payment-, backup-, approval-, or production-state behavior without direct evidence.

## Executive Status

The urgent PayMongo National Admin LIVE-approval product defect is **fixed, merged and production-capability proven**.

Production review had shown the error **"pending test-mode signoff and explicit approval"** even though PSP had no Admin workflow where that signoff could be performed. PR #44 adds the missing audited National Admin workflow while retaining the Hostinger `PAYMONGO_LIVE_ENABLED` variable as an independent infrastructure kill-switch.

PR #44 exact passing head `858934d4dabdf63afebffdae35e2be3bf6c5d497` merged as `dd62dc9c6cb3cd91255e35fad176719938a4c6cb`. Exact-head PSP CI #651 passed every gate; post-merge PSP CI #652 also passed every gate. Dedicated PayMongo production smoke #2 observed `paymongoLiveApprovalVersion=national-signoff-v1` together with the existing Finance/activation/certificate markers and green readiness.

The workflow is intentionally **not automatically approved**. Production readiness currently reports `payMongoLive=disabled`; real TEST evidence, National Admin approval, and the separate Hostinger LIVE kill-switch remain controlled actions.

## Proven Release Evidence

- PR #34 exact head `6a4fbe1552fdcd857363b12975f34c25f0c7b954` passed PSP CI #572 and merged.
- Merge SHA `3701313f371b473df8400ed7404359fb6a5ccf72` passed post-merge PSP CI #573.
- Production schema/build hotfix PR #37 exact head `c7b2e9f9a22cf36e107d94069f020f17214bf640` passed complete CI and merged.
- Next.js/security/cache PR #38 exact head `60fd5c7e04bd8ea95c97990586d14f61e3f77f89` passed exact-head CI and merged.
- PayMongo Chapter Draft UX PR #39 exact head `396e746e99ac765813f531822477659be0c9c26e` passed exact-head CI and merged.
- Deployment proof PR #40 exact head `870c84264947e05327b09fa41932cd7cb9099037` passed exact-head CI and merged.
- Production `/api/health` exposed `financePaymentConfigVersion=chapter-draft-ux-v2`, proving the Chapter Draft Finance code live.
- Certificate PR #42 exact head `94770571b37806c17b9ab343d2df4fe3b5601f26` passed PSP CI #642, merged as `80ab8b501a74b02995c4dd0fc0e71c5bf86fa511`, and post-merge PSP CI #644 passed every gate.
- Dedicated certificate production smoke passed, proving `certificateHotfixVersion=chapter-logo-email-invalidation-v1` with readiness green.
- PayMongo National Admin activation UX PR #43 exact head `c1b9a7e7b278ddb00d25c9a0c73713a28b8653c7` passed PSP CI #647, merged as `f3d8de0792d733c71f4b44258a917d999ff1bfd5`, and post-merge PSP CI #648 passed every gate.
- PayMongo TEST Signoff/LIVE Approval PR #44 exact head `858934d4dabdf63afebffdae35e2be3bf6c5d497` passed PSP CI #651 and merged as `dd62dc9c6cb3cd91255e35fad176719938a4c6cb`.
- Post-merge PSP CI #652 passed the complete high/critical audit, Prisma/schema, production additive upgrade, lint, typecheck, production build, runtime/security smoke and runtime-only audit.
- Dedicated PayMongo production smoke #2 observed, on the live site, `financePaymentConfigVersion=chapter-draft-ux-v2`, `paymentActivationUxVersion=national-admin-v2`, `paymongoLiveApprovalVersion=national-signoff-v1`, `certificateHotfixVersion=chapter-logo-email-invalidation-v1`, exact r14 identity and readiness HTTP 200/ready.

## Dependency / Build Security

The original three high-severity findings were traced to `prisma@6.19.3 -> @prisma/config -> deepmerge-ts < 8.0.0`. The reviewed fix pins `deepmerge-ts` `8.0.1`; `npm audit fix --force` is not used.

Next.js and `eslint-config-next` are on `16.3.3`. Certificate image normalization uses patched `sharp 0.35.4`.

Permanent release gates include complete high/critical dependency audit, runtime-only audit, Prisma validate/generate/schema application, production-only additive schema regression, lint, typecheck, production build, and runtime/security isolation smoke.

## Certificate Lifecycle — PRODUCTION CAPABILITY PROVEN

- Certificate PDF uses the issuing Chapter logo; stored JPG/PNG/WEBP logos are normalized before PDF embedding; national seal is fallback only when no usable Chapter logo exists.
- Successful issuance attempts email to the member's registered account email with Chapter branding, Chairman message/signature, verification link and attached certificate PDF.
- Email success/failure creates audit evidence and does not roll back a valid certificate when SMTP delivery fails.
- Chapter Admin/National Admin Delete / Invalidate uses `certificates.manage` Chapter scope.
- Delete / Invalidate is an audit-preserving soft revocation: `REVOKED`, `revokedAt`, reason, member notification and audit record.
- QR verification displays `INVALID · REVOKED`; revoked PDF download fails closed with HTTP 410.

Production marker: `certificateHotfixVersion=chapter-logo-email-invalidation-v1`.

Actual recipient inbox receipt/rendering remains controlled external acceptance until directly observed.

## PayMongo National Admin Activation UX — PRODUCTION CAPABILITY PROVEN

- Credential Encryption Setup panel identifies missing `PAYMENT_CONFIG_ENCRYPTION_KEY` and directs National Admin to secure Hostinger Environment Variables without exposing the secret in PSP.
- Stable encryption key requirement is at least 32 characters.
- Finance provides **Re-check activation readiness**.
- Enable Online Payment remains clickable for blocker visibility while fail-closed.
- Exact saved Chapter draft remains required before activation.
- Activation still requires explicit **Save & Activate Online Payment**.
- Encryption readiness is checked before child-webhook provider creation.

Production marker: `paymentActivationUxVersion=national-admin-v2`.

## PayMongo TEST Acceptance & LIVE Approval — PRODUCTION CAPABILITY PROVEN

National Administration now has an explicit navigation item and page:

**Admin → Live Approval**  
`/admin/finance/live-approval`

Only a national-scoped assignment with `finance.manage` may approve or revoke LIVE processing.

Before approval is accepted, National Admin must explicitly confirm all three real TEST acceptance items:

1. TEST dues payment and expected Chapter/platform split amounts verified;
2. TEST contribution/other payment and expected split amounts verified;
3. TEST child webhook, payment status, PSP receipt and reconciliation verified.

Approval/revocation is append-only AuditLog evidence with actor, timestamp, checklist/notes or revocation reason. The latest event determines the current PSP governance state.

### Dual-control LIVE safety

LIVE provider actions require both:

1. current National Admin TEST Acceptance & LIVE Approval in PSP; and
2. Hostinger production `PAYMONGO_LIVE_ENABLED=true`.

The PSP approval never changes the Hostinger variable. The Hostinger variable never substitutes for National approval.

Outbound LIVE provider operations centrally enforce the National approval before linked Payment Intent creation, Payment Method creation, Payment Method attachment, or child webhook creation. TEST-mode provider operations are unaffected by this governance gate.

Production marker: `paymongoLiveApprovalVersion=national-signoff-v1`.

## Current Payment Safety State

Production readiness at the dedicated smoke reported:

- database/auth/baseline/custom certificate/public announcement readiness: green;
- SMTP: configured;
- PayMongo platform configuration: configured;
- `payMongoLive`: **disabled**.

Therefore the software defect is closed, but LIVE payment processing is still correctly blocked until controlled acceptance is completed.

Do not fabricate the National signoff. CI proves authorization and fail-closed behavior; it does not prove a real PayMongo TEST transaction happened.

Required controlled sequence:

1. If TEST evidence is not already complete, configure/use PayMongo TEST mode and complete DUES plus CONTRIBUTION/OTHER split-payment tests and child webhook/receipt reconciliation.
2. National Admin opens **Admin → Live Approval** and records approval only after those confirmations are true.
3. After approval, set Hostinger production `PAYMONGO_LIVE_ENABLED=true`.
4. Save and redeploy/restart production so the runtime loads the setting.
5. Return to Finance and re-check readiness.
6. Deliberately activate the Chapter with **Save & Activate Online Payment** only when all blockers are clear.
7. Perform a controlled first LIVE payment and settlement acceptance.

## Separate General Production Smoke Blocker — Hostinger Homepage CDN

The urgent PayMongo production smoke is green. The general Production Smoke #34 remains red for a separate public-homepage hosting/cache issue.

Exact failure evidence from the final deployment:

- exact r14 release check passed;
- datastore/auth readiness passed;
- normal `/` returned HTTP 200 but Hostinger/Next served an old cached object;
- `x-nextjs-cache: HIT`;
- `x-nextjs-prerender: 1`;
- `cache-control: s-maxage=31536000`;
- `x-hcdn-cache-status: HIT`;
- cached object age was approximately 205,000 seconds;
- smoke failed `public-home-no-store-cache-control` before later public/PWA checks.

The available Hostinger connector cannot purge CDN/cache or edit production environment variables. This hosting-side cache must be purged/corrected in hPanel and the unchanged general Production Smoke rerun. Do not weaken the no-store/public-feed assertion.

## Controlled / External Pending

- real PayMongo TEST DUES split-payment evidence if not already completed;
- real PayMongo TEST CONTRIBUTION/OTHER split-payment evidence if not already completed;
- real child webhook/signature, payment-status and receipt/reconciliation evidence;
- National Admin TEST Acceptance & LIVE Approval after evidence exists;
- Hostinger `PAYMONGO_LIVE_ENABLED=true` after National approval, followed by redeploy;
- controlled first LIVE payment and split-settlement acceptance;
- Hostinger public-homepage CDN/cache purge and full general Production Smoke closure;
- actual recipient certificate-email receipt/rendering in a real inbox;
- physical Android/iOS installed-PWA acceptance;
- real passkey-device acceptance;
- second-device Digital ID / Certificate QR acceptance where required;
- database backup/restore drill.

Payment architecture: `PAYMENTS.md`  
Deployment runbook: `DEPLOYMENT.md`  
Detailed tracker: `PSP_PLATFORM_HARDENING_2026-09-06.md`  
UI/UX: `UI_UX.md`
