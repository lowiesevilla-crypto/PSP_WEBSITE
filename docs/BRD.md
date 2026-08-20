# Business Requirements Document — Psi Sigma Phi Philippines Inc. Digital Membership Platform

**Version:** 1.0  
**Status:** Initial approved baseline  
**Date:** 2026-08-20  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Canonical production URL:** `https://psp.hoahub.tech`

---

## 1. Executive Summary

Psi Sigma Phi Philippines Inc. requires a centralized digital platform for national and chapter membership administration, member engagement, events, chapter organization, financial contributions, online payments, and digitally verifiable membership certificates.

The solution shall be delivered as a **mobile-first Progressive Web Application (PWA)** and responsive website. Members must be able to install the PWA on supported mobile devices and perform normal membership activities without requiring a desktop computer.

The platform shall support the organizational hierarchy:

`National Organization → Chapter → Chapter Officers / Committees → Members`

Every chapter may maintain its own organization structure, officers, members, monthly contribution amount, assessments, events, announcements, community content, and financial reporting while authorized National/System Administrators retain appropriate organization-wide management capability.

---

## 2. Business Objectives

The platform shall:

1. Establish one authoritative digital membership registry for Psi Sigma Phi Philippines Inc.
2. Organize members by chapter while preserving membership and transfer history.
3. Support online membership registration and controlled approval.
4. Provide secure member authentication and account recovery.
5. Deliver an installable, mobile-first PWA experience.
6. Allow members to view and maintain permitted profile information.
7. Support chapter and national community posts, images, comments, and announcements.
8. Support chapter and national events.
9. Maintain configurable chapter organization structures and officer terms.
10. Allow different chapter monthly contribution/dues amounts.
11. Generate member assessments and maintain individual member ledgers.
12. Accept secure online payment using PayMongo.
13. Generate traceable digital receipts and payment history.
14. Provide payment reconciliation to authorized finance roles.
15. Generate downloadable Certificates of Membership.
16. Provide QR-based live certificate verification.
17. Allow National/System Administrators to create and administer chapters.
18. Enforce chapter-level data isolation and least-privilege access.
19. Provide chapter and national reporting.
20. Maintain audit trails for sensitive administrative, membership, and financial actions.

---

## 3. Product Components

The solution consists of four integrated experiences sharing a common backend and authorization model.

### 3.1 Public Website

Public-facing information for Psi Sigma Phi Philippines Inc., including organization information, chapters, public events, membership information, online registration, member login, and contact information.

### 3.2 Member PWA

Installable member application supporting membership profile, chapter information, community feed, comments, events, payments, receipts, certificate access, notifications, and account/security functions.

### 3.3 Chapter Administration Portal

Chapter-scoped administration for applicants, members, chapter organization, officers, events, announcements, moderation, assessments, payment monitoring, reconciliation, and reports according to assigned permissions.

### 3.4 National / System Administration Portal

Organization-wide administration for chapters, National roles, membership oversight, authorized cross-chapter reporting, National events/announcements, certificate governance, roles/permissions, system configuration, and audit logs.

---

## 4. User Roles

### 4.1 System / National Administrator

May be authorized to:

- Create and configure chapters.
- Activate, suspend, deactivate, or archive chapters.
- Assign Chapter Administrators.
- Manage National roles and permissions.
- View authorized organization-wide membership information.
- Manage National announcements and events.
- Configure certificate and system settings.
- Access authorized National reporting and audit logs.

### 4.2 National Officer

National officer permissions shall be configurable. Position titles shall not automatically imply unrestricted system access.

### 4.3 Chapter Administrator

May be authorized to:

- Manage the assigned chapter profile.
- Review membership applications.
- Maintain chapter membership.
- Manage chapter organization and officers.
- Publish chapter announcements/events.
- Moderate chapter community content.
- Manage chapter assessments where permitted.
- View chapter financial information where separately authorized.
- Generate chapter reports.

Chapter Administrators shall not access another chapter unless separately authorized.

