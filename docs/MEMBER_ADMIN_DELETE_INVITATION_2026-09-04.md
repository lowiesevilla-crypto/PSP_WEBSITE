# PSP Member Administration — Delete Member + Resend Invitation

**Date:** 2026-09-04  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Branch:** `feat/member-delete-resend-invitation-2026-09-04`  
**Base main SHA:** `6fac2b58b9bc94d55958680ce44f90613d1c4fde`

## Objective

Give both National/System Admin and Chapter Admin the ability to:

1. resend the activation invitation to an approved member whose account still requires activation; and
2. delete a member from active membership without destroying required PSP history or financial evidence.

All operations remain server-authorized by `members.manage` and exact chapter scope. National-scoped assignments may manage across chapters; chapter-scoped assignments may act only inside their own chapter.

## Implemented — Resend Invitation

- New route: `POST /api/admin/members/[id]/resend-invitation`.
- Requires `members.manage` for the member's chapter.
- Only active approved memberships are eligible.
- Suspended/disabled users are blocked.
- Already activated accounts are blocked and directed to normal password recovery instead.
- A new secure activation token is generated and emailed; the token is never returned to the Admin UI.
- Email includes membership number, login email, activation link, 24-hour expiry notice, PSP PWA installation link, and current Chapter Chairman identity.
- PSP never sends a plaintext or temporary password.
- Resend is rate-limited per member and records delivery success/failure audit evidence.
- Approval welcome delivery and resend delivery share the same centralized invitation helper to prevent template drift.

## Implemented — Delete Member

- New route: `DELETE /api/admin/members/[id]`.
- Requires `members.manage` for the member's chapter.
- Administrator self-deletion is blocked.
- Delete is intentionally implemented as a **non-destructive archive**, not physical database erasure.
- Membership becomes `ARCHIVED` and disappears from the normal active Member Directory.
- Open Membership History periods are closed and an archived history entry is appended.
- Current chapter role assignments, officer assignments, and committee memberships are ended.
- Digital Member ID is revoked.
- Valid membership certificates are revoked.
- Member-only User access is disabled.
- If the same User has a national or other-chapter assignment that must remain valid, the whole User account is preserved while the deleted chapter membership access is removed.
- Assessments, ledger entries, payments, receipts, certificate history, application history and audit history are preserved.
- Audit action: `MEMBER_DELETED_ARCHIVED`.

## Admin UI

`/admin/members` now provides:

- separate Membership Status and Account Status visibility;
- **Resend Invitation** only when activation is still required;
- **Delete Member** with an explicit preservation warning;
- disabled self-delete control;
- busy/disabled states that prevent duplicate requests;
- responsive card-based controls for both National/System Admin and Chapter Admin.

## CI Coverage

The isolation fixture now creates active invited members in CI Alpha and CI Beta chapters.

The CI isolation suite validates:

- Chapter Admin cannot resend a foreign chapter invitation;
- authorized Chapter Admin resend reaches the mail-delivery boundary and produces auditable delivery-failure evidence when SMTP is intentionally absent in CI;
- Chapter Admin cannot delete a foreign chapter member;
- Chapter Admin can delete/archive an own-chapter member;
- archived membership, disabled member-only User access, revoked Digital Member ID, and ended active role assignments are verified directly in MySQL;
- foreign chapter membership remains unchanged after unauthorized attempts.

National/System Admin uses the same `members.manage` permission through national scope. The generic authorization resolver already treats national-scoped permission assignment as cross-chapter authority; production state-changing proof still requires controlled credentials/test records.

## Release Identity

This is production-significant member-administration functionality and therefore advances exact deployment proof to:

- release: `2026-09-04-r6`
- deployment generation: `2026-09-04-member-admin-invitation-v1`

CI and Production Smoke assert those exact markers.

## Required Closure Evidence

1. final exact PR head passes the complete PSP CI gate set;
2. new member-administration isolation checks pass;
3. merge only the exact passing head;
4. post-merge PSP CI passes;
5. Production Smoke observes exact `r6 / member-admin-invitation-v1` generation and passes public/runtime/security gates;
6. controlled production Admin validation remains open until safe production credentials/test members are available:
   - Chapter Admin resend invitation and receipt of email;
   - National Admin resend invitation and receipt of email;
   - Chapter Admin safe delete/archive of controlled member;
   - National Admin safe delete/archive of controlled member;
   - cross-chapter denial under live authenticated sessions.

## Current State

Implementation and CI coverage are present on the feature branch. The branch is **NOT MERGE-ELIGIBLE** until the final documentation-reconciled exact head passes all required CI gates.
