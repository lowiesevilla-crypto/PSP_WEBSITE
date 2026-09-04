# PSP Payments & PayMongo Platforms Integration

## Authoritative Model

PSP owns the member ledger and payment classification. PayMongo is the payment/settlement gateway, not the accounting system of record.

The member-mobile P0 release uses **PayMongo Platforms / Linked Accounts**:

- PSP PayMongo account = parent/platform account;
- each PSP chapter = linked child PayMongo account;
- PSP authenticates server-side with the parent platform secret key;
- requests on behalf of a chapter include that chapter's linked `Account-Id` (`org_*`);
- every online payment includes a separately disclosed **platform convenience fee**;
- PayMongo `split_payment` sends the configured platform fee to the PSP parent/platform account;
- the remainder is transferred/settled to the chapter linked account;
- only the chapter amount affects dues, contribution totals, member ledger, and chapter collections.

No chapter API secret key is stored by PSP in linked-account mode.

## Platform Convenience Fee

The exact business fee is an operations configuration, not hard-coded source code.

Environment controls:

- `PLATFORM_CONVENIENCE_FEE_BPS` — percentage in integer basis points; `300` means `3.00%`;
- `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS` — optional fixed PHP centavo amount;
- either or both may be used.

Payments fail closed when both values are missing/zero. Never invent or silently default a fee.

For every payment:

`gross total = chapter amount + platform convenience fee`

The fee preview must be shown before the member confirms payment.

The persisted split evidence records:

- chapter amount and centavos;
- platform fee and centavos;
- total charged and centavos;
- payment method;
- child chapter Account ID;
- parent platform Account ID;
- PayMongo Payment Intent ID;
- member/chapter/category/internal reference.

This snapshot is immutable financial evidence. Later fee-config changes must not rewrite historical transactions.

## Supported Member Payment Types

- `DUES`
- `CONTRIBUTION`
- `OTHER`

Dues must reference an active payable dues assessment. Contributions may reference a contribution assessment or be a member-entered chapter contribution with purpose. Other payments require an amount and purpose.

The platform fee is not part of any of these chapter categories.

## Supported Payment Methods

Current linked-account member flow supports:

- QR Ph (`qrph`)
- GCash (`gcash`)
- Maya (`paymaya`)

Card payment is intentionally not implemented in the server-created linked-account Payment Method flow because sensitive card data must not be collected/handled by the PSP backend. Add cards only through a reviewed client-side PayMongo public-key/tokenization flow.

## Required Split-Payment Flow

1. Authenticated active member selects Dues/Contribution/Other and a chapter amount.
2. Server verifies member ownership, chapter scope, assessment/category/amount rules.
3. PSP resolves the chapter linked child Account ID and enabled payment methods.
4. PSP resolves the platform parent secret/account ID and configured convenience fee.
5. PSP shows a fee preview: chapter amount, platform fee, total to pay.
6. Member explicitly confirms the total.
7. PSP creates an internal `Payment` with `Payment.amount = chapter amount` only.
8. PSP creates a PayMongo Payment Intent on behalf of the child using parent authentication plus `Account-Id`.
9. Payment Intent amount is the gross total.
10. `split_payment.recipients` assigns the fixed platform-fee centavos to the PSP parent merchant/account.
11. `split_payment.transfer_to` identifies the chapter child account for the remainder.
12. PSP creates the selected Payment Method and attaches it to the Payment Intent.
13. QR Ph renders the PayMongo QR image in the PWA and polls internal payment status; GCash/Maya redirects to the provider authorization flow.
14. Browser redirect/polling is UX only and never authoritatively marks a payment PAID.
15. PayMongo sends `payment.paid` or `payment.failed` to the child-account webhook.
16. PSP verifies the raw webhook body signature before parsing/mutation.
17. PSP enforces unique event idempotency and matches `payment_intent_id` to the internal Payment within the same chapter.
18. PSP verifies webhook amount against the persisted gross total.
19. On paid: PSP marks Payment PAID, creates one chapter ledger PAYMENT entry for chapter amount only, creates one receipt, and audits split settlement.
20. On failed: PSP marks the payment failed without posting chapter ledger/receipt.
21. Repeated webhook delivery returns success without duplicate financial posting.

## Linked Chapter Configuration

Chapter configuration stores:

- linked child account ID (`org_*`) encrypted at rest;
- child webhook signing secret encrypted at rest;
- TEST/LIVE mode;
- enabled payment methods;
- enable/disable state.

