# PSP Chapter/National Dues Billing & Split-Payment E2E Evidence

**Date:** 2026-09-07 PHT  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Pull request:** #48 — `hotfix: Chapter/National dues billing and split-payment E2E`  
**Production URL:** `https://psp.hoahub.tech`

## Scope

This hotfix closes the Finance UX and authorization gap where Chapter/National dues types existed but the Admin workflow did not make billing scope explicit and National dues were not implemented as a national fan-out billing operation.

The reviewed implementation provides a dedicated **Create Dues / Bill** workflow with explicit `CHAPTER` and `NATIONAL` billing scope.

### Chapter scope

- Chapter Admin with `finance.manage` may create dues only for the Chapter covered by the exact Chapter assignment.
- Chapter Admin cannot escalate to National billing; National-scope attempts return HTTP 403.
- National/System Admin may select an authorized Chapter and create Chapter dues.
- Posting creates member ledger `CHARGE` entries only for active members of the selected Chapter.
- Foreign-Chapter members are not charged.

### National scope

- Only national-scoped Finance authority may post `NATIONAL_DUES` with `billingScope=NATIONAL`.
- National posting fans out the National Dues assessment to all active Chapters in one controlled database transaction.
- Each affected active member receives the correct Chapter ledger charge while preserving Chapter isolation.

### Member visibility

Authenticated members see the exact outstanding **Amount to Pay** on the payment page for Chapter and National dues assigned to them.

## Split-Payment Accounting Contract

For linked PayMongo processing PSP applies the invariant:

`gross total = Chapter amount + PSP platform convenience fee`

The application stores and posts only the Chapter amount to the Chapter/member ledger. The PSP platform fee is recorded in split metadata and is never posted as Chapter dues income.

The PayMongo Payment Intent body is required to use:

- gross amount as the Payment Intent amount;
- PSP platform account as a fixed split recipient for the configured platform fee;
- Chapter linked `org_*` account as `transfer_to`;
- immutable metadata for Chapter amount, platform fee, member, Chapter, category and internal reference.

A signed paid webhook must reconcile the gateway gross amount against persisted split metadata, mark the internal payment paid, post only the Chapter amount to the ledger and generate one receipt. Duplicate/replayed webhook handling remains idempotent.

## Required Automated E2E

PR #48 adds a required authenticated runtime E2E to the PSP CI gate. It boots the production build against CI MySQL, signs in with seeded Chapter Admin, National/System Admin and Member accounts, and uses a local PayMongo-compatible provider test double so PSP behavior is deterministic without contacting the real provider.

The test proves:

1. Chapter Admin can open Finance and sees the dedicated dues workflow.
2. Chapter Admin sees only the authorized Chapter in billing scope.
3. Chapter Admin creates own-Chapter dues successfully.
4. The active member receives the exact Chapter ledger charge.
5. A foreign-Chapter member does not receive that Chapter charge.
6. Chapter Admin National billing escalation is rejected with HTTP 403.
7. National/System Admin can create National dues across active Chapters.
8. Authenticated member sees both Chapter and National due amounts.
9. TEST linked-account configuration is activated through the PSP API against the provider test double.
10. Member checkout builds the exact split Payment Intent request.
11. Signed `payment.paid` webhook reconciles the payment.
12. Chapter/member ledger receives only the Chapter entitlement amount.
13. PSP platform fee is excluded from the Chapter ledger.
14. Receipt generation succeeds.

## Exact Passing Evidence Before Final Documentation Commit

Exact application head `2b577b58877f0bcbaf72a3d34e52032dd847e506` passed PSP CI #664 / run `34121839949`.

Runtime E2E reported:

- `chapterAdminBilling`: PASS
- `nationalAdminBilling`: PASS
- `memberAmountVisibility`: PASS
- Chapter amount: `PHP 100.00`
- PSP platform fee: `PHP 5.00`
- PayMongo gross: `PHP 105.00`
- `transfer_to`: Chapter linked account `org_CIBillingChild`
- fixed split recipient: PSP platform account `org_CIPlatformAccount`
- paid webhook Chapter ledger amount: `PHP 100.00`
- receipt generated: PASS

The exact marker-only head `dd0b728e34bc5a71164bdd8c9a35cd1801a3f215` subsequently passed PSP CI #665. The current final documentation/smoke-bearing head must receive a fresh complete CI before merge; earlier green heads are not sufficient to authorize merge after the branch moves.

## Production Capability Markers

The production `/api/health` response exposes:

- `billingDuesVersion=chapter-national-v1`
- `splitPaymentContractVersion=linked-split-e2e-v1`

The PayMongo production smoke is extended to require both markers together with the existing r14 Finance, activation, LIVE-approval and certificate markers and green readiness. Production capability is not considered proven until that post-merge smoke passes against `https://psp.hoahub.tech`.

## Controlled External Acceptance Still Required

The deterministic provider test double proves PSP application behavior but does **not** count as real PayMongo provider acceptance.

Still required before LIVE approval may truthfully be recorded:

- real PayMongo TEST DUES transaction and observed Chapter/platform split;
- real PayMongo TEST CONTRIBUTION or OTHER transaction and observed split;
- real child webhook delivery/signature/payment-status/receipt reconciliation;
- National Admin TEST Acceptance & LIVE Approval only after those real TEST results exist;
- separate Hostinger `PAYMONGO_LIVE_ENABLED=true` change and redeploy only after National approval;
- controlled first LIVE payment and settlement acceptance.

Do not substitute CI/provider-test-double evidence for real PayMongo TEST acceptance.
