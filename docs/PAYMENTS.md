# PSP Payments & PayMongo Platforms Integration

**Current payment release target:** `2026-09-07-r15 / 2026-09-07-dues-billing-split-v1`

## Authoritative Accounting Model

PSP owns the member ledger and payment classification. PayMongo is the payment/settlement gateway, not the accounting system of record.

Canonical linked-account model:

- PSP PayMongo account = parent/platform account;
- each PSP Chapter = linked child PayMongo `org_*` account;
- PSP authenticates server-side with the parent secret;
- child operations use parent authentication plus child `Account-Id`;
- PSP does not store Chapter API secret keys in linked-account mode;
- Chapter `org_*` Account ID is a non-secret provider identifier and may be stored directly;
- the real child webhook signing secret is encrypted at rest;
- one linked child account may belong to only one PSP Chapter.

## Create Dues / Bill — r15

Finance exposes a dedicated **Create Dues / Bill** workflow. Billing scope is explicit and server-authorized.

### Specific Chapter

- Chapter Admin may create dues only for a Chapter covered by exact `finance.manage` authority.
- National/System Admin may create Chapter dues only after deliberately selecting the target Chapter.
- Multi-Chapter/National users are not defaulted to the first Chapter; an explicit Chapter selection is required.
- Chapter dues use `MONTHLY_DUES` in the dedicated dues workflow.
- Charges are posted only to active members of the selected Chapter.
- Foreign-Chapter members must never receive the charge.

### National

- `billingScope=NATIONAL` requires national-scoped `finance.manage`.
- Chapter-scoped Admin attempts to use National billing return HTTP 403.
- National billing must use `NATIONAL_DUES` and an explicit amount.
- National Dues fan out to active Chapters as Chapter-specific assessments and ledger charges while preserving isolation.

### Billing idempotency

Equivalent duplicate billing is checked inside the database transaction, not as a race-prone preflight request.

The posting transaction uses `SERIALIZABLE` isolation. If an equivalent assessment already exists, or a concurrent transaction conflicts with the same billing operation, the later request is rolled back and returns HTTP 409 instead of committing duplicate assessments or member `CHARGE` entries.

### Finance date semantics

Admin civil dates are interpreted as Philippine Standard Time (`Asia/Manila`, UTC+08:00) before UTC persistence. The saved coverage and due dates therefore do not change based on the administrator browser/computer timezone.

### Member Amount to Pay

Authenticated members see the exact outstanding **Amount to Pay** for their assigned Chapter and National dues. Outstanding status is derived from PSP ledger/payment records; the UI must not fabricate or infer paid state from browser redirects.

## Admin Configuration Layers

### PSP parent split-payment platform

This is National/System infrastructure. Server-only settings are:

- `PAYMONGO_PLATFORM_ACCOUNT_ID`
- `PAYMONGO_PLATFORM_SECRET_KEY`
- `PLATFORM_CONVENIENCE_FEE_BPS` and/or `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`
- `PAYMENT_CONFIG_ENCRYPTION_KEY`
- `PAYMONGO_LIVE_ENABLED`

Parent secrets and the encryption key are never editable or displayed in a Chapter form.

### Chapter linked-account configuration

An authorized Chapter/National Admin may save a disabled Chapter Draft containing:

- linked child Account ID (`org_*`);
- TEST or LIVE mode;
- accepted methods (`qrph`, `gcash`, `paymaya`).

Configuration states remain:

1. `NOT_CONFIGURED`
2. `DRAFT`
3. `READY`
4. `ENABLED`
5. `BLOCKED`

A disabled Draft is saveable before parent/encryption readiness. It must not call PayMongo, create a child webhook, or make the Chapter payable.

Activation requires parent platform readiness, deliberate fee configuration, stable credential encryption, matching mode, valid unique linked account, valid methods, child webhook signing readiness, and applicable LIVE controls.

## National Admin TEST Acceptance & LIVE Approval

PSP provides the audited workflow at:

**Admin → Live Approval**  
`/admin/finance/live-approval`

Only national-scoped `finance.manage` may approve or revoke LIVE processing.

Before approval is truthful, real controlled evidence must exist for:

1. PayMongo TEST DUES payment and observed Chapter/platform split;
2. PayMongo TEST CONTRIBUTION/OTHER payment and observed split;
3. real child webhook, payment status, PSP receipt and reconciliation.

Approval/revocation is append-only AuditLog evidence. LIVE has dual control:

- PSP National Admin TEST Acceptance & LIVE Approval; and
- Hostinger `PAYMONGO_LIVE_ENABLED=true`.

Both are required. Neither substitutes for the other.

## Provider Endpoint Safety

Production provider calls are pinned to:

`https://api.paymongo.com/v1`