### 4.4 Chapter Officer

Officer permissions shall be configurable and independent from the officer title. Chapter President, Vice President, Secretary, Treasurer, Auditor, Board/Committee roles, advisers, and custom positions may be represented.

### 4.5 Chapter Treasurer / Finance Role

Financial permissions shall be independently assignable. Authorized finance users may access chapter assessments, ledgers, payments, receipts, reconciliation, and reports without automatically receiving unrelated administrative permissions.

### 4.6 Member

Approved active members may access authorized member functions including profile, chapter information, community, events, payments, receipts, certificate, and notifications.

### 4.7 Applicant

An applicant has submitted online registration but is not yet an official active member.

---

## 5. Membership Registration

### 5.1 Registration Principle

**Submitting registration shall not automatically create active membership.**

The initial lifecycle shall support:

`Submitted → Under Review → Correction Required / Pending Requirements → Approved or Rejected → Active Member`

Additional inactive/suspended/archive states apply after membership activation where appropriate.

### 5.2 Registration Information

Initial registration shall support configurable required fields. The approved baseline includes appropriate personal and membership information such as:

- Full name.
- Email address.
- Mobile number.
- Address.
- Date of birth.
- Profile photo where required.
- Requested chapter.
- Membership-related information approved by the organization.
- Supporting requirements where configured.

Only information necessary for legitimate membership administration shall be collected.

### 5.3 Duplicate Detection

The system shall detect potential duplicate applicants/members using configured criteria such as:

- Email address.
- Mobile number.
- Existing membership number.
- Name and birth-date combinations where appropriate.

Potential duplicates shall be reviewed rather than blindly creating additional active membership records.

### 5.4 Approval

Authorized reviewers shall be able to:

- Open the application.
- Review applicant information.
- Request correction or missing requirements.
- Approve.
- Reject with reason.

Significant status decisions shall be audited.

### 5.5 Member Activation

Upon final approval the system shall:

- Create or activate the member account.
- Assign the approved primary chapter.
- Generate a unique membership number.
- Create membership history.
- Send the appropriate activation notification.
- Provide secure credential setup/activation.

---

## 6. Member Account & Authentication

The platform shall support:

- Secure login.
- Logout.
- Email verification where applicable.
- Account activation.
- Forgot/reset password.
- Secure session management.
- Account/session invalidation.
- Protection against repeated invalid login attempts.
- Appropriate authentication security audit events.

Passwords shall never be stored in plaintext.

Future enhancements may support passkeys and device authentication without changing the core membership identity model.

---

## 7. Member Profile

The member record shall support appropriate information including:

- Unique membership number.
- Full name.
- Profile photo.
- Primary chapter.
- Membership category where implemented.
- Membership status.
- Date of membership/initiation where applicable.
- Current chapter position(s).
- Approved contact information.
- Membership history.
- Chapter transfer history.
- Certificate history.
- Financial/payment history through separate authorized views.

Members may edit only fields specifically permitted by organization policy.

---

## 8. Unique Membership Number

Each approved member shall receive a unique organization-wide membership identifier.

Requirements:

- Unique across Psi Sigma Phi Philippines Inc.
- Never reused for another member.
- Searchable by authorized administrators.
- Suitable for use on certificates and future Digital Member ID.
- Format configurable before final production numbering is established.

---

## 9. Chapter Management

National/System Administrators shall be able to create and maintain chapters.

A chapter record may include:

- Unique chapter code.
- Chapter name.
- Chapter logo.
- Founding date.
- Address/contact details.
- Description.
- Status.
- Administrators.
- Organization structure.
- Financial configuration.

Supported chapter states shall include Active, Inactive, Suspended, and Archived.

Changing chapter status shall never destroy historical membership or financial records.

---

## 10. Chapter Organization

Each chapter may have a different organizational hierarchy.

The system shall allow authorized administrators to:

- Create custom positions.
- Define hierarchy/parent relationships.
- Assign members to positions.
- Define term start/end dates.
- End and replace assignments.
- Preserve historical officer assignments.
- Create committees.
- Assign committee membership.
- Associate system permissions independently from the display title.