For production-schema compatibility, the internal Prisma field currently named `secretKeyCiphertext` stores the encrypted linked `org_*` child account ID. It **does not contain a chapter API secret key** in the linked-account architecture. This legacy field name must not be interpreted as a business/security model.

Chapter Admin and Chapter Treasurer/Finance can manage finance configuration only for authorized chapter scope. Cross-chapter configuration/payment/webhook use is rejected server-side.

## Child Webhook

Canonical pattern:

`https://psp.hoahub.tech/api/webhooks/paymongo/[CHAPTER_CODE]`

PSP can create the child webhook using parent platform authentication plus the child `Account-Id`. The returned webhook signing secret is immediately encrypted and never returned to the browser.

Linked-account payment events are reconciled on the chapter-specific webhook. Signature checks use that child's signing secret and TEST/LIVE signature selection.

## Idempotency and Reconciliation

Outbound Payment Intent creation uses the stable internal payment reference as an idempotency key.

Inbound webhook processing persists unique PayMongo event IDs. Replays must never:

- create another Payment;
- create another chapter ledger entry;
- issue another receipt;
- increment chapter collections/contributions again;
- recognize the platform fee twice.

Multiple-record posting uses a database transaction.

## Amount Semantics

Three amounts must remain distinct:

- **Chapter amount** — member obligation/contribution/other chapter payment; stored in `Payment.amount`; posted to chapter ledger.
- **Platform convenience fee** — PSP platform revenue/fee; stored in immutable split audit metadata; never posted to chapter ledger.
- **Total paid** — gross amount charged by PayMongo; chapter amount + platform fee.

PayMongo API amounts are integer centavos. Conversion must be exact; negative values and unsupported fractions are rejected.

## Receipts

Every confirmed PSP digital receipt displays:

- unique receipt number;
- payment type and purpose;
- member + membership number;
- chapter;
- payment method;
- chapter amount;
- platform convenience fee;
- total paid;
- internal PSP reference;
- PayMongo Payment Intent reference;
- confirmation/issue timestamps;
- official PSP branding.

The receipt explicitly states that the platform fee is not chapter dues/contribution/other chapter income.

## Effective-Dated Dues

Each chapter can define its own dues amount by effective period. Once an assessment/charge is posted, its amount is historical and is not rewritten by later rate changes.

## Payment States

Supported internal states:

- `PENDING`
- `PROCESSING`
- `PAID`
- `FAILED`
- `CANCELLED`
- `REFUNDED`
- `PARTIALLY_REFUNDED`

A browser return never sets `PAID`.

## Server-Side Environment

Required for linked-account split payments:

- `PAYMONGO_PLATFORM_SECRET_KEY`
- `PAYMONGO_PLATFORM_ACCOUNT_ID`
- `PAYMENT_CONFIG_ENCRYPTION_KEY` — stable random value, minimum 32 characters
- `PLATFORM_CONVENIENCE_FEE_BPS` and/or `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`
- `PAYMONGO_LIVE_ENABLED=false` until approved
- `NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech`

Legacy `PAYMONGO_SECRET_KEY` / `PAYMONGO_WEBHOOK_SECRET` may remain temporarily only for pre-linked-account transaction transition. New member payments must use linked-account split processing.

Never expose platform secret keys, webhook secrets, or encryption keys in browser/PWA code, manifests, service workers, GitHub, logs, screenshots, URLs, or documentation.

## Test-to-Live Gate

Live remains fail-closed until all of the following are evidenced in TEST mode:

1. PayMongo Platforms/Linked Accounts capability is enabled for the PSP account.
2. Parent platform account and at least one chapter child account are linked and active.
3. Platform fee configuration is deliberately set.
4. Chapter linked account can create a Payment Intent using parent auth + child Account-Id.
5. DUES test payment succeeds.
6. CONTRIBUTION test payment succeeds.
7. OTHER test payment succeeds.
8. Fee preview equals the amount encoded in the split Payment Intent.
9. PayMongo gross charge equals chapter amount + platform fee.
10. Platform account receives the configured fee and chapter child account receives the remainder.
11. Valid signed child webhook posts exactly once.
12. Invalid signature is rejected.
13. Duplicate webhook is idempotent.
14. Cross-chapter webhook/reference is rejected.
15. Member chapter ledger posts chapter amount only.
16. Contribution total excludes platform fee.
17. Receipt displays chapter amount, fee, and total correctly.
18. Member and admin reconciliation totals agree.

Only after TEST signoff and explicit product-owner approval may `PAYMONGO_LIVE_ENABLED=true` be configured for a controlled low-value live validation.
