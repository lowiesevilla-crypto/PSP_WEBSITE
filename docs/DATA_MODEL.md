# Data Model

## Organization Hierarchy

`Organization -> Chapter -> Member`

A member normally has one current primary chapter. Chapter transfers do not overwrite history; `MembershipHistory` records prior chapter/status periods.

## Identity & Authorization

- `User` stores authentication identity and status.
- `Role` and `Permission` define capabilities.
- `UserRoleAssignment` can be National (`chapterId = null`) or Chapter scoped.
- Protected queries must resolve scope server-side.

## Membership

- `MembershipApplication` is distinct from `Member`.
- Approval creates/activates the member identity.
- `Member.membershipNo` is globally unique.
- Application rejection/withdrawal retains historical evidence.

## Chapter Organization

- `ChapterPosition` is configurable by chapter.
- `OfficerAssignment` stores term start/end and preserves historical officer service.

## Community

- National content has `audience = NATIONAL` and no chapter owner unless business rules explicitly scope it.
- Chapter content carries its `chapterId` and `audience = CHAPTER`.
- Comments inherit visibility from their parent post.

## Finance

- `AssessmentType` identifies contribution categories.
- `AssessmentRate` stores effective-dated chapter amounts.
- `Assessment` stores the historical billed amount.
- `MemberLedgerEntry` records charges, payments, adjustments, refunds, and reversals.
- `Payment` records gateway state.
- `PaymentTransaction` records gateway events/objects and idempotency identifiers.
- `Receipt` is one-to-one with a successful posted payment.

## Certificates

`Certificate.verificationToken` is opaque and unique. Public verification must not expose internal IDs or unnecessary member data.

## Audit

`AuditLog` captures privileged, membership-status, moderation, and financial actions. Audit history is not editable by ordinary administrators.

## Deletion Rules

Use restrictive relationships for financial, identity, and historical data. Prefer deactivate/archive/status transitions rather than destructive deletes where records are required for traceability.
