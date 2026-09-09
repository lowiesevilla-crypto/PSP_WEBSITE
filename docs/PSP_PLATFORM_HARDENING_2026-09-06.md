# PSP Website — Platform Hardening, Finance & Release Program

**Program started:** 2026-09-06 PHT  
**Status updated:** 2026-09-07 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Production:** `https://psp.hoahub.tech`  
**Current release candidate:** PR #48  
**Target release:** `2026-09-09-r17 / 2026-09-09-finance-bills-public-feed-v1`

> `COMPLETE (AUTOMATED)` means implementation plus deterministic CI/runtime evidence exists. `PRODUCTION-PROVEN` requires exact live release identity/capability evidence. Real provider/device/inbox/backup acceptance remains external until directly observed.

## Requirement Matrix

| ID | Priority | Requirement | Evidence status |
| --- | --- | --- | --- |
| PSP-HARD-001 | P0 | Safe per-Chapter PayMongo Draft→Activate configuration | **COMPLETE (AUTOMATED)** |
| PSP-HARD-002 | P0 | Real PayMongo linked-account split settlement | **PENDING REAL PAYMONGO TEST ACCEPTANCE** |
| PSP-HARD-003 | P0 | Finance Chapter isolation + National authorized visibility | **COMPLETE (AUTOMATED)** |
| PSP-HARD-004 | P0 | National/Chapter Admin scoped member editing | **COMPLETE (AUTOMATED)** |
| PSP-HARD-005 | P0 | Privacy-safe public Chapter/National content | **COMPLETE (AUTOMATED)** |
| PSP-HARD-006 | P1 | Custom/bulk certificates + verification | **COMPLETE (AUTOMATED)** |
| PSP-HARD-007 | P1 | Responsive searchable/paginated Admin registers | **COMPLETE (AUTOMATED)** |
| PSP-HARD-008 | P1 | Payment-first Member dashboard/PWA UX | **COMPLETE (AUTOMATED)**; physical device external |
| PSP-HARD-009 | P1 | Chapter linked-payment configuration workflow | **COMPLETE (AUTOMATED)**; real provider activation external |
| PSP-HARD-010 | P1 | PWA/mobile regression | **COMPLETE (AUTOMATED)**; physical Android/iOS external |
| PSP-HARD-011 | P1 | Authoritative documentation reconciliation | **UPDATED FOR r15 CANDIDATE** |
| PSP-HARD-012 | P0 Release | Exact production identity + smoke | **r15 PENDING FINAL MERGE/DEPLOYMENT** |
| PSP-HARD-013 | P0 Security | High/critical dependency gates | **PERMANENT REQUIRED GATE** |
| PSP-HARD-014 | P0 Finance | Chapter Admin can create own-Chapter dues | **COMPLETE (AUTOMATED)** |
| PSP-HARD-015 | P0 Finance | National Admin can post National Dues across active Chapters | **COMPLETE (AUTOMATED)** |
| PSP-HARD-016 | P0 Finance | Member sees exact Chapter/National Amount to Pay | **COMPLETE (AUTOMATED)** |
| PSP-HARD-017 | P0 Finance | Concurrent duplicate billing cannot double-charge members | **IMPLEMENTED; FINAL CONCURRENCY CI REQUIRED** |
| PSP-HARD-018 | P0 Payment | Deterministic PSP split-payment checkout/webhook/ledger/receipt E2E | **COMPLETE (AUTOMATED TEST DOUBLE)** |
| PSP-HARD-019 | P0 Security | Production PayMongo endpoint cannot be overridden to arbitrary origin | **IMPLEMENTED; FINAL CI REQUIRED** |

## r15 Dues Billing Contract

### Chapter scope

- Finance exposes a dedicated **Create Dues / Bill** workflow.
- Chapter Admin requires exact `finance.manage` authority for the selected Chapter.
- Chapter Admin cannot use National billing; National escalation returns HTTP 403.
- Chapter dues charge only active members of the authorized Chapter.
- Foreign-Chapter members remain untouched.

### National scope

- National Dues require national-scoped `finance.manage`.
- National scope requires `NATIONAL_DUES` plus an explicit amount.
- Posting fans out into Chapter-specific assessments for active Chapters while preserving Chapter/member isolation.
- Multi-Chapter/National administrators must deliberately select a Chapter for Chapter-scoped dues, rates or other assessments; the UI does not silently choose the first Chapter.

### Billing reliability / idempotency

- Equivalent duplicate detection executes inside the posting transaction.
- The transaction uses `SERIALIZABLE` isolation.
- Existing equivalent assessments return HTTP 409.
- Concurrent transaction conflicts are rolled back and return HTTP 409 instead of committing duplicate assessments/ledger charges.
- The final CI candidate must directly exercise overlapping equivalent National billing requests and prove only one set of assessments/charges commits.

### Finance UX correctness

- form element is retained before async work so success reset/refresh is safe;
- shared busy state clears in `finally` on success or network failure;
- network rejection surfaces an Admin-visible retry message;
- Philippine civil dates are interpreted in `Asia/Manila` / UTC+08:00 before UTC persistence;
- Member payment page exposes exact outstanding **Amount to Pay**.

## r15 Split-Payment Contract

Canonical invariant:

`gross = Chapter amount + PSP platform fee`

PSP behavior:

