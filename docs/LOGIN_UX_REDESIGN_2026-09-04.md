# PSP Login UX Redesign — Work Tracker

**Date:** 2026-09-04  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Branch:** `feat/login-ux-redesign-2026-09-04`  
**Base main SHA:** `8bad0851c3fea15bb4f12687be0788ce7fe6e943`

## Objective

Replace the confusing stacked Passkey/password login treatment with the approved premium PSP login design while preserving all existing authentication, passkey, recovery, RBAC, routing and security behavior.

## Approved UX Direction

- premium PSP black/charcoal/white/gold visual treatment;
- centered responsive sign-in card with official PSP seal;
- concise `Welcome to PSP` heading and helper copy;
- explicit sign-in method selection rather than competing stacked actions;
- `Email & Password` and `Use Passkey` presented as a clear segmented/tabs control on supported devices;
- password form remains the default for devices without a previously enabled PSP passkey;
- previously enabled passkey devices continue to prioritize passkey while retaining an explicit password fallback;
- labeled email/password fields with clear focus states;
- password visibility control;
- prominent gold `Sign In` / passkey action;
- `Forgot password?`, `Apply online`, and access-support guidance remain visible;
- responsive mobile/desktop layout with no uncontrolled horizontal overflow;
- reduced-motion support and accessible focus/error semantics.

## Authentication Behavior Preserved

- `/api/auth/login` remains the email/password authority;
- WebAuthn passkey authentication continues through the existing options/verify endpoints;
- successful sign-in still resolves the authenticated context before routing;
- national administrators still route to `/admin` and normal member context routes to `/member` under the existing rule;
- passkey availability is feature-detected in the browser;
- local passkey preference remains device-local and never changes server authorization;
- password recovery remains at `/forgot-password`;
- registration remains at `/register`;
- no authentication secret, credential or token is exposed by the redesign.

## Implementation

- `src/app/login/page.tsx` — new page hierarchy, premium branded shell, support/footer content.
- `src/components/auth/login-form.tsx` — explicit authentication-method tabs, passkey panel, password visibility toggle and preserved authentication calls.
- `src/app/login/login.module.css` — responsive login visual system, focus states, mobile treatment and reduced-motion handling.
- `src/lib/release.ts` — target release `2026-09-04-r7` / `2026-09-04-login-ux-v1`.
- `.github/workflows/ci.yml` — exact r7 marker plus rendered login-content assertions.
- `.github/workflows/production-smoke.yml` — exact r7 marker plus public `/login` content assertions.

## Acceptance Criteria

1. exact final PR head passes strict TypeScript, production build, runtime/security smoke, cross-chapter isolation and fail-closed dependency audit;
2. `/login` renders `Welcome to PSP`, `Email & Password`, and `Use Passkey` on the exact candidate build;
3. email/password sign-in flow remains functional;
4. passkey flow remains functional on supported devices;
5. passkey-enabled devices prioritize passkey but retain an explicit password fallback;
6. keyboard focus, error messaging, mobile layout and reduced-motion behavior remain accessible;
7. merge only the exact passing PR head;
8. post-merge PSP CI passes;
9. Production Smoke observes exact `r7 / login-ux-v1` and validates the redesigned `/login` content before production is called deployed.

## Current State

Implementation is code-complete on the feature branch. It is **not merge-eligible and not production-proven** until the final documentation-reconciled head passes the complete PSP CI gate set.