No single officer structure shall be hardcoded across all chapters.

---

## 11. Member Transfer / Chapter Reassignment

Authorized administrators may transfer a member between chapters.

The system shall preserve:

- Previous chapter.
- New chapter.
- Effective date.
- Reason.
- Authorizing administrator.
- Historical membership relationship.

Transfer shall not erase prior chapter history.

---

## 12. Community Feed

The platform shall provide a controlled member community feed.

Authorized members may:

- Create posts.
- Add text.
- Upload permitted images.
- View posts within their authorized audience.
- Comment on permitted posts.
- Edit/delete their own content where policy permits.

Administrators with moderation permission may:

- Pin official content.
- Hide/remove inappropriate content.
- Disable or restrict interactions where implemented.
- Audit significant moderation actions.

### 12.1 Post Audience

Initial audiences:

- **Chapter:** visible only to authorized members of the relevant chapter.
- **National:** visible to authorized members across chapters.
- **Administrative announcement:** official content with defined audience.

Audience enforcement shall occur server-side.

---

## 13. Image Uploads

Image uploads for member posts/events shall implement:

- Approved formats only.
- File-size limits.
- File/content validation.
- Secure storage.
- Image optimization where appropriate.
- Authorization controls.
- Safe deletion lifecycle.

Executable or arbitrary active content shall not be accepted as an image.

---

## 14. Comments

Members may comment only on content they are authorized to view.

Comments shall include appropriate author and timestamp information. Owners may delete their comments where permitted. Moderators may hide/remove content according to policy, and significant moderator actions shall be auditable.

---

## 15. Announcements

Authorized administrators shall support National or Chapter announcements with appropriate fields including title, body, image/attachment where permitted, target audience, effective date, expiry date, and pinned status.

Potential classifications include general, membership, event, financial, and urgent advisory.

---

## 16. Events

The system shall support National and Chapter events.

Event information may include:

- Title.
- Description.
- Date/time.
- Venue.
- Organizer.
- Image.
- Audience.
- Publication status.

Initial states may include Draft, Published, Completed, and Cancelled.

Future phases may add RSVP and QR attendance.

---

## 17. Chapter Monthly Dues / Fund

Each chapter may configure a different monthly contribution amount.

The amount shall **not** be globally hardcoded.

Example concept:

- Chapter A: one monthly rate.
- Chapter B: a different monthly rate.
- Chapter C: another rate.

Rates shall be effective-dated so a later rate change does not modify historical assessments.

---

## 18. Assessment Types

The financial engine shall support configurable assessment types including, where approved:

- Monthly Chapter Dues.
- National Dues.
- Membership Fee.
- Special Assessment.
- Event Contribution.
- Donation.
- Other Collections.

Assessments shall support chapter, amount, coverage period, due date, applicable members, and status.

---

## 19. Member Ledger

Each member shall have a traceable financial ledger showing relevant charges, payments, adjustments, refunds, reversals, references, coverage, dates, and balances.

Financial history shall be append/trace oriented. Posted history shall not be silently deleted or overwritten.

---

## 20. PayMongo Online Payment

The platform shall integrate with PayMongo for online payment.

Logical flow:

`Member selects payable assessment → Internal pending transaction created → PayMongo checkout/payment flow → Trusted server-side confirmation/webhook → Payment posted → Ledger updated → Receipt generated → Member notified`

### 20.1 Payment Integrity Requirements

- PayMongo secret keys are server-only.
- The browser redirect is not authoritative payment confirmation.
- Payment success is based on trusted server-side PayMongo state/event processing.
- Gateway event processing must be idempotent.
- Repeated webhook delivery must not create duplicate payments or ledger postings.
- Internal and gateway transaction references must be stored.
- Corrections/refunds/reversals must remain traceable.

### 20.2 Production URL

Approved production callbacks/webhooks and generated links shall use the canonical production origin:

`https://psp.hoahub.tech`

