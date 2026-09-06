# PSP Payments & PayMongo Platforms Integration

## Authoritative Accounting Model

PSP owns the member ledger and payment classification. PayMongo is the payment/settlement gateway, not the accounting system of record.

Canonical online-payment model:

- PSP PayMongo account = parent/platform account;
- each PSP Chapter = linked child PayMongo `org_*` account;
- PSP authenticates server-side with the parent secret;
- child operations use parent authentication plus child `Account-Id`;
- PSP does not store a Chapter API secret key in linked-account mode;
- Chapter `org_*` Account ID is a non-secret provider identifier and may be stored directly;
- the real child webhook signing secret is encrypted at rest with the stable server payment-configuration encryption key;
- one linked child account may belong to only one PSP Chapter.

## Admin Configuration Layers

The Finance Admin page must visibly distinguish two configuration layers.

### 1. PSP parent split-payment platform

This is National/System infrastructure, not a per-Chapter secret form. The UI exposes readiness only and never renders parent secret values.

Server-side secure environment settings:

- `PAYMONGO_PLATFORM_ACCOUNT_ID` — PSP parent PayMongo `org_*` account;
- `PAYMONGO_PLATFORM_SECRET_KEY` — PSP parent TEST/LIVE secret;
- `PLATFORM_CONVENIENCE_FEE_BPS` and/or `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS` — deliberate PSP split/convenience fee;
- `PAYMENT_CONFIG_ENCRYPTION_KEY` — stable server-only value of at least 32 characters, required before storing real child webhook signing secrets;
- `PAYMONGO_LIVE_ENABLED=false` until controlled TEST acceptance is completed and National Admin records LIVE approval.

The parent secret and encryption key are never editable or displayed in a Chapter form.

### National Admin credential-encryption setup

When `PAYMENT_CONFIG_ENCRYPTION_KEY` is missing, the Finance Admin page must show a dedicated **Credential Encryption Setup** panel for National Admin. The panel must:

- identify `PAYMENT_CONFIG_ENCRYPTION_KEY` as the blocking server setting;
- explain that it protects Chapter child-webhook signing secrets;
- direct the National Admin to the production app's secure environment-variable settings in Hostinger hPanel for `psp.hoahub.tech`;
- require a stable random value of at least 32 characters;
- instruct the Admin to save/redeploy or restart the production app, then re-check activation readiness;
- never provide a browser form that stores or displays the master encryption key.

The key must never be pasted into Chapter settings, chat, email, screenshots, source code or GitHub. Existing encrypted webhook secrets depend on the stable key; rotation requires a controlled migration.

### National Admin TEST Acceptance & LIVE Approval

The previous wording "pending test-mode signoff and explicit approval" did not have an actual Admin workflow. PSP now provides the controlled signoff at:

**Admin → Live Approval**  
`/admin/finance/live-approval`

Only a **national-scoped** administrator with `finance.manage` may approve or revoke the platform LIVE gate. Chapter-scoped Finance/Admin roles cannot perform this action.

Before National Admin can approve LIVE processing, the UI requires explicit confirmation that the controlled TEST evidence has actually been completed:

1. TEST dues payment completed and expected Chapter/platform split amounts verified;
2. TEST contribution/other payment completed and expected split amounts verified;
3. TEST child webhook, payment status, PSP receipt and reconciliation verified.

The approval is not a mutable boolean row. PSP writes an append-only AuditLog event with the approving user, timestamp, checklist evidence and optional notes. Revocation writes a later append-only revocation event with its reason. The latest approval/revocation event determines the current PSP approval state.

LIVE has **dual control**:

- **PSP governance control** — National Admin TEST Acceptance & LIVE Approval must be recorded in PSP;
- **infrastructure kill-switch** — `PAYMONGO_LIVE_ENABLED=true` must be configured in the Hostinger production environment.

Both controls are required before LIVE PayMongo provider actions are allowed. The server kill-switch is not editable in the PSP browser and the National Admin approval does not silently change Hostinger environment variables.

Required transition to LIVE:

1. Complete and retain the controlled TEST evidence.
2. National Admin opens **Admin → Live Approval**, confirms all TEST acceptance items, and records **Approve LIVE after TEST signoff**.
3. In Hostinger production Environment Variables, set `PAYMONGO_LIVE_ENABLED=true`.
4. Save and redeploy/restart `psp.hoahub.tech` so the server loads the new value.
5. Return to Finance and re-check activation readiness.
6. Only then may the authorized Admin deliberately select **Enable Online Payment** and submit **Save & Activate Online Payment** for a LIVE Chapter whose other prerequisites are ready.

If National approval is revoked, new LIVE provider calls fail closed even if the Hostinger kill-switch remains ON. For emergency infrastructure shutdown, turning the Hostinger kill-switch OFF also blocks LIVE processing independently of PSP approval.

### 2. Chapter linked-account setup

An authorized Chapter/National Admin can select the Chapter and edit while Online Payment is disabled:

- linked child Account ID (`org_*`);
- draft PayMongo mode (`TEST` or `LIVE`);
- accepted methods (`qrph`, `gcash`, `paymaya`).

The disabled draft mode remains editable before activation. Activation requires the Chapter mode to match the PSP parent platform mode.

## Chapter Payment Configuration States

Chapter payment setup is intentionally separated from activation.

1. **NOT_CONFIGURED** — no linked child Account ID saved.
2. **DRAFT** — linked child account, selected mode and methods are saved; Online Payment is disabled; PSP parent platform, encryption readiness, LIVE governance and/or child webhook may still be incomplete.
3. **READY** — parent platform, convenience fee, credential encryption, mode, linked-account and applicable LIVE controls are valid; the child webhook is created during activation when needed.
4. **ENABLED** — Online Payment is active for the Chapter in the allowed mode.
5. **BLOCKED** — saved/enabled configuration fails current validation and must fail closed until remediated.

