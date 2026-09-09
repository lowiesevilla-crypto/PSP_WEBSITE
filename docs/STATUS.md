# PSP Digital Platform — Authoritative Delivery Status

**Status timestamp:** 2026-09-09 PHT
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production URL:** `https://psp.hoahub.tech`  
**Production branch:** `main`  
**Current release target:** `2026-09-09-r17 / 2026-09-09-finance-bills-public-feed-v1`

> Read with `../AGENTS.md`. Never claim provider-, credential-, device-, inbox-, payment-, backup-, approval-, or production-state behavior without direct evidence.

## Executive Status

PR #48, **Chapter/National dues billing and split-payment E2E**, has merged into `main` at `b1ad693f107ff6695c7522f4902a8f940e7026af`; PSP CI #690 succeeded for that main head.

The current r16 patch extends the payment workflow to match the product requirement more directly: Finance Admin can assign dues/contribution/required-payment assessments to one Chapter, selected Chapters, selected active members, or all active Chapters; members see payable items and pay online through the configured Chapter PayMongo linked account; receipts remain webhook-generated and visible to members/admins.

PR #49 CI first failed at the fail-closed high-severity dependency audit because `nodemailer <=9.1.0` is now covered by high advisories. The r16 branch updates the direct `nodemailer` dependency to `9.1.1`; this must pass the unchanged audit gate before merge.

The release identity has been advanced to:

- release: `2026-09-09-r17`
- deployment generation: `2026-09-09-finance-bills-public-feed-v1`
- billing marker: `billingDuesVersion=chapter-national-v1`
- split marker: `splitPaymentContractVersion=linked-split-e2e-v1`
- payment assignment marker: `paymentAssignmentVersion=chapter-selected-member-v1`
- public feed marker: `publicFeedVersion=global-chapter-feed-v2`

Production cannot be called r16-proven until the exact PR head passes all required gates, merges by exact SHA, post-merge `main` CI passes, and the dedicated production smokes observe the r16 identity/markers with readiness green. The latest production-smoke reruns for r15 failed because `https://psp.hoahub.tech/api/health` still returned `2026-09-06-r14 / 2026-09-06-platform-hardening-v1`.

## r16 Billing Contract

### Chapter Admin

- `finance.manage` is required for the exact target Chapter.
- Chapter Admin can create Chapter dues only for an authorized Chapter.
- Chapter Admin can assign contribution/required-payment assessments to all active members in their Chapter or selected active members inside that same Chapter.
- Chapter Admin cannot escalate to `billingScope=NATIONAL`; server returns HTTP 403.
- Chapter posting creates ledger `CHARGE` entries only for active members of that Chapter.
- Foreign-Chapter members are not charged.

### National/System Admin

- National dues require national-scoped `finance.manage`.
- National/System Admin can assign dues, contribution, or required-payment assessments to one Chapter, selected Chapters, selected active members, or all active Chapters.
- National/all-Chapter scope fans out into Chapter-specific assessments for active Chapters inside one controlled transaction.
- National/multi-Chapter users must deliberately select a Chapter for Chapter-scoped dues, rates, and other assessments; the UI does not silently select the first available Chapter.

### Billing Safety

- Equivalent duplicate assessment detection executes inside a `SERIALIZABLE` transaction.
- A concurrent conflicting billing transaction is rolled back and returns HTTP 409 rather than committing duplicate charges.
- Finance form busy state clears in `finally` even on network failure.
- The submitted form element is retained before asynchronous work so success reset/refresh cannot fail after the request commits.
- Finance civil dates are converted from `Asia/Manila` / UTC+08:00 before UTC persistence, independent of browser timezone.

### Member Visibility

The authenticated member payment page displays the exact outstanding **Amount to Pay** for assigned Chapter/National dues and continues to derive payment state from the PSP ledger/payment records.

## Split-Payment Contract

Canonical accounting remains:

`gross paid = Chapter amount + PSP platform convenience fee`

- `Payment.amount` stores Chapter entitlement only.
- PayMongo Payment Intent amount is gross.
- fixed split recipient receives configured PSP platform fee.
- `transfer_to` is the Chapter linked `org_*` account.
- split metadata snapshots Chapter amount, platform fee, gross, member, Chapter, category and internal reference.
- signed child webhook is authoritative for `PAID`.
- paid ledger entry credits Chapter amount only.
- platform fee is never posted as Chapter dues/contribution income.
- one receipt is generated per confirmed Payment.

