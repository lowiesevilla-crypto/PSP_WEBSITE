# PSP UI / UX Standards

## Brand & Experience

Primary PSP palette:

- Gold `#FEC009`
- Black `#000000`
- Charcoal `#151515`
- White `#FFFFFF`

Use the official Psi Sigma Phi Philippines Inc. seal as the primary national brand mark. The experience should feel institutional, premium, disciplined, mobile-first, and fraternity-specific—not like a generic browser-admin form collection.

## Responsive Product Principle

The Member product is PWA-first/mobile-first. Normal member lifecycle must not require a desktop computer.

Reference ranges:

- Mobile: `<768px`
- Tablet: `768–1023px`
- Laptop: `1024–1439px`
- Desktop/Wide: `>=1440px`

Use fluid layouts, portrait/landscape support, safe-area insets, visible keyboard focus, touch targets around 44–48px+, and no uncontrolled horizontal overflow.

## Professional Administration Shell

National and Chapter Administration share one responsive application shell while server RBAC/Chapter scope remains authoritative.

- sticky PSP institutional navigation;
- visible National vs Chapter context;
- current Chapter scope visible for Chapter-scoped administrators;
- permission-filtered navigation for convenience only;
- consistent form spacing, labels, controls, busy/disabled states, validation, panels, borders and elevation;
- compact desktop navigation and touch-friendly tablet/mobile navigation;
- destructive or privileged actions explain impact and prevent duplicate submission.

## PSP Administration Table Standard

High-density registers use this standard unless a detail/card workflow is intentionally more appropriate:

- **server-driven pagination** for unbounded business records; never silently truncate with fixed `take` limits;
- default page size around 20–25;
- search by relevant human identifiers such as name, member number, email, Chapter/code, title, certificate number;
- filters for Chapter/status/category/lifecycle where applicable;
- URL query parameters preserve search/filter/page state across refresh/back/forward;
- explicit result count and `Page X of Y`;
- Previous/Next controls disabled at boundaries;
- desktop/tablet uses semantic `<table>` headers and rows;
- below 768px, `.admin-responsive-table` transforms each row into a labeled record card using cell `data-label` values;
- mobile actions remain usable without horizontal scrolling;
- empty states reflect active filters/search;
- every query/write reapplies server permission and Chapter scope.

Current covered registers include:

- Member Directory / Members;
- Users;
- Chapter Management;
- Organization Officer/Committee histories;
- Finance Payments;
- Finance Member Balances;
- Effective-Dated Rates;
- Assessments;
- Certificate register.

## Member Administration

Member Directory exposes privileged actions only with exact server-backed `members.manage` authority.

Admin Edit:

- allowed profile/contact/member details are editable within exact scope;
- membership number is not a generic-edit field;
- login email/credential identity is not silently changed;
- Chapter transfer remains the separate audited transfer workflow;
- archived/deleted records remain history-preserving;
- changes use clear edit/save/cancel UX and disable duplicate submission.

Resend Invitation:

- appears only while an approved active membership still requires activation;
- never exposes activation token;
- reports delivery success/failure.

Delete/Archive:

- requires explicit confirmation;
- explains non-destructive archival;
- blocks administrator self-delete;
- preserves finance/audit/history.

## Chapter Management Workflow

Chapter Management should act as an operational launch point, not a disconnected card list.

Each Chapter row should make status, member/application counts and active administrator context clear and provide direct links to relevant Members and Finance/Payment setup where authority allows.

Chapter setup/payment readiness must expose actionable states instead of a single ambiguous checkbox.

## Member Home — Payment-First Hierarchy

The Member dashboard prioritizes:

1. member identity, membership number, Chapter;
2. outstanding balance;
3. primary `Pay Now` / `View Dues` action;
4. online-payment readiness and supported methods;
5. receipts;
6. total confirmed contributions;
7. Digital Member ID;
8. Certificates;
9. Chapter/officers;
10. Profile/Passkey security;
11. Install App;
12. announcements/events/notifications/community.

If Chapter online payment is unavailable:

- show a clear unavailable/readiness state;
- do not make the member discover the problem only after pressing Pay;
- do not start fee-preview/checkout calls;
- direct detailed remediation to authorized Chapter/National Admin Finance configuration.

## Member Finance UX

Before final confirmation show three distinct values:

- **Chapter amount**
- **Platform convenience fee**
- **Total to pay**

Never blend platform fee into Chapter dues/contribution.

Payment choices remain touch-friendly:

- QR Ph
- GCash
- Maya