Final route paths shall match implemented routes before PayMongo production configuration.

---

## 21. Digital Receipt

Successful payments shall create a digital receipt containing appropriate information including:

- Organization/chapter.
- Member name/membership number.
- Unique receipt number.
- Internal/gateway reference.
- Purpose/assessment.
- Coverage period where applicable.
- Amount.
- Payment date.
- Payment method/channel where available.
- Status.

Receipt numbering shall be unique and traceable.

---

## 22. Payment Reconciliation

Authorized finance roles shall have a reconciliation view for statuses such as Pending, Paid, Failed, Cancelled, Refunded, or Partially Refunded as implemented.

The view shall support transaction references, member, chapter, assessment, amount, date, and receipt information.

---

## 23. Certificate of Membership

Eligible approved members shall be able to download a digitally generated Certificate of Membership.

The certificate may include:

- Official Psi Sigma Phi Philippines Inc. seal.
- Chapter identity where appropriate.
- Member full name.
- Membership number.
- Chapter.
- Membership status.
- Membership/initiation date where applicable.
- Unique certificate number.
- Issue date.
- Authorized signatories.
- QR verification code.

---

## 24. Certificate Eligibility

Eligibility rules shall be configurable. Potential rules include:

- Approved membership.
- Active status.
- Required profile completeness.
- Financial-good-standing requirement only when explicitly configured.

Financial good standing shall not be permanently hardcoded as a certificate requirement unless approved by organization policy.

---

## 25. QR Certificate Verification

Each certificate shall use a unique verification token/identifier and QR code.

Production QR codes shall resolve under:

`https://psp.hoahub.tech`

Public verification shall show only the minimum appropriate information, such as:

- Certificate validity.
- Member name.
- Membership number where approved for public display.
- Chapter.
- Certificate number.
- Issue date.

Internal database identifiers and unnecessary personal information shall not be exposed.

Certificate lifecycle shall support Valid, Revoked, Superseded, and Expired if expiry is later enabled.

---

## 26. Member Dashboard

The Member PWA dashboard shall prioritize:

- Digital membership card.
- Membership number.
- Chapter.
- Membership status.
- Outstanding balance.
- Current dues.
- Pay Dues quick action.
- My Certificate quick action.
- Upcoming events.
- Latest announcements.
- Community activity.
- Recent payment/receipt information.

---

## 27. Chapter Admin Dashboard

Authorized Chapter users shall see chapter-scoped indicators such as:

- Total/active/inactive members.
- Pending applicants.
- Current officers.
- Current assessments.
- Amount billed.
- Amount collected.
- Outstanding balances.
- Collection rate.
- Upcoming events.
- Latest content/moderation activity.

All indicators shall respect the authorized chapter scope.

---

## 28. National / System Admin Dashboard

Authorized National users may see organization-wide indicators including:

- Total/active chapters.
- Total membership.
- Membership by chapter.
- New/pending applications.
- Active/inactive membership.
- Authorized financial summaries.
- Chapter collection comparisons.
- National events/announcements.
- Audit/security indicators where authorized.

---

## 29. Member Directory

Authorized users shall be able to search appropriate membership information by criteria such as member name, membership number, chapter, position, and status.

Personal contact information shall not automatically be visible to all members.

---

## 30. Notifications

Initial notification channels:

- In-app.
- Email.

Potential triggers include:

- Registration received.
- Correction required.
- Application approved/rejected.
- Account activation/security event.
- Announcement.
- Event.
- Dues reminder.
- Payment success/failure.
- Certificate availability.
- Comment activity.

Future phases may add web push and SMS where approved and supported.

---

## 31. Reporting

### 31.1 National Reports

Examples:

- Membership by chapter.
- Active/inactive membership.
- Registration/application report.
- Chapter growth.
- Chapter directory.
- Authorized collection by chapter.
- Outstanding dues by chapter.
- PayMongo transaction/reconciliation report.
- Certificate issuance report.
- Event report.

### 31.2 Chapter Reports

