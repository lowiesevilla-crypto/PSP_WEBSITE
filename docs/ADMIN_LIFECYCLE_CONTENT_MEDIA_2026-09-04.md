# PSP Admin Lifecycle, User Governance, Announcement/Event Media — Work Tracker

**Date:** 2026-09-04  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Working branch:** `fix/admin-lifecycle-content-media-2026-09-04`  
**Latest implementation head before this documentation commit:** `1bdce47f4f118a3eab1ac163e81f75539d96035d`  
**Production branch:** `main`

## Objective

Close the National Admin and Chapter Admin defects/enhancements reported from production while preserving PSP RBAC, chapter isolation, auditability, non-destructive history, and mobile-responsive member presentation.

Required outcomes:

- National Admin can assign a Chapter Administrator without the browser `reset` null error.
- National Admin can activate, deactivate/inactivate, suspend, or archive a chapter without deleting history.
- National Admin can activate, invite, suspend, or disable user accounts without deleting membership/finance/audit history.
- Chapter Admin can create chapter-scoped announcements and events; National Admin retains national scope.
- Announcement and event images can be uploaded securely and are viewable responsively by authorized members.
- Changes must pass exact-head PSP CI before merge and must be verified in production after deployment.

## Completed in the Working Branch

### 1. Chapter Administrator assignment crash — CODE COMPLETE

- Fixed the async form-reset defect that produced `Cannot read properties of null (reading 'reset')` after a successful/attempted assignment request.
- Form element is captured before the asynchronous request and reset safely afterward.
- The same defensive form-reset pattern was applied to Chapter creation.
- Inactive/non-operational chapters are blocked from receiving a new Chapter Administrator assignment.

### 2. National Admin chapter lifecycle controls — CODE COMPLETE

- Chapter Management now exposes National Admin lifecycle controls for:
  - `ACTIVE`
  - `INACTIVE` / deactivated
  - `SUSPENDED`
  - `ARCHIVED`
- Lifecycle changes use the existing audited chapter PATCH API.
- Historical chapter/member/finance/audit records are not deleted.
- Chapter cards remain responsive.

### 3. National Admin user lifecycle management — CODE COMPLETE

- Added National Admin **User Management** screen under access governance.
- Added account status control for:
  - `ACTIVE`
  - `INVITED`
  - `SUSPENDED`
  - `DISABLED`
- Status changes are server-authorized by national `roles.manage` permission and audit logged.
- Current National Admin cannot suspend/disable their own active session account through this control.
- Disabling/suspending blocks login through the existing session/login status checks while preserving membership, chapter, finance, and audit history.

### 4. Chapter Admin announcements — EXISTING AUTHORIZATION CONFIRMED + MEDIA EXTENSION CODE COMPLETE

- Existing PSP RBAC already grants Chapter Admin `content.manage` for the assigned chapter.
- Existing announcement API already enforces chapter scope server-side; Chapter Admin cannot publish national announcements unless holding national permission.
- Announcement creation form supports secure image upload.
- Accepted formats reuse PSP private-image validation: valid JPG, PNG, WEBP, subject to `MAX_IMAGE_UPLOAD_BYTES` (default 5 MB).
- Announcement image storage is private; delivery uses an authenticated/scoped content-media route.
- Admin recent-announcement view shows image previews.
- Member Announcements page renders images responsively with bounded height and `object-fit`, avoiding mobile overflow.

### 5. Shared private content-media delivery — CODE COMPLETE

- Added a reusable content-media URL helper and authenticated content-media delivery route for both `announcement` and `event` media.
- Media access is evaluated against content audience, chapter membership, publication state, and the relevant scoped admin permission.
- Cross-chapter member access is denied by server-side scope checks.
- Images are returned with `private, no-store` caching, `nosniff`, and the detected image MIME type.

### 6. Chapter/National Event image upload and member rendering — CODE COMPLETE

Implementation head: `1bdce47f4f118a3eab1ac163e81f75539d96035d`.

- Event Manager now accepts an optional JPG, PNG, or WEBP image using the same PSP private-media validation and size limit used for announcements.
- Event creation supports secure multipart submission while retaining JSON compatibility for existing API clients.
- Uploaded media is stored outside the public web root and `Event.imageUrl` stores only the PSP private-media reference.
- If event/database creation fails after a file was stored, the orphaned private file is removed.
- Event creation audit metadata records whether an image was attached.
- Notification failure after a successfully committed event is logged without returning a false creation failure to the user.
- Admin Event Management renders the authorized image through the scoped content-media endpoint.
- Member Events renders published national or same-chapter images responsively with bounded height and no uncontrolled overflow.
- Chapter Admin remains constrained to its assigned chapter through `events.manage`; national event creation still requires national permission.

## Pending Validation / Delivery

### P0 — Automated validation and regression coverage

Before PR closure:

- run the repository’s required secret/security, Prisma/MySQL, typecheck, production-build, runtime/security, cross-chapter-isolation, and runtime-dependency gates;
- validate chapter lifecycle authorization and audit behavior;
- validate national user-status authorization, self-deactivation protection, and login blocking semantics;
- validate announcement image upload behavior and scoped retrieval;
- validate event image upload behavior and scoped retrieval;
- confirm no cross-chapter content-media access.

### P0 — PR / exact-head CI / merge

- Open the PR only from the completed implementation/documentation branch head.
- Merge only after every required PR gate passes on that exact head.
- If any gate fails: inspect the failed job, fix the exact cause, push a new head, rerun, and merge only the exact passing head.
- Do not treat a green run from an older branch head as approval for a newer commit.

## Production Verification Status

The current branch is **not yet in production**.

Separately, `main` currently points to `7269b9ab1bc3c60f015850e784f96923464bd2f5`, which carries release markers `2026-09-04-r4 / 2026-09-04-professional-ui-v1`. The last recorded exact-generation Production Smoke run `33837001102` failed during the deployment wait because production remained healthy at HTTP 200 but continued serving `2026-09-04-r3 / 2026-09-04-member-mobile-v1` for all polling attempts. Re-check production before claiming the professional-UI generation is live.

After this branch is merged, production verification must additionally cover:

- exact new release/deployment generation is served;
- Chapter Admin assignment from the actual National Admin UI without the reset error;
- chapter status transition and reactivation;
- user suspend/disable/reactivate behavior with a controlled test account;
- Chapter Admin chapter-scoped announcement with image, visible to a member in the same chapter and not another chapter;
- Chapter Admin chapter-scoped event with image, visible to a member in the same chapter and not another chapter;
- responsive image display on representative mobile viewport;
- health/readiness/security checks on the exact deployed release generation.

## External Gates Still Open

Unchanged external evidence items remain open until proven with real services/devices:

- controlled Chairman welcome email delivery;
- physical Android/iOS PWA installation and representative mobile acceptance;
- real passkey registration/authentication;
- Digital Member ID second-device QR validation;
- certificate QR validation on a second device;
- PayMongo Platforms / Linked Accounts capability, child linkage, approved fee configuration, and TEST split-settlement E2E;
- database backup/restore drill;
- security credential cleanup/rotation where earlier values were exposed.

## Closure Definition

This task is complete only when:

1. all required regression and PSP CI gates pass on one exact head;
2. that exact head is merged;
3. production serves the new exact release generation;
4. production functional checks for admin lifecycle, user lifecycle, chapter-scoped announcements/events, media access, and mobile rendering pass or are explicitly identified as requiring controlled authenticated/device evidence;
5. `AGENTS.md`, `docs/STATUS.md`, and this tracker are reconciled with final PR/head/merge/run/production evidence.
