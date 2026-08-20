# Payments & Financial Integrity

## Principle

The PSP platform owns the member ledger. PayMongo is the payment gateway, not the accounting system of record.

## Financial Model

1. A configurable assessment/rate creates a member obligation.
2. The obligation is represented by a traceable charge/assessment.
3. A member starts payment from an outstanding obligation.
4. The server creates a `Payment` record in `PENDING` state before redirecting to PayMongo.
5. PayMongo checkout/payment metadata contains the internal reference.
6. Browser return pages show status but do not authoritatively mark a payment paid.
7. Trusted server-side gateway state/webhooks determine final payment posting.
8. A confirmed payment creates an append-only ledger `PAYMENT` entry and a unique receipt.

## Idempotency

- Internal payment reference is unique.
- PayMongo gateway event ID is unique when present.
- Gateway object/reference is stored.
- A webhook replay must result in no duplicate ledger entry or receipt.
- Processing must use a database transaction where multiple records change together.

## Amounts

Database amounts use decimal columns in PHP currency representation. PayMongo API values are converted to/from integer centavos at the integration boundary.

## Effective-Dated Dues

Each chapter can define its own dues amount by effective period. Once an assessment is generated, its amount is historical and must not change when a later rate is configured.

## Refunds/Reversals

Refunds and corrections are explicit states/events. Do not delete paid transactions. Record gateway refund information and append `REFUND` or `REVERSAL` ledger entries as appropriate.

## Production URLs

- Success: `https://psp.hoahub.tech/payments/success`
- Cancel: `https://psp.hoahub.tech/payments/cancelled`
- Webhook: `https://psp.hoahub.tech/api/payments/paymongo/webhook`

Final route names must match implemented routes before production PayMongo configuration.

## Secret Handling

`PAYMONGO_SECRET_KEY` and webhook verification secrets are server-only environment values. They are never exposed through `NEXT_PUBLIC_*`, browser bundles, logs, or error responses.
