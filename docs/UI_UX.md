# PSP UI / UX Standards

## Brand

- Gold `#FEC009`
- Black `#000000`
- Charcoal `#151515`
- White `#FFFFFF`
- Official Psi Sigma Phi Philippines Inc. seal is the primary brand mark.

The member experience should feel premium, disciplined and fraternity-specific rather than like a generic admin portal.

## Product Experience Principle

The **member product is PWA-first/mobile-first**. A member must be able to complete the normal lifecycle without a desktop computer.

Desktop/tablet layouts may expand content, but they must not be prerequisites for member registration, activation, passkey, profile, Digital ID, chapter/officers, payment, receipts or certificate.

## Responsive Reference Ranges

- Mobile: `<768px`
- Tablet: `768–1023px`
- Laptop: `1024–1439px`
- Desktop/Wide: `>=1440px`

Use fluid layouts rather than device-specific assumptions. Support portrait/landscape and CSS safe-area insets.

## Login / Authentication UX

The public PSP sign-in screen must make the available authentication methods obvious without presenting multiple competing primary actions.

- Use the official PSP seal and premium black/charcoal/white/gold visual system.
- The page hierarchy is `Welcome to PSP` → short helper text → sign-in method → selected method fields/action → recovery/registration/support links.
- On passkey-capable devices, show `Email & Password` and `Use Passkey` as a clear segmented/tab control rather than stacking two equal primary sign-in buttons.
- Email/password remains the default for a device that has not previously enabled a PSP passkey.
- A device that previously enabled a PSP passkey may prioritize the passkey tab, but an explicit `Use email & password instead` fallback must remain available.
- Password fields use a visibility toggle and preserve password-manager autocomplete semantics.
- `Forgot password?` must remain visible in the password flow.
- `Apply online` remains visible for new applicants.
- Access-help copy should direct members to their Chapter Administrator without implying that support bypasses authentication.
- Login errors must use an accessible live alert and must not expose sensitive authentication details.
- Keyboard focus must be highly visible; primary controls remain touch-friendly on mobile.
- The login card must fit phone widths without horizontal overflow and must respect reduced-motion preferences.
- Visual redesign must never change server authorization, session, password, passkey, origin/CSRF, or post-login routing authority.

Detailed implementation tracker: `LOGIN_UX_REDESIGN_2026-09-04.md`.

## Professional Administration Shell

National and Chapter Administration use one consistent responsive application shell while retaining server-enforced RBAC and chapter scope.

- sticky black/gold PSP administration header with official seal;
- visible National vs Chapter Administration context;
- visible current chapter scope when the administrator is chapter-scoped;
- navigation is permission-filtered for convenience only; server authorization remains authoritative;
- desktop/laptop uses compact navigation while tablet/mobile uses a touch-friendly menu;
- controls use a minimum comfortable height around 44–48px;
- forms use consistent labels, spacing, focus rings, borders and disabled/busy states;
- cards use a consistent surface, radius, border and restrained elevation hierarchy;
- Finance and Operational Reports tables transform into labeled stacked record cards below 768px instead of forcing desktop-width data presentation;
- dense desktop tables remain horizontally navigable when a table genuinely requires all columns.

The admin experience should feel like a production-grade institutional operations system, not a collection of browser-default forms.

## Member Administration Actions

The Member Directory exposes privileged actions only when the authenticated administrator has server-backed `members.manage` authority for the member's exact chapter. National/System Admin may manage across chapters through national scope; Chapter Admin remains chapter-scoped.

- **Resend Invitation** appears only while an approved active membership still requires account activation.
- Resend does not expose the activation token in the UI; it triggers a new secure email invitation and shows delivery success/failure status.
- **Delete Member** requires an explicit confirmation explaining that PSP uses non-destructive archival rather than erasing historical records.
- Delete Member removes active chapter access, archives membership, revokes Digital Member ID and valid certificates, and retains finance/audit/history evidence.
- Administrator self-deletion is visibly disabled to prevent lockout.
- All privileged buttons must disable while requests are in flight to prevent duplicate execution.
- Archived members are removed from the normal active directory while remaining available to authorized reporting/audit workflows.

## Member Home — Required Information Hierarchy

The mobile member home should expose within the initial journey:

1. member identity + membership number;
2. chapter;
3. outstanding balance;
4. total confirmed contributions;
5. Pay Now;
6. Digital Member ID;
7. Certificate;
8. Receipts;
9. My Chapter / officers;
10. Profile / Passkey security;
11. Install App;
12. announcements/events/notifications.

