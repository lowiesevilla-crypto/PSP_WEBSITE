# PSP Payments & PayMongo Integration

## Principle

The PSP platform owns the member ledger. PayMongo is the payment gateway, not the accounting system of record.

## Current Integration Target

Use **PayMongo Hosted Checkout v2** for new payment development.

- Create checkout: `POST https://api.paymongo.com/v2/checkout_sessions`
- Production webhook: `https://psp.hoahub.tech/api/webhooks/paymongo`
- Primary success event: `checkout_session.payment.paid`

## Required Flow

1. Authenticated member selects an eligible unpaid or partially paid assessment.
2. Server verifies member ownership, active membership, chapter scope, assessment eligibility, and amount.
3. Server creates an internal `Payment` in `PENDING` state with a unique internal reference.
4. Server calls PayMongo Hosted Checkout v2 using the server-only secret key.
5. Send an `Idempotency-Key` on the PayMongo resource-creation request.
6. Use the internal PSP reference as PayMongo `reference_number` and metadata where supported.
7. PayMongo returns the checkout URL/session ID.
8. Store the gateway/session reference on the internal Payment.
9. Redirect the member to PayMongo hosted checkout.
10. Browser success/cancel redirects are UX only and never authoritatively set `PAID`.
11. PayMongo sends `checkout_session.payment.paid` to the PSP webhook.
12. PSP verifies the raw webhook body signature before parsing or changing any database record.
13. PSP enforces event/session idempotency.
14. PSP matches the event to the internal Payment through trusted reference/session data.
15. PSP changes Payment to `PAID`, records payment time and gateway transaction details.
16. PSP writes one ledger `PAYMENT` entry.
17. PSP issues one unique digital PSP receipt.
18. Repeated webhook delivery returns success without duplicate financial posting.

## API Authentication

The PayMongo secret API key is server-only. Hosted Checkout API authentication uses the secret key through HTTP Basic authentication as the username with an empty password.

Never expose `sk_test_*` or `sk_live_*` in:

- browser/PWA code
- manifests or service worker
- GitHub
- logs
- HTML
- URLs

## Webhook Signature Verification

PayMongo includes a `Paymongo-Signature` header. Verification must use the **raw, unmodified** request body and the endpoint signing secret.

Expected signature components include:

- `t` — timestamp
- `te` — test-mode signature
- `li` — live-mode signature

Verification algorithm:

1. Read the raw request body.
2. Parse `Paymongo-Signature` values.
3. Build `${timestamp}.${rawBody}`.
4. Compute HMAC-SHA256 with `PAYMONGO_WEBHOOK_SECRET`.
5. Use timing-safe comparison.
6. Compare against `te` for test-mode events or `li` for live-mode events.
7. Reject invalid signatures before JSON parsing or database mutation.
8. Enforce a reasonable timestamp tolerance to reduce replay risk.

## Idempotency

### Outbound creation

Send a stable `Idempotency-Key` on the PayMongo checkout creation POST so retries do not create multiple checkout resources.

### Inbound webhook

Persist unique PayMongo event ID and/or checkout session object ID. Replayed delivery must never:

- create another Payment
- create another ledger entry
- issue another receipt
- increment paid totals again

Multiple-record payment posting uses a database transaction.

## Amounts

Database amounts use decimal PHP values. PayMongo amounts are integer centavos at the API boundary. Conversion must be exact and reject negative or unsupported fractional values.

## Effective-Dated Dues

Each chapter can define its own dues amount by effective period. Once an assessment/charge is generated, the posted amount becomes historical and is not rewritten by a later rate change.

## Payment States

Supported internal states:

- `PENDING`
- `PROCESSING`
- `PAID`
- `FAILED`
- `CANCELLED`
- `REFUNDED`
- `PARTIALLY_REFUNDED`

Browser redirect alone never sets `PAID`.

## PSP Digital Receipt

A PSP receipt is tied to the authoritative internal Payment and is separate from any optional gateway email receipt.

Receipt information includes:

- unique receipt number
- internal payment reference
- PayMongo session/reference
- member name and membership number
- chapter
- assessment/coverage
- amount/currency
- payment timestamp
- issue timestamp
- official PSP branding

Recommended configurable number pattern:

`PSP-[CHAPTER]-[YYYY]-[SEQUENCE]`

Receipt numbering is not used as financial truth.

## Refunds and Corrections

Do not delete successful payment history. Refunds, reversals, and corrections create explicit traceable records, ledger entries, and audit events. Gateway refund actions are implemented only after live PayMongo account capabilities and business approval are confirmed.

## Production URLs

- Success: `https://psp.hoahub.tech/payments/success`
- Cancel: `https://psp.hoahub.tech/payments/cancelled`
- Webhook: `https://psp.hoahub.tech/api/webhooks/paymongo`

## Test-to-Live Gate

Before enabling live PayMongo credentials:

- test checkout creation succeeds
- cancel leaves Payment unpaid
- browser success return alone leaves Payment pending until webhook confirmation
- valid signed test webhook posts payment exactly once
- duplicate signed webhook does not double post
- invalid signature is rejected
- wrong-member/chapter/assessment access is rejected
- receipt is unique
- member payment history and finance reconciliation agree
- internal and gateway references are traceable

## Secret Handling

Required server-side environment values:

- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech`

Register the live webhook once after production HTTPS is online. Do not create a webhook per payment.
