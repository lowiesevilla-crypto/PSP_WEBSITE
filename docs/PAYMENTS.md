# PSP Payments & PayMongo Platforms Integration

## Authoritative Accounting Model

PSP owns the member ledger and payment classification. PayMongo is the payment/settlement gateway, not the accounting system of record.

Canonical online-payment model:

- PSP PayMongo account = parent/platform account;
- each PSP Chapter = linked child PayMongo `org_*` account;
- PSP authenticates server-side with the parent secret;
- child operations use parent authentication plus child `Account-Id`;
- PSP does not store a Chapter API secret key in linked-account mode;
- Chapter Account ID and real child webhook signing secret are encrypted at rest;
- one linked child account may belong to only one PSP Chapter.

## Chapter Payment Configuration States

Chapter payment setup is intentionally separated from activation.

1. **NOT_CONFIGURED** — no linked child Account ID saved.
2. **DRAFT** — linked child account and selected methods are saved; Online Payment is disabled; PSP parent platform and/or child webhook may still be incomplete.
3. **READY** — parent platform, convenience fee, mode, linked account, and webhook prerequisites are valid.
4. **ENABLED** — Online Payment is active for the Chapter in the allowed mode.
5. **BLOCKED** — saved/enabled configuration fails current validation and must fail closed until remediated.

### Draft-save contract

A Chapter Admin/National Admin with exact finance authority must be able to save a **disabled Draft even while the PSP parent PayMongo platform is not configured**.

Draft save:

- validates Chapter authority and `org_*` format;
- persists linked child Account ID encrypted;
- persists selected payment methods and mode;
- keeps `isEnabled=false`;
- does not call PayMongo;
- does not create a child webhook;
- may store an internal encrypted pending-webhook marker only to retain additive production-schema compatibility;
- must never report that marker as a real webhook signing secret;
- must never make the Chapter payable.

Runtime member payment configuration rejects staged/pending webhook state.

### Activation contract

Enabling Online Payment requires all of the following before `isEnabled=true` is persisted:

- PSP parent platform secret/account configuration is valid;
- platform convenience fee is explicitly configured;
- Chapter mode matches parent TEST/LIVE mode;
- linked child `org_*` account is valid and unique to that Chapter;
- selected method list is valid;
- real child webhook signing secret exists, creating the child webhook when required;
- LIVE is explicitly allowed by the global live gate.

If activation fails, the previously saved Draft remains disabled. A failed activation must not leave `isEnabled=true`.

## Platform Convenience Fee

Approved environment controls:

- `PLATFORM_CONVENIENCE_FEE_BPS` — integer basis points;
- `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS` — optional fixed PHP centavos.

Either or both may be used. Never invent/silently default a business fee.

For every payment:

`gross total = Chapter amount + platform convenience fee`

Member sees Chapter amount, fee, and gross total before confirmation.

Historical split evidence snapshots Chapter amount/centavos, platform fee/centavos, gross amount/centavos, method, child account, platform account, Payment Intent, Chapter/member/category/internal reference. Later configuration changes never rewrite historical evidence.

## Supported Categories & Methods

Categories:

- `DUES`
- `CONTRIBUTION`
- `OTHER`

Methods:

- QR Ph (`qrph`)
- GCash (`gcash`)
- Maya (`paymaya`)

Card payment is intentionally not implemented in the server-created linked-account Payment Method flow because PSP backend must not collect raw sensitive card data. A future card flow requires reviewed client-side PayMongo public-key/tokenization design.

## Required Split-Payment Flow

1. Authenticated active member selects a payable type/amount.
2. Server derives/validates the member Chapter, assessment/category/amount, and ownership.
3. Server resolves enabled Chapter linked-account configuration and allowed method.
4. Server resolves parent platform configuration and fee.
5. Member receives fee preview showing Chapter amount, platform fee, gross total.
6. Member explicitly confirms.
7. PSP creates internal `Payment` with `Payment.amount = Chapter amount` only.
8. PSP creates PayMongo Payment Intent using parent authentication + Chapter child `Account-Id`.
9. Payment Intent amount is gross total.
10. Split-payment recipient sends configured PSP platform fee to parent; remainder is transferred/settled to Chapter child.
11. PSP creates/attaches selected Payment Method.
12. QR Ph renders provider QR and polls internal PSP status; GCash/Maya follow provider authorization/redirect flow.
13. Browser redirect/polling is never authoritative for `PAID`.
14. Child webhook sends payment state.
15. PSP verifies raw webhook signature before parsing/mutation.
16. PSP enforces unique event idempotency and same-Chapter Payment Intent matching.
17. PSP verifies gateway amount against persisted gross total.
18. On paid: mark Payment PAID, post one Chapter ledger PAYMENT for Chapter amount only, create one receipt, audit split settlement.
19. On failed: mark failed without Chapter ledger payment/receipt.
20. Duplicate webhook succeeds idempotently without duplicate posting.