Examples:

- Member list.
- Membership status.
- Pending applications.
- Officers.
- Dues/assessment report.
- Collection report.
- Outstanding balances.
- Payment history.
- Event report.

### 31.3 Member Statements

Members shall be able to access appropriate personal payment history, statement of account, digital receipts, and certificate history.

Exports must preserve authorization and privacy controls.

---

## 32. Role-Based Access Control

Permissions shall be configurable and scoped.

Authorization model:

`Authenticated User + Role + Permission + Chapter Scope + Record Ownership (where applicable)`

Authorization shall be enforced on the server. Hiding a frontend control does not constitute authorization.

---

## 33. Chapter Data Isolation

Chapter-scoped users must not retrieve another chapter's restricted data through:

- Normal UI navigation.
- Direct API calls.
- URL/object-ID manipulation.
- Search.
- Exports.
- Reports.
- File/media URLs.
- Payment endpoints.

National cross-chapter access shall require explicit National/System permission.

---

## 34. Audit Log

Sensitive operations shall produce audit records as applicable, including:

- Authentication/security events.
- Membership approval/rejection/status changes.
- Member transfer.
- Chapter creation/configuration/status changes.
- Officer assignments.
- Role/permission changes.
- Assessment/rate changes.
- Financial adjustments/reversals.
- Payment reconciliation actions.
- Certificate issuance/revocation.
- Content moderation.

Audit logs shall not be editable by normal administrators.

---

## 35. PWA Requirements

The Member Portal shall be delivered as an installable PWA.

Mandatory capabilities:

- Web App Manifest.
- Service Worker.
- Standalone display where supported.
- Android installation support.
- iPhone/iPad Add-to-Home-Screen guidance.
- Branded app icon.
- Responsive layouts.
- Safe-area handling.
- Portrait/landscape support.
- Touch-friendly controls.
- Controlled offline shell behavior.
- Application update handling.

The installed PWA shall not bypass authentication or authorization.

---

## 36. Responsive Requirements

The UI shall fluidly support phones, tablets, laptops, desktops, and wide screens.

Reference design ranges:

- Mobile: below 768px.
- Tablet: 768–1023px.
- Laptop: 1024–1439px.
- Desktop/wide: 1440px and above.

These ranges are implementation guidance and not rigid device assumptions.

No critical workflow may depend on desktop-only behavior.

---

## 37. Mobile-Complete Workflows

The following must work end-to-end from a supported smartphone:

- Online registration.
- Account activation/login/recovery.
- Member dashboard/profile.
- Chapter/officer view.
- Announcements/events.
- Post creation/image upload.
- Comments.
- Dues/balance viewing.
- PayMongo payment.
- Payment receipt/history.
- Certificate viewing/downloading.
- QR verification.
- Notifications.

---

## 38. Offline / Cache Rules

Static application resources may be cached for performance and resilience.

The PWA shall never:

- Mark payment successful based on cached browser state.
- Post a financial transaction while offline.
- Display cached financial state as guaranteed current without appropriate indication.
- Cache sensitive API/auth/payment responses indiscriminately.

Financial writes require live server connectivity.

---

## 39. Security Requirements

At minimum:

- HTTPS in production.
- Secure password hashing.
- Server-side session validation.
- Appropriate CSRF protection.
- Secure session cookies where applicable.
- Input validation.
- Output/XSS safety.
- Rate limiting on abuse-prone public/auth endpoints.
- IDOR/BOLA protection.
- Least-privilege RBAC.
- Secure file upload validation.
- Environment/secret-store handling for credentials.
- Audit logging.
- Runtime dependency vulnerability control.
- Backup and tested restore before go-live.

No database credential, PayMongo secret key, SMTP password, auth secret, or private key shall be committed to GitHub.

---

## 40. Data Privacy

The platform shall be designed for appropriate Philippine privacy obligations, including:

- Legitimate purpose and purpose limitation.
- Data minimization.
- Access controls.
- Appropriate notices/consent where required.
- Secure storage/transmission.
- Retention/deletion policy.
- Privacy-safe reports/exports.
- Incident handling.