QR Ph displays provider QR, total, current status and receipt link after authoritative confirmation. GCash/Maya use provider authorization/redirect flow. Browser redirect/polling never presents `PAID` as authoritative before PSP receives trusted gateway evidence.

Payment history on mobile uses stacked records rather than forcing a desktop-width table.

## Chapter PayMongo Setup UX

Admin payment configuration exposes explicit readiness states:

- `NOT CONFIGURED`
- `DRAFT · DISABLED`
- `READY TO ACTIVATE`
- `ONLINE PAYMENT ENABLED`
- `ENABLED · ACTION REQUIRED` / blocked remediation

UX rules:

- Chapter can save linked `org_*` account + methods as a disabled Draft even while PSP parent platform is unavailable;
- Draft save messaging explicitly says Online Payment remains disabled;
- child webhook is described as created/validated on activation when needed;
- platform/account/webhook/payment readiness are shown separately;
- activation blockers are human-readable but never expose secrets;
- Enable Online Payment is disabled when prerequisites are unavailable;
- failed activation leaves the saved Draft intact and disabled.

## Certificates

Member Certificate area shows all valid assigned certificates, not only one current Membership Certificate.

Admin custom certificate UX supports:

- type: Membership, Attendance, Appreciation, Recognition, Outstanding Member, Custom;
- title;
- certificate date;
- citation/text;
- event/reference;
- one, multiple, or all eligible members in exact authorized scope.

Member-facing certificate cards expose actual title/type/date with Download PDF and Verify actions. Public verification displays actual certificate metadata with minimum necessary identity disclosure.

Standard self-service Membership Certificate remains independently available and is not blocked merely because another custom certificate exists.

## Public Website — Updates & Events

The anonymous homepage provides a global organization view without exposing member/private content.

Events:

- only published event records appear;
- show National/Chapter attribution, title, readable description excerpt, date and venue.

Announcements:

- only records explicitly marked `isPublic=true` appear;
- Admin publication includes a dedicated `Show on the public PSP website` opt-in;
- Admin history clearly badges `PUBLIC WEBSITE` vs `MEMBERS ONLY`;
- existing/member-only announcements remain private by default;
- private announcement images are not exposed on the public feed merely for visual richness.

The public feed should remain readable at phone width and use responsive cards/grid rather than dense tables.

## Digital Member ID

- phone-first member card;
- readable name/number/Chapter/status;
- QR large enough for another device;
- verification clearly distinguishes valid vs invalid/revoked;
- public verification exposes minimum necessary information.

## Receipts

Receipt list/detail must work at phone width and clearly separate Chapter amount, platform fee, and total paid.

## Passkey / Login UX

Login hierarchy remains `Welcome to PSP` → helper text → sign-in method → selected fields/action → recovery/registration/support.

- Email/password and Passkey are presented as clear modes on supported devices.
- Password recovery remains visible.
- Member can always fall back from passkey to email/password.
- Errors use accessible live alerts and avoid sensitive detail.
- Visual changes never alter server session/RBAC/origin authority.

## PWA Installation

- `/install` is canonical.
- Android/Chromium uses browser install prompt when available, with browser-menu fallback.
- iOS/iPadOS explains Safari Share → Add to Home Screen.
- in-app browser limitations are explained.
- standalone mode avoids repeated install prompts.
- update-ready state offers refresh.
- manifest `id: "/"` remains stable so a new PSP release does not create a second app identity.
- release-specific deployment-generation marker distinguishes stale installer content without changing the manifest app identity.

## Forms / Async Actions

- native input modes where appropriate;
- preserve values on validation failures where practical;
- field-level + concise form-level errors;
- loading/busy state visible;
- disable duplicate submissions while requests are in flight;
- protected fields never become editable merely because displayed.

## Accessibility

- semantic labels/headings/tables;
- keyboard accessible controls;
- visible focus;
- sufficient contrast;
- no hover-only critical action;
- touch-friendly hit areas;
- status/error uses appropriate `role`/live-region semantics;
- respect reduced motion.

## PWA / Cache Safety

- private/auth/member/payment/API/certificate content must not become authoritative public offline state;
- financial writes require live connectivity;
- offline mode never fabricates successful payment, credential, membership, or certificate state.

## Device Acceptance Still Required

Automated responsive/runtime checks do not replace real devices. Final controlled acceptance still includes:

- Android Chrome installed PWA;
- iPhone/iPad Safari Add-to-Home-Screen;
- small/normal phone widths, portrait/landscape;
- payment fee/QR/receipt flows;
- custom certificate download/QR scanning;
- Digital ID QR;
- profile protections;
- passkey enrollment/login;
- safe-area bottom navigation;
- no uncontrolled horizontal overflow.