## Amount Semantics

- **Chapter amount** — obligation/contribution/other Chapter payment; stored in `Payment.amount`; posted to Chapter ledger.
- **Platform convenience fee** — PSP platform fee; stored in immutable split metadata; never posted to Chapter ledger.
- **Total paid** — gross PayMongo amount = Chapter amount + fee.

PayMongo amounts are integer centavos. Negative/invalid fractional amounts are rejected.

## Finance Reporting Rules

- Summary totals must use the complete authorized dataset or authoritative aggregates; never calculate organization totals from a silently capped recent subset.
- Effective-dated Chapter rates preserve history.
- Posted assessment amount is historical and is not rewritten by later rate changes.
- Corrections use adjustments/reversals/refunds.
- Member balances come from the PSP ledger.
- National reporting may span authorized Chapters; Chapter Admin remains exact-Chapter scoped.
- Search/pagination affects register presentation only and must not change aggregate truth.

## Receipts

Every confirmed receipt distinguishes:

- payment type/purpose;
- member/membership number;
- Chapter;
- payment method;
- Chapter amount;
- platform convenience fee;
- total paid;
- PSP reference;
- PayMongo reference;
- confirmation/issue timestamps;
- official PSP branding.

The receipt must not imply that PSP platform fee is Chapter dues/contribution income.

## Webhook / Idempotency

Canonical child webhook:

`https://psp.hoahub.tech/api/webhooks/paymongo/[CHAPTER_CODE]`

- signing secret is encrypted and never returned to browser;
- TEST/LIVE signature selection follows Chapter mode;
- outbound Payment Intent uses stable internal reference/idempotency key;
- inbound PayMongo event IDs are unique;
- replay never duplicates Payment, ledger entry, receipt, collection/contribution totals, or platform-fee recognition;
- multi-record posting uses a database transaction.

## Server Environment

Required for activated linked-account split payment:

- `PAYMONGO_PLATFORM_SECRET_KEY`
- `PAYMONGO_PLATFORM_ACCOUNT_ID`
- `PAYMENT_CONFIG_ENCRYPTION_KEY` — stable server-only value, minimum 32 characters
- `PLATFORM_CONVENIENCE_FEE_BPS` and/or `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`
- `PAYMONGO_LIVE_ENABLED=false` until controlled TEST signoff
- `NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech`

Never expose platform secret, child webhook secret, or encryption key in browser/PWA code, manifests, service workers, GitHub, logs, screenshots, URLs, or documentation.

## Automated r14 Evidence

PR #34 runtime CI proves without contacting the real PayMongo provider:

- foreign Chapter payment configuration is rejected;
- own Chapter disabled Draft saves while parent platform is intentionally unavailable;
- Draft returns linked Account ID but reports no real webhook secret;
- Draft state remains `DRAFT` and `isEnabled=false`;
- attempted activation without parent platform fails with 409;
- failed activation does not change persisted `isEnabled=false`;
- payment/runtime source contracts reject pending webhook state;
- Finance summary/register hardening compiles/builds with cross-Chapter isolation suite green.

These automated tests prove PSP application behavior, not actual external PayMongo settlement.

## Controlled TEST-to-LIVE Gate

LIVE remains fail-closed until real PayMongo TEST evidence proves:

1. Platforms/Linked Accounts is enabled for PSP.
2. PSP parent and at least one Chapter child are active/linked.
3. Deliberate convenience fee is configured.
4. Child Payment Intent works using parent auth + Account-Id.
5. DUES succeeds.
6. CONTRIBUTION succeeds.
7. OTHER succeeds.
8. Fee preview equals encoded split amounts.
9. Gross charge equals Chapter amount + fee.
10. Parent receives configured fee; Chapter child receives remainder.
11. Valid signed child webhook posts exactly once.
12. Invalid signature is rejected.
13. Duplicate webhook is idempotent.
14. Cross-Chapter webhook/reference is rejected.
15. Chapter ledger posts Chapter amount only.
16. Contribution/collection totals exclude platform fee.
17. Receipt shows Chapter amount, fee, and gross total correctly.
18. Member/Admin reconciliation totals agree.

Only after TEST signoff and explicit product-owner approval may `PAYMONGO_LIVE_ENABLED=true` be used for a controlled low-value LIVE validation.