Member personal information shall not automatically become public data.

---

## 41. Performance & Usability

The system shall support:

- Efficient paginated/searchable member lists.
- Server-side filtering for large datasets.
- Responsive image delivery.
- Appropriate loading/empty/error states.
- Duplicate-submission prevention.
- Usability under typical Philippine mobile network conditions.

---

## 42. Integration Requirements

Initial integrations:

- PayMongo.
- Email service/SMTP.
- QR generation and verification.
- PDF certificate/receipt generation.
- Secure object/media storage.

Business/domain logic shall not be tightly coupled to one infrastructure vendor.

---

## 43. Hosting & Production Domain

Production target:

- **Hosting:** Hostinger.
- **Canonical URL:** `https://psp.hoahub.tech`.

Production-generated links, PWA metadata, payment return/webhook configuration, email links, receipts, and certificate verification URLs shall use the canonical origin unless explicitly changed by the product owner.

Production deployment is controlled and requires explicit approval after QA/security validation.

---

## 44. MVP Scope

Initial production MVP shall target:

1. Public organization website.
2. Online registration.
3. Membership review/approval.
4. Secure login/account recovery.
5. Member profile and membership number.
6. Chapter management.
7. Configurable chapter organization/officers.
8. Server-side RBAC/chapter scoping.
9. Member PWA dashboard.
10. Announcements/events.
11. Community posts/images/comments.
12. Chapter monthly dues and other assessments.
13. Member ledger/balance.
14. PayMongo payment.
15. Digital receipts/payment history.
16. Certificate of Membership.
17. QR certificate verification.
18. Chapter/National reporting.
19. Audit logs.
20. Responsive/PWA installation experience.

---

## 45. Future Roadmap

Future approved enhancements may include:

- Digital QR Member ID.
- Event RSVP.
- QR event attendance.
- Push notifications.
- Passkeys/biometric device sign-in.
- Elections/voting.
- Donations/fundraising campaigns.
- Merchandise ordering.
- Chapter/National document repository.
- Photo albums.
- Advanced analytics.
- AI member assistant restricted to authorized organization/chapter information.

---

## 46. Core Acceptance Criteria

The MVP shall not be production-ready until at least the following are validated:

1. National/System Admin can create a chapter and assign a Chapter Administrator.
2. Each chapter can maintain a different organization structure.
3. Applicant can complete registration from mobile.
4. Registration requires review before active membership.
5. Approved applicant receives a unique membership number/account activation.
6. Member can securely login from mobile/PWA.
7. Chapter-scoped users cannot retrieve another chapter's restricted data.
8. Authorized National roles can access approved cross-chapter information.
9. Member can view/post/comment according to audience rules.
10. Administrators can publish announcements/events.
11. Chapter can configure its own effective-dated monthly contribution rate.
12. System generates correct member assessments without rewriting history after rate changes.
13. Member can complete PayMongo payment from mobile.
14. Payment success is confirmed server-side.
15. Duplicate PayMongo events cannot create duplicate financial postings.
16. Successful payment updates ledger and creates a unique receipt.
17. Member can view payment history.
18. Eligible member can download Certificate of Membership.
19. Certificate receives a unique number and QR verification token.
20. Revoked certificate remains historically traceable.
21. Sensitive administrative/financial operations are audited.
22. Core flows work at supported mobile/tablet/desktop sizes.
23. PWA can be installed where browser/device support permits.
24. Production deployment uses `https://psp.hoahub.tech`.

---

## 47. Product Vision

The target is not merely an informational website. It is the official Psi Sigma Phi Philippines Inc. digital membership ecosystem:

`Register → Verify → Approve → Assign Chapter → Connect → Organize → Publish Events → Assess Dues → Pay Online → Issue Receipt → Issue Certificate → Verify → Report → Audit`

One national platform shall connect the organization while preserving appropriate chapter identity, authority, and financial separation.
