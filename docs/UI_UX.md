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