Critical functions must not be buried in a desktop-only side menu.

## Primary Mobile Navigation

Current member bottom navigation prioritizes:

- Home
- Digital ID
- Payments
- Chapter / Receipts depending on current context
- More/Profile

Secondary actions include community, events, notifications, certificate, receipts, passkey and PWA installation through dashboard quick actions/contextual links.

## Digital Member ID

- Designed as a phone-first membership card.
- Member name, number, chapter and current validity must be legible at normal phone zoom.
- QR must be large enough to scan from another device.
- Verification page must clearly distinguish valid vs invalid/revoked state.
- Public verification must avoid unnecessary personal contact/private data.

## Certificate

- Member can generate/open/download from phone.
- Chairman signatory is clearly visible on PDF.
- QR verification is visually explained.
- Verification page uses concise valid/status treatment and minimum identity disclosure.

## Member Finance / Split Payment UX

Member must clearly understand three distinct values before final payment confirmation:

- **Chapter amount**
- **Platform convenience fee**
- **Total to pay**

Never hide or blend the convenience fee into the chapter amount.

Payment method choices are touch-friendly:

- QR Ph
- GCash
- Maya

### QR Ph

- render PayMongo QR inside the mobile PWA;
- show total + current status;
- poll internal PSP payment status while open;
- when confirmed, show receipt link;
- do not imply PAID before signed webhook confirmation.

### GCash / Maya

- disclose fee/total and obtain member confirmation before creating/attaching payment intent;
- then redirect to provider authorization as required;
- return page/status must clearly explain that PSP waits for gateway confirmation.

### Payment history

On mobile, use stacked cards rather than a wide finance table. Each record should expose type/purpose, status, total paid, chapter amount, platform fee and receipt where available.

## Receipts

Receipt list and detail must be usable at phone width.

Detail clearly separates:

- chapter amount;
- platform convenience fee;
- total paid.

The member should not be able to mistake platform fee for dues/contribution paid to the chapter.

## Passkey UX

- Enrollment lives in account/profile security.
- Explain that passkey may use device biometrics/PIN depending on OS.
- Once a passkey is successfully enabled on the current device, login prioritizes passkey and hides email/password fields by default.
- Provide an explicit recovery/password fallback; do not permanently trap the user in passkey-only UI.
- Error states must distinguish unsupported browser/device vs failed verification where possible without exposing security-sensitive detail.

## PWA Installation

- `/install` is the canonical member installation guide and may be linked from approval welcome email.
- Android/Chromium: use browser install prompt when available.
- iOS/iPadOS: explain Safari Share → Add to Home Screen.
- In standalone mode, avoid repeatedly showing install banners.
- Update-ready state should provide a clear refresh action.

## Forms

- Native input modes (`email`, `tel`, numeric/date where appropriate).
- Break long registration into understandable steps.
- Preserve values on validation failures.
- Field-level + concise form-level error status.
- Disable duplicate submissions while requests are in flight.
- Minimum comfortable mobile controls around 44–48px height.
- Never make protected fields editable merely because they are displayed in a form.

## Tables / Admin

Member core flows should avoid horizontal tables. Admin reporting/reconciliation may use larger tables on wide screens but must remain navigable on tablets/narrow screens; stacked records are preferred when columns become unusable.

For high-density Finance and Operational Reports screens, use semantic tables on wide displays and labeled card-style rows below the mobile breakpoint. Do not make a phone user zoom a desktop table to perform normal admin review.

## Accessibility

- keyboard accessible controls;
- semantic labels/headings;
- visible focus states;
- sufficient contrast;
- no hover-only critical actions;
- touch-friendly hit areas;
- status/error messaging uses appropriate live-region/role semantics;
- respect `prefers-reduced-motion`.

## PWA / Cache Safety

- standalone mode where supported;
- manifest + service worker;
- safe-area handling for notches/gesture bars;
- no uncontrolled horizontal overflow;
- private/auth/member/payment/API/certificate content must not become authoritative offline cache state;
- offline mode must never fabricate successful payment/credential/member status.

## Member Mobile P0 Device Acceptance

Before closure, perform real-device smoke for:

- Android Chrome installed PWA;
- iOS Safari Add to Home Screen installed PWA;
- small and normal phone widths;
- portrait and landscape;
- dashboard/card navigation;
- Digital ID QR rendering/scanning;
- payment fee preview + QR payment display;
- receipt detail/PDF access;
- certificate generation/QR;
- profile editing protections;
- passkey enrollment/login;
- safe-area bottom navigation;
- no uncontrolled horizontal overflow.
