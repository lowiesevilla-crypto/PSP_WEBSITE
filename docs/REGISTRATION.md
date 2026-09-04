# Membership Registration Requirements

**Approved field order — 2026-08-20**

The public membership registration form must collect fields in this exact order:

1. First Name
2. Last Name
3. MI
4. Address
5. Email
6. Mobile No.
7. Date Survive
8. Location
9. PSP Birthday Code
10. Date of Birth
11. Select Chapter

## Business Rules

- Registration creates a `MembershipApplication`; it does not create active membership.
- Chapter selection is subject to authorized review.
- First Name, Last Name, Address, Email, Mobile No., Date Survive, Location, PSP Birthday Code, Date of Birth, and Chapter are required.
- MI is optional unless the product owner later changes this requirement.
- Date Survive, Location, and PSP Birthday Code must be retained when an approved applicant is converted to a Member record.
- Duplicate active application/member checks must run server-side.

## Approval, Activation, and Invitation Resend

When an authorized reviewer approves an application, PSP creates the Member record, membership number, Membership History, Digital Member ID, MEMBER role assignment, and welcome notification. A new login account normally remains `INVITED` until the approved member completes secure activation.

The approval email contains the member's membership number, login email, secure activation link when activation is required, PSP PWA installation link, and current Chapter Chairman identity. PSP never sends a plaintext or temporary password by email. The member creates their own password through the activation page.

The activation token is valid for 24 hours. National/System Admin and the exact authorized Chapter Admin may use **Resend Invitation** for an approved active membership whose user account still requires activation. The resend action:

- requires `members.manage` for the member's chapter;
- is denied cross-chapter unless the administrator has national scope;
- is blocked for suspended or disabled user accounts;
- is blocked when the account is already activated;
- sends a newly generated secure activation link plus the PSP installation link;
- is rate-limited to reduce accidental or abusive repeated delivery;
- writes success/failure audit evidence;
- never reveals the activation token to the administrator UI.

## Administrative Member Deletion

National/System Admin and the exact authorized Chapter Admin may use **Delete Member** under `members.manage` scope. PSP implements this as a non-destructive archive rather than physical erasure because membership, financial, certificate, and audit records must remain traceable.

Delete Member:

- changes the membership status to `ARCHIVED`;
- closes current membership-history periods and appends an archived history record;
- ends chapter role assignments, officer assignments, and committee memberships;
- revokes the Digital Member ID;
- revokes currently valid membership certificates;
- disables the whole User account only when that user has no national or other-chapter assignment that must remain available;
- blocks administrator self-deletion to prevent lockout;
- preserves assessments, ledger entries, payments, receipts, certificate history, approved application history, and audit evidence.

Deleted/archived members are removed from the normal active Member Directory but remain available to authorized historical/reporting workflows.

## Required Acknowledgements

Two separate checkboxes are mandatory on the Review & Acknowledgement step:

1. **Application accuracy/review acknowledgement** — applicant confirms information is accurate and understands submission does not itself establish active membership.
2. **Data Privacy acknowledgement** — applicant confirms they have read and understood the Data Privacy Notice.

The server rejects submission if either checkbox is not acknowledged.

The application audit trail records the Data Privacy Notice version acknowledged at submission. Current notice version: `2026-08-20-v1`.

## Privacy Notice

Public route: `/privacy`

The notice describes the registration data collected, legitimate membership/chapter administration purposes, access restrictions, safeguards, retention approach, and privacy request channel. The privacy notice must be reviewed before production go-live and updated whenever approved privacy practices materially change.
