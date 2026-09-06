# PSP Finance & PayMongo End-to-End Hotfix — 2026-09-06

## Incident

Production Admin Finance could successfully create an effective-dated rate and post an assessment, but the mutation UI only refreshed the current page. Because the Finance Register defaults to **Payments**, the persisted Rate/Assessment evidence was not immediately visible. A member also reported that the posted assessment was not visible and that **Online Payment** was reported unavailable even though the Chapter setup screen showed a LIVE linked account, child webhook signing readiness, accepted payment methods and enabled Online Payment.

## Audit findings before code change

- `POST /api/admin/finance/rates` already persists `AssessmentRate`, closes the prior effective record without rewriting history, and audits `ASSESSMENT_RATE_CREATED`.
- `POST /api/admin/finance/assessments` already creates an ACTIVE `Assessment` and, in the same database transaction, creates one `MemberLedgerEntry` CHARGE for every ACTIVE member in the selected Chapter. It audits `ASSESSMENT_POSTED` and returns the exact charged-member count.
- Member `/payments` is intentionally exact-member/exact-Chapter scoped. It reads only the current member's ledger and only ACTIVE assessments belonging to that member's `chapterId`.
- The previous member page swallowed every `getChapterPayMongoConfig(member.chapterId)` failure and replaced it with one generic “Online Payment unavailable” message. That hid whether the member was attached to a different Chapter record or whether the exact Chapter had a disabled config, invalid linked account, pending child webhook, mode mismatch, or platform readiness blocker.
- The linked split-payment checkout already calculates the Chapter amount and PSP convenience fee server-side, creates the PayMongo split intent, persists exact Chapter/platform/gross split evidence, and remains exact-member/exact-Chapter scoped.
- The verified PayMongo webhook already performs idempotent settlement, posts only the Chapter amount to the member ledger, creates/upserts the digital receipt, and persists split-payment posting audit evidence.
- Outbound PayMongo provider actions remain guarded by the audited LIVE approval control and server LIVE kill-switch. Inbound webhook reconciliation is not disabled by governance revocation so already-started transactions remain auditable/reconcilable.

## Hotfix

1. **Rate save visibility**
   - Save Rate now shows an in-progress state and, after a successful durable API response, navigates directly to the persisted **Rates** register filtered to the exact Chapter.

2. **Assessment posting visibility**
   - Post to Active Members now shows an in-progress state and, after a successful durable API response, navigates directly to the persisted **Assessments** register filtered to the exact Chapter.
   - The charged-member count is carried as explicit posting evidence.

3. **Member Chapter/payment readiness visibility**
   - Added a structured, secret-safe Chapter PayMongo readiness result.
   - Member Payments now evaluates the exact `member.chapterId` and displays the exact Chapter name/code used by the ledger and payment runtime.
   - Safe reason codes distinguish disabled/missing Chapter payment configuration, invalid linked Account ID, child webhook not ready, Chapter/platform mode mismatch, platform-level readiness failure, and unknown failures.
   - Secret keys, webhook secrets and encrypted values are never displayed.

4. **End-to-end regression protection**
   - Added source-contract checks for transactional assessment ledger posting, exact-member Chapter runtime selection, split-intent creation and persisted split evidence, LIVE approval guard, webhook idempotency, ledger settlement, digital receipt generation and split reconciliation.

## Production safety

- No schema migration.
- No existing Rate, Assessment, Ledger, Payment, Receipt or split audit record is rewritten.
- No automatic fallback to a similarly named Chapter is allowed; Chapter isolation remains ID-based.
- No real production charge is created as part of verification.
- No PayMongo secret or webhook signing secret is surfaced.
- LIVE provider actions remain fail-closed under the existing approval/kill-switch controls.

## Acceptance gates

Do not declare this incident resolved in production until:

1. exact PR head passes lint, platform-hardening contracts, finance/payment hotfix contracts, Prisma validation/generation where configured, typecheck and production build;
2. exact passing head is merged with head-SHA protection;
3. deployed `main` release is verified by production health/readiness;
4. PayMongo activation/runtime smoke remains green and production readiness reports PayMongo platform configured + LIVE enabled;
5. Admin can visibly see persisted Rates/Assessments through the destination register workflow;
6. Member Payments displays the exact member Chapter and either ONLINE PAYMENT READY or one safe actionable blocker;
7. no destructive production payment is used merely for testing receipt/split behavior; settlement/receipt/split correctness is verified through source/data contracts and controlled non-destructive evidence.

## Separate known production-smoke finding

The general public Production Smoke currently fails the homepage `Cache-Control: no-store` assertion because Hostinger CDN is serving a cached `/` response (`s-maxage=31536000`) even though current source already declares the homepage dynamic and configures no-store headers. This is tracked as a separate hosting/cache delivery defect and must not be misclassified as a Finance/PayMongo transaction failure or bypassed by weakening the smoke assertion.
