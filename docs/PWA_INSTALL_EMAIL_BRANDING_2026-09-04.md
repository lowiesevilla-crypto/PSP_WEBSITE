# PSP PWA Install + Email Branding — 2026-09-04

**Branch:** `feat/pwa-install-email-branding-2026-09-04`  
**PR:** #24  
**Base main:** `c643791273ba4a233a530526cf9a34e9c333b218`  
**Target release:** `2026-09-04-r8`  
**Target generation:** `2026-09-04-pwa-email-branding-v1`

## Objective

Remove ambiguity from the PSP mobile installation experience and make PSP email communications consistently professional and chapter-aware without weakening authentication, chapter isolation, or production release controls.

## PWA Install Behavior

PSP remains an installable Progressive Web App. The website does not distribute a sideloaded APK/IPA and must not pretend that a normal web link can silently install software.

Implemented behavior:

- one stable PWA identity remains defined by manifest `id: "/"`;
- the global PWA registration layer captures the Chromium `beforeinstallprompt` event and shares it with the dedicated `/install` page instead of racing/consuming it independently;
- `/install` always presents the primary **Install PSP App** action;
- when the browser exposes the native install prompt, one tap opens the platform/browser confirmation immediately;
- Android/Chromium manual install guidance is shown when the native prompt is unavailable;
- iPhone/iPad correctly explains Safari → Share → Add to Home Screen because iOS does not permit silent PWA installation;
- `appinstalled` and standalone state are observed;
- successful installation is remembered locally for clearer UX and the installer page switches to an already-installed state;
- no change is made to the PWA manifest identity that could intentionally create a second PSP app identity;
- CI and Production Smoke assert the stable manifest ID and rendered installer content.

## Email Branding

All email sent through the shared PSP mailer now receives a common responsive PSP HTML shell:

- official PSP black / charcoal / white / gold identity;
- PSP seal or Chapter logo;
- `Ψ Σ Φ` identity;
- Chapter name when a member/application belongs to a Chapter;
- PSP national fallback when no Chapter logo exists;
- professional content card and PSP security footer;
- plaintext alternative remains present.

Chapter-aware workflows covered:

- approved member welcome / activation email;
- administrator **Resend Invitation** email;
- membership application correction / pending requirements / rejection email;
- active member password-reset email.

The welcome/invitation email contains:

- member display name;
- Chapter name;
- Membership Number;
- login email;
- secure activation button when activation is required;
- explicit 24-hour activation expiry;
- explicit statement that PSP does not send a temporary/plaintext password;
- member-created password flow;
- PSP Mobile App installation action;
- current Chapter Chairman name/title;
- Chapter reply-to address when configured.

## Chapter Logo Management

Implemented a scoped Chapter-branding workflow:

- Chapter logo upload is available from Chapter Management to an actor with `content.manage` for that exact Chapter;
- System/National Admin is permitted by national scope;
- Chapter Admin is permitted only for an assigned Chapter where existing `content.manage` scope is valid;
- JPG, PNG and WEBP are accepted through the existing byte-signature validated image-storage service;
- maximum image size remains governed by `MAX_IMAGE_UPLOAD_BYTES` / 5 MB default;
- uploaded file is stored under the private runtime storage abstraction and represented by a `private:` reference in `Chapters.logoUrl`;
- a dedicated public read-only Chapter-logo endpoint exposes only the configured branding image for email/UI rendering;
- removal returns the Chapter to the official PSP national logo fallback;
- old private Chapter-logo files are removed after successful replacement/removal;
- upload/removal actions are audit logged;
- no arbitrary storage path is accepted from the client.

Public logo route:

`/api/public/chapters/[id]/logo`

If no private Chapter logo exists or the stored file cannot be read, the endpoint redirects to `/brand/psp-logo.jpg`.

## Security / Isolation

- logo writes require authenticated `content.manage` authorization against the exact Chapter ID;
- Chapter Admin cannot update another Chapter's logo through client-supplied IDs;
- image bytes are validated as JPG/PNG/WEBP rather than trusting MIME/filename alone;
- storage path containment remains enforced by `src/lib/storage/private-media.ts`;
- only the branding image is intentionally public; community/announcement/event private media remains authenticated/scoped;
- email templates continue escaping dynamic user/Chapter values;
- activation/password-reset tokens remain only inside the intended recipient email link and are not returned to admin UI/logs.

## Release Evidence

Final merge eligibility requires:

1. final exact PR #24 head passes every PSP CI gate;
2. unresolved review threads = none;
3. merge uses `expected_head_sha` equal to that exact passing head;
4. post-merge PSP CI on `main` passes;
5. Production Smoke observes exact `2026-09-04-r8 / 2026-09-04-pwa-email-branding-v1` and passes public installer/PWA/security/readiness checks.

Production email rendering with a real Chapter logo and real mobile installation remain controlled acceptance items requiring representative credentials/device/email evidence; automated source/CI evidence does not substitute for those external checks.
