# PSP Admin Lifecycle, User Governance, Announcement/Event Media — Work Tracker

**Date:** 2026-09-04  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Working branch:** `fix/admin-lifecycle-content-media-2026-09-04`  
**Code head before documentation commits:** `5ef0655f0fc23a835957d4daf84dff5600320875`  
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
- Announcement creation form now supports secure image upload.
- Accepted formats reuse PSP private-image validation: valid JPG, PNG, WEBP, subject to `MAX_IMAGE_UPLOAD_BYTES` (default 5 MB).
- Announcement image storage is private; delivery uses an authenticated/scoped content-media route.
- Admin recent-announcement view shows image previews.
- Member Announcements page renders images responsively with bounded height and `object-fit`, avoiding mobile overflow.

### 5. Shared private content-media delivery — CODE COMPLETE FOR ANNOUNCEMENTS

- Added a reusable content-media URL helper and authenticated content-media delivery route.
- Media access is evaluated against announcement/event audience, chapter membership, and relevant admin permission.
- Images are returned with no-sniff and private/no-store protections.

## Pending Development

### P0 — Event image upload and member rendering

The event creation/management path still uses the pre-existing JSON-only flow. The following remain to be implemented:

- add image selection/upload to Chapter/National Event Manager;
- change event creation request to secure multipart handling;
- save validated image through PSP private-media storage;
- persist the private storage key/reference in `Event.imageUrl` using the same non-public convention as announcements;
- serve event media through the scoped content-media route;
- show event image in Admin event history/management;
- show responsive event image on the Member Events page;
- preserve Chapter Admin chapter-only scope and National Admin national scope.

### P0 — Automated validation and regression coverage

Before PR closure:

- run typecheck/build/Prisma/runtime security gates;
- add or extend regression checks for Chapter Admin assignment form behavior where practical;
- validate chapter lifecycle authorization and audit behavior;
- validate national user-status authorization, self-deactivation protection, and login blocking semantics;
- validate announcement image upload: valid file, invalid type, oversize, chapter scope, member retrieval;
- validate event image upload with the same matrix once implemented;
- ensure no cross-chapter content-media access.

### P0 — PR / exact-head CI / merge

- No PR exists yet for `fix/admin-lifecycle-content-media-2026-09-04` at the time of this documentation update.
- Exact-head PSP CI has **not yet run** on this work branch.
- Do not merge until the final implementation head passes every required gate.
- If any gate fails: inspect the failed job, fix the exact cause, push a new head, rerun, and merge only the exact passing head.

## Production Verification Status

The current branch is **not in production**.

Separately, `main` currently points to `7269b9ab1bc3c60f015850e784f96923464bd2f5`, which carries release markers `2026-09-04-r4 / 2026-09-04-professional-ui-v1`. The latest exact-generation Production Smoke run `33837001102` failed during the deployment wait because production remained healthy at HTTP 200 but continued serving `2026-09-04-r3 / 2026-09-04-member-mobile-v1` for all 40 polling attempts. Therefore the professional-UI exact production-generation proof remains open until Hostinger serves the expected generation.

After this branch is eventually merged, production verification must additionally cover:

- Chapter Admin assignment from the actual National Admin UI;
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
- certificate second-device QR validation;
- PayMongo Platforms / Linked Accounts capability, child linkage, approved fee configuration, and TEST split-settlement E2E;
- database backup/restore drill;
- security credential cleanup/rotation where earlier values were exposed.

## Closure Definition

This task is complete only when:

1. event image upload/member rendering is implemented;
2. all required regression and PSP CI gates pass on one exact head;
3. that exact head is merged;
4. production serves the new exact release generation;
5. production functional checks for admin lifecycle, user lifecycle, chapter-scoped announcements/events, media access, and mobile rendering pass;
6. `AGENTS.md` and `docs/STATUS.md` are reconciled with final PR/head/merge/run/production evidence.