### Draft-save contract

A Chapter Admin/National Admin with exact finance authority must be able to save a **disabled Draft even while the PSP parent PayMongo platform or `PAYMENT_CONFIG_ENCRYPTION_KEY` is not configured**.

Draft save:

- validates Chapter authority and `org_*` format;
- persists the linked child Account ID as a non-secret provider identifier;
- persists selected payment methods and the chosen disabled-draft mode;
- keeps `isEnabled=false`;
- does not call PayMongo;
- does not create a child webhook;
- stores a non-secret pending-webhook marker only to retain compatibility with the existing non-null production column;
- never reports that marker as a real webhook signing secret;
- never makes the Chapter payable.

Existing production records that contain a legacy encrypted `org_*` Account ID remain readable for backward compatibility. A later authorized save normalizes the non-secret identifier without requiring a schema migration.

Runtime member payment configuration rejects staged/pending webhook state.

### Activation contract

Enabling Online Payment requires all of the following before `isEnabled=true` is persisted:

- PSP parent platform secret/account configuration is valid;
- platform convenience fee is explicitly configured;
- stable `PAYMENT_CONFIG_ENCRYPTION_KEY` is present before any provider webhook-creation call;
- Chapter mode matches parent TEST/LIVE mode;
- linked child `org_*` account is valid and unique to that Chapter;
- selected method list is valid;
- real child webhook signing secret exists, creating the child webhook when required;
- for LIVE, National Admin TEST Acceptance & LIVE Approval is currently approved;
- for LIVE, the Hostinger `PAYMONGO_LIVE_ENABLED` server kill-switch is ON.

Encryption readiness is checked **before** PSP creates a PayMongo child webhook. A missing encryption key therefore cannot create an orphan provider webhook whose signing secret PSP is unable to persist safely.

Actual outbound LIVE provider operations also enforce the National approval in the PayMongo client before creating a linked Payment Intent, Payment Method, attachment, or child webhook. This prevents a UI/API path from bypassing the governance gate.

The Finance UI activation control remains clickable for visibility even when activation is blocked. Clicking it while blocked must keep `isEnabled=false` and display the exact current blockers. Once the saved draft, parent platform, credential encryption, mode match and applicable LIVE controls are ready, selecting the control prepares activation and the Admin must explicitly submit **Save & Activate Online Payment**.

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
5. If the platform is LIVE, server verifies current National Admin LIVE approval before provider action; the Hostinger LIVE kill-switch is independently enforced by platform configuration.
6. Member receives fee preview showing Chapter amount, platform fee, gross total.
7. Member explicitly confirms.
8. PSP creates internal `Payment` with `Payment.amount = Chapter amount` only.
9. PSP creates PayMongo Payment Intent using parent authentication + Chapter child `Account-Id`.
10. Payment Intent amount is gross total.
11. Split-payment recipient sends configured PSP platform fee to parent; remainder is transferred/settled to Chapter child.
12. PSP creates/attaches selected Payment Method.
13. QR Ph renders provider QR and polls internal PSP status; GCash/Maya follow provider authorization/redirect flow.
14. Browser redirect/polling is never authoritative for `PAID`.
15. Child webhook sends payment state.
16. PSP verifies raw webhook signature before parsing/mutation.
17. PSP enforces unique event idempotency and same-Chapter Payment Intent matching.
18. PSP verifies gateway amount against persisted gross total.
19. On paid: mark Payment PAID, post one Chapter ledger PAYMENT for Chapter amount only, create one receipt, audit split settlement.
20. On failed: mark failed without Chapter ledger payment/receipt.
21. Duplicate webhook succeeds idempotently without duplicate posting.

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

Required for **activated** linked-account split payment:

- `PAYMONGO_PLATFORM_SECRET_KEY`
- `PAYMONGO_PLATFORM_ACCOUNT_ID`
- `PAYMENT_CONFIG_ENCRYPTION_KEY` — stable server-only value, minimum 32 characters, required before activation/webhook-secret persistence but not for a disabled Chapter draft
- `PLATFORM_CONVENIENCE_FEE_BPS` and/or `PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS`
- `PAYMONGO_LIVE_ENABLED=false` during TEST; set to `true` only after National Admin records controlled TEST Acceptance & LIVE Approval
- `NEXT_PUBLIC_APP_URL=https://psp.hoahub.tech`

Never expose platform secret, child webhook secret, or encryption key in browser/PWA code, manifests, service workers, GitHub, logs, screenshots, URLs, or documentation.

## Automated r14 Evidence

PR #34 runtime CI proves without contacting the real PayMongo provider:

- foreign Chapter payment configuration is rejected;
- own Chapter disabled Draft saves while parent platform is intentionally unavailable;
- Draft returns linked Account ID but reports no real webhook secret;
- Draft state remains `DRAFT` and `isEnabled=false`;
- attempted activation without parent platform fails with 409;
- failed activation does not change persisted `isEnabled=false`.

Later r14 Finance hotfix CI additionally requires:

- National Admin credential-encryption setup instructions are visible when the server key is absent;
- the blocked activation control remains actionable for blocker visibility while still fail-closed;
- the exact saved Chapter draft is still required before activation;
- National-only TEST Acceptance & LIVE Approval UI/API exists and is auditable/revocable;
- every outbound LIVE PayMongo provider action is guarded by the current National approval;
- the Hostinger `PAYMONGO_LIVE_ENABLED` kill-switch remains a separate required control;
- the complete high/critical dependency audit and runtime-only audit remain green.