`PAYMONGO_API_BASE_URL` is a CI/testing hook only. It is honored only when `APP_ENV=test` and only for loopback hosts (`localhost`, `127.0.0.1`, `::1`). Production cannot redirect the parent Basic-auth secret or Chapter account identifier to an arbitrary configured origin.

## Platform Convenience Fee

Approved controls:

- `PLATFORM_CONVENIENCE_FEE_BPS`
- `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`

Never invent a fee default.

Canonical invariant:

`gross total = Chapter amount + platform convenience fee`

Definitions:

- **Chapter amount** — member obligation/contribution/other Chapter entitlement; stored in `Payment.amount` and posted to the Chapter/member ledger.
- **Platform fee** — PSP convenience fee; stored in immutable split metadata and never posted as Chapter income.
- **Gross total** — amount sent to PayMongo and paid by the member.

## Required Split-Payment Flow

1. Authenticated active member selects a payable obligation and method.
2. Server derives member, Chapter, category, assessment/amount and ownership.
3. Server resolves enabled Chapter linked-account configuration.
4. Server resolves parent platform and fee configuration.
5. LIVE provider calls additionally require current National approval and the Hostinger LIVE kill-switch.
6. Member sees Chapter amount, platform fee and gross total before confirmation.
7. PSP creates internal `Payment` with `Payment.amount = Chapter amount` only.
8. PSP creates PayMongo Payment Intent using parent authentication and Chapter child `Account-Id`.
9. Payment Intent amount is gross.
10. `split_payment.recipients` contains the PSP parent as the fixed platform-fee recipient.
11. `split_payment.transfer_to` is the Chapter linked child account.
12. PSP creates/attaches QR Ph, GCash or Maya Payment Method.
13. Browser redirect/polling remains UX only.
14. Child webhook sends provider payment state.
15. PSP verifies raw signature, event idempotency, same-Chapter Payment Intent and gross amount.
16. On paid: mark Payment `PAID`, post one Chapter ledger `PAYMENT` for Chapter amount only, create one receipt and audit split settlement.
17. On failure: do not post Chapter payment/receipt.
18. Duplicate webhook succeeds idempotently without duplicate financial posting.

## Receipts and Reporting

Confirmed receipts distinguish:

- purpose/category;
- member/membership number;
- Chapter;
- payment method;
- Chapter amount;
- platform convenience fee;
- gross total paid;
- PSP reference;
- PayMongo reference;
- issue/confirmation time.

Finance summary/report totals use the complete authorized dataset or authoritative aggregates, not silently capped recent records. Search/pagination affects presentation only. Effective-dated rates preserve history; posted assessment amounts are immutable historical facts. Corrections use adjustments/reversals/refunds.

## Automated r15 Evidence

PR #48 adds a required authenticated runtime E2E using seeded Chapter Admin, National/System Admin and Member accounts plus an isolated loopback PayMongo-compatible test double.

A passing application candidate proved:

- Chapter Admin creates own-Chapter dues;
- foreign-Chapter member is not charged;
- Chapter Admin National escalation returns 403;
- National Admin creates National Dues across active Chapters;
- member sees both Chapter and National `Amount to Pay` values;
- TEST Chapter configuration activates against the isolated provider double;
- Chapter amount `PHP 100.00` + PSP fee `PHP 5.00` = gross `PHP 105.00`;
- Payment Intent uses the Chapter linked Account-Id;
- fixed recipient is the PSP platform account for `PHP 5.00`;
- `transfer_to` is the Chapter linked account;
- signed `payment.paid` webhook marks paid;
- Chapter/member ledger receives `PHP 100.00` only;
- receipt is generated.

The final r15 candidate also adds transactional duplicate-billing protection, PHT date handling, explicit Chapter selection for multi-Chapter users, resilient busy/reset behavior, production-safe provider endpoint pinning, and exact r15 deployment markers.

Production capability markers:

- `billingDuesVersion=chapter-national-v1`
- `splitPaymentContractVersion=linked-split-e2e-v1`

See `BILLING_DUES_SPLIT_E2E_2026-09-07.md` for deterministic evidence.

## What Automated Evidence Does Not Prove

The loopback PayMongo-compatible test double proves PSP application behavior. It does **not** prove real PayMongo TEST settlement, provider delivery or linked-account settlement.

Still controlled/external:

- real PayMongo TEST DUES split transaction;
- real PayMongo TEST CONTRIBUTION/OTHER split transaction;
- real child webhook/signature/status/receipt reconciliation;
- National Admin LIVE approval after those real TEST results exist;
- Hostinger LIVE kill-switch after National approval;
- controlled first LIVE payment and settlement.

Do not record TEST Acceptance & LIVE Approval from CI/mock evidence alone.
