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

## Required Acknowledgements

Two separate checkboxes are mandatory on the Review & Acknowledgement step:

1. **Application accuracy/review acknowledgement** — applicant confirms information is accurate and understands submission does not itself establish active membership.
2. **Data Privacy acknowledgement** — applicant confirms they have read and understood the Data Privacy Notice.

The server rejects submission if either checkbox is not acknowledged.

The application audit trail records the Data Privacy Notice version acknowledged at submission. Current notice version: `2026-08-20-v1`.

## Privacy Notice

Public route: `/privacy`

The notice describes the registration data collected, legitimate membership/chapter administration purposes, access restrictions, safeguards, retention approach, and privacy request channel. The privacy notice must be reviewed before production go-live and updated whenever approved privacy practices materially change.