Production PayMongo calls are pinned to `https://api.paymongo.com/v1`. `PAYMONGO_API_BASE_URL` can override the endpoint only for a loopback provider test double when `APP_ENV=test`; production cannot send platform credentials to an arbitrary configured origin.

## Automated Evidence Already Obtained

A prior exact application candidate `2b577b58877f0bcbaf72a3d34e52032dd847e506` passed PSP CI #664 / run `34121839949`. Its required authenticated runtime E2E reported:

- Chapter Admin billing: PASS
- National Admin billing: PASS
- member Amount-to-Pay visibility: PASS
- Chapter amount: PHP 100.00
- PSP platform fee: PHP 5.00
- gross Payment Intent: PHP 105.00
- `transfer_to`: Chapter linked test account
- fixed split recipient: PSP platform test account
- signed `payment.paid` webhook: PASS
- Chapter ledger payment: PHP 100.00 only
- receipt creation: PASS

A later marker-only exact head also passed PSP CI #665, and the documentation/smoke-bearing head passed PSP CI #667 before review identified additional release-governance, concurrency, form reliability, timezone, explicit-Chapter-selection, provider-endpoint and documentation findings. Those findings are being fixed on newer heads; no earlier green head authorizes merge after the branch moves.

Detailed deterministic evidence is in `BILLING_DUES_SPLIT_E2E_2026-09-07.md`.

## Prior r14 Baseline Retained

The r15 hotfix builds on the already-delivered r14 baseline:

- PayMongo Chapter Draft→Activate and fail-closed readiness;
- National Admin TEST Acceptance & LIVE Approval workflow with separate Hostinger kill-switch;
- scoped Admin member editing;
- Finance complete-history totals and searchable/paginated registers;
- responsive Admin Table Standard;
- payment-first Member Dashboard;
- privacy-safe public Chapter/National feed;
- custom/bulk certificates with Chapter branding and QR verification;
- additive production schema/readiness controls;
- security/origin/isolation/dependency-audit gates.

## Current Payment Safety State

The deterministic E2E proves PSP application behavior against a local PayMongo-compatible test double. It **does not** prove real PayMongo TEST settlement or provider delivery.

`PAYMONGO_LIVE_ENABLED` must remain false until all real TEST acceptance evidence exists and National Admin records the audited LIVE approval. The Hostinger LIVE variable remains an independent control and must not substitute for PSP approval.

## Separate General Production Smoke Concern

Earlier general production smoke evidence showed a Hostinger homepage CDN/cache problem where `/` could be served as a stale cached object. The r16 general Production Smoke retains the no-store/public-feed assertions and now requires `global-chapter-feed-v2`; those assertions must not be weakened merely to make a release pass.

The dedicated PayMongo/billing capability smoke is separate and requires exact r15 health identity, the Chapter/National billing marker, the split-payment marker, existing Finance/activation/LIVE-approval/certificate markers and readiness HTTP 200/ready.

## Controlled / External Pending

- r16 PR exact-head CI;
- exact-head merge of r16 PR;
- post-merge `main` CI;
- exact r16 billing/payment/public-feed production smokes;
- general Production Smoke closure, including Hostinger homepage cache behavior;
- real PayMongo TEST DUES split-payment transaction and observed settlement;
- real PayMongo TEST CONTRIBUTION/OTHER split-payment transaction and observed settlement;
- real child webhook delivery/signature/payment-status/receipt reconciliation;
- audited National Admin TEST Acceptance & LIVE Approval only after real TEST evidence;
- Hostinger `PAYMONGO_LIVE_ENABLED=true` only after National approval and controlled redeploy;
- controlled first LIVE payment and settlement acceptance;
- actual recipient certificate-email receipt/rendering;
- physical Android/iOS installed-PWA acceptance;
- real passkey-device acceptance;
- second-device Digital ID / Certificate QR acceptance where required;
- database backup/restore drill.

Payment architecture: `PAYMENTS.md`  
Billing E2E evidence: `BILLING_DUES_SPLIT_E2E_2026-09-07.md`  
Detailed hardening tracker: `PSP_PLATFORM_HARDENING_2026-09-06.md`  
Deployment runbook: `DEPLOYMENT.md`  
UI/UX: `UI_UX.md`