- `Payment.amount` = Chapter amount only;
- PayMongo Payment Intent amount = gross;
- fixed split recipient = PSP parent/platform account for configured fee;
- `transfer_to` = Chapter linked child account;
- immutable split metadata records Chapter amount/fee/gross/member/Chapter/category/reference;
- browser redirect/polling is non-authoritative;
- signed child webhook is authoritative for `PAID`;
- paid ledger `PAYMENT` posts Chapter amount only;
- platform fee is excluded from Chapter income/ledger totals;
- one confirmed receipt is generated per Payment.

Production PayMongo API is pinned to `https://api.paymongo.com/v1`. `PAYMONGO_API_BASE_URL` is honored only under `APP_ENV=test` and only for loopback hosts, preventing production provider credentials from being redirected to an arbitrary origin.

## Automated Billing / Payment Evidence

Exact candidate `2b577b58877f0bcbaf72a3d34e52032dd847e506` passed PSP CI #664 / run `34121839949` and its authenticated runtime E2E reported:

- Chapter Admin billing: PASS
- National Admin billing: PASS
- Member Amount-to-Pay visibility: PASS
- Chapter entitlement: PHP 100.00
- PSP platform fee: PHP 5.00
- gross Payment Intent: PHP 105.00
- Chapter linked account used as `Account-Id` and `transfer_to`
- PSP platform account used as fixed fee recipient
- signed TEST `payment.paid` webhook: PASS
- Chapter/member ledger payment: PHP 100.00 only
- receipt generation: PASS

Subsequent exact heads #665 and #667 were also green before PR review found additional release-governance, concurrency, date, form-state, Chapter-selection, endpoint-hardening and documentation issues. Those issues moved the branch and therefore invalidate older passing SHAs for merge authorization.

Detailed evidence: `BILLING_DUES_SPLIT_E2E_2026-09-07.md`.

## Release Identity / Production Proof

r15 exact identity:

```text
release = 2026-09-09-r17
deploymentGeneration = 2026-09-09-finance-bills-public-feed-v1
billingDuesVersion = chapter-national-v1
splitPaymentContractVersion = linked-split-e2e-v1
paymentAssignmentVersion = chapter-selected-member-v1
publicFeedVersion = global-chapter-feed-v2
```

After final PR #48 exact-head CI passes and all review threads are truly fixed/resolved:

1. merge PR #48 using the exact passing head SHA;
2. verify `main` points to the resulting merge SHA;
3. require post-merge PSP CI on that exact `main` SHA;
4. require dedicated PayMongo/billing production smoke to observe r15 identity, billing/split markers, prior Finance/activation/LIVE-approval/certificate markers and readiness green;
5. run/inspect the general Production Smoke without weakening the public-homepage no-store assertion.

Earlier Hostinger evidence showed a separate homepage CDN/cache issue (`x-nextjs-cache: HIT`, long `s-maxage`, Hostinger CDN HIT). If that recurs after r15 health identity is live, classify it as the separate hosting/cache gate and do not weaken the smoke.

## Prior Hardening Baseline Retained

r15 includes the prior delivered hardening baseline:

- safe Chapter payment Draft before parent readiness;
- Draft/READY/ENABLED/BLOCKED state handling;
- encrypted child webhook signing secret and non-secret linked Account ID;
- audited National Admin TEST Acceptance & LIVE Approval plus independent Hostinger kill-switch;
- complete-history Finance aggregates and paginated/searchable registers;
- scoped Admin member editing;
- privacy-safe public announcements/events;
- custom/bulk certificates, Chapter branding, QR verification and soft revocation;
- responsive Admin Table Standard;
- payment-first Member dashboard;
- additive production schema upgrades without `--accept-data-loss`;
- secret/origin/isolation/dependency/runtime security gates.

## Dependency / Build Security

Permanent CI requires:

- secret-pattern scan;
- security-header configuration checks;
- complete `npm audit --audit-level=high`;
- Prisma validate/generate/schema application;
- production additive-upgrade regression;
- deterministic isolation/hardening fixtures;
- lint and strict TypeScript;
- production build;
- runtime/security/isolation/payment E2E;
- post-prune runtime dependency audit that fails closed on missing/malformed/timed-out evidence.

The reviewed dependency override remains `deepmerge-ts 8.0.1`; force-downgrade via `npm audit fix --force` is not used.

## Controlled / External Pending

Automated PSP correctness is not equivalent to real PayMongo acceptance. Still pending:

- final PR #48 concurrency-inclusive exact-head CI;
- exact-head merge and post-merge `main` CI;
- exact r15 dedicated billing capability smoke;
- general Production Smoke / Hostinger homepage cache closure;
- real PayMongo TEST DUES payment and observed Chapter/platform settlement;
- real PayMongo TEST CONTRIBUTION/OTHER payment and observed split;
- real child webhook delivery/signature/payment-status/receipt reconciliation;
- audited National Admin TEST Acceptance & LIVE Approval only after real TEST evidence;
- Hostinger `PAYMONGO_LIVE_ENABLED=true` only after National approval and redeploy;
- controlled first LIVE payment and settlement;
- real recipient email acceptance;
- physical Android/iOS PWA acceptance;
- real passkey device acceptance;
- second-device Digital Member ID/Certificate QR acceptance;
- database backup/restore drill.

`PAYMONGO_LIVE_ENABLED` remains false until the controlled real PayMongo TEST sequence is complete.
