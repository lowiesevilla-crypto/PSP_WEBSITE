# UI / UX Standards

## Brand

- Gold `#FEC009`
- Black `#000000`
- Charcoal `#151515`
- White `#FFFFFF`
- Official Psi Sigma Phi Philippines Inc. seal is the primary brand mark.

## Experience

The platform is mobile-first and installable as a PWA. Member workflows must never require a desktop computer.

## Responsive Reference Ranges

- Mobile: `<768px`
- Tablet: `768–1023px`
- Laptop: `1024–1439px`
- Desktop/Wide: `>=1440px`

Use fluid layouts rather than device-specific assumptions.

## Member Navigation

Primary mobile navigation:

- Home
- Community
- Events
- Payments
- More

`More` includes Chapter, Certificate, Profile, Notifications, Settings, and Logout.

## Core Mobile Acceptance

A member can complete registration, login/activation, profile management, post/comment, event viewing, dues payment, receipt viewing, and certificate download from a phone.

## Forms

- Use native input modes (`email`, `tel`, `date`, numeric where appropriate).
- Break long registration forms into clear steps.
- Preserve entered values when validation fails.
- Show field-level validation plus a concise form-level status.
- Prevent duplicate submissions while a request is in flight.

## Tables

Admin tables must become cards/stacked records on narrow screens where columns would otherwise create unusable horizontal scrolling.

## Accessibility

- Keyboard accessible controls.
- Visible focus states.
- Semantic labels and headings.
- Sufficient contrast.
- No hover-only critical actions.
- Touch targets suitable for mobile use.

## PWA

- Standalone display mode where supported.
- Android install prompt when browser permits.
- iOS Add-to-Home-Screen guidance.
- Safe-area padding for notches/gesture bars.
- Service worker must not cache sensitive payment/authentication/API state as authoritative offline data.
