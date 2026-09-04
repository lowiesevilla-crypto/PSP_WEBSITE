# PSP Admin Lifecycle, User Governance, Announcement/Event Media — Work Tracker

**Date:** 2026-09-04  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Working branch:** `fix/admin-lifecycle-content-media-2026-09-04`  
**PR:** #16 — `fix: admin lifecycle and chapter content media`  
**Latest release-candidate code/workflow head before this documentation commit:** `b1228318b89b7d60394a49272fc6046fdf74235d`  
**Target production release:** `2026-09-04-r5`  
**Target deployment generation:** `2026-09-04-admin-lifecycle-media-v1`  
**Production branch:** `main`

## Objective

Close the National Admin and Chapter Admin defects/enhancements reported from production while preserving PSP RBAC, chapter isolation, auditability, non-destructive history, mobile-responsive member presentation, and exact production-generation proof.

Required outcomes:

- National Admin can assign a Chapter Administrator without the browser `reset` null error.
- National Admin can activate, deactivate/inactivate, suspend, or archive a chapter without deleting history.
- National Admin can activate, invite, suspend, or disable user accounts without deleting membership/finance/audit history.
- Chapter Admin can create chapter-scoped announcements and events; National Admin retains national scope.
- Announcement and event images can be uploaded securely and are viewable responsively by authorized members.
- Changes must pass exact-head PSP CI before merge.
- Production closure must observe the unique `r5 / admin-lifecycle-media-v1` generation, not a prior release marker.

## Completed in the Working Branch

### 1. Chapter Administrator assignment crash — CODE COMPLETE

- Fixed the async form-reset defect that produced `Cannot read properties of null (reading 'reset')` after a successful/attempted assignment request.
- Form element is captured before the asynchronous request and reset safely afterward.
- The same defensive form-reset pattern was applied to Chapter creation.
- Inactive/non-operational chapters are blocked from receiving a new Chapter Administrator assignment.

### 2. National Admin chapter lifecycle controls — CODE COMPLETE

- Chapter Management exposes National Admin lifecycle controls for `ACTIVE`, `INACTIVE`, `SUSPENDED`, and `ARCHIVED`.
- Lifecycle changes use the audited chapter PATCH API.
- Historical chapter/member/finance/audit records are not deleted.
- Chapter cards remain responsive.

### 3. National Admin user lifecycle management — CODE COMPLETE

- Added National Admin **User Management** under access governance.
- Added account status control for `ACTIVE`, `INVITED`, `SUSPENDED`, and `DISABLED`.
- Status changes require national `roles.manage` and are audit logged.
- Current National Admin cannot suspend/disable their own active session account through this control.
- Disabling/suspending blocks login through existing status checks while preserving history.

### 4. Chapter Admin announcements + private media — CODE COMPLETE

- Existing PSP RBAC grants Chapter Admin `content.manage` only for the assigned chapter.
- Chapter Admin cannot publish national announcements without national permission.
- Announcement creation supports secure image upload.
- Accepted images are validated JPG, PNG, or WEBP subject to `MAX_IMAGE_UPLOAD_BYTES` (default 5 MB).
- Media storage is private and served through authenticated/scoped content-media delivery.
- Admin recent-announcement view shows image previews.
- Member Announcements renders images responsively without uncontrolled overflow.

### 5. Shared private content-media delivery — CODE COMPLETE

- Reusable authenticated content-media delivery supports both `announcement` and `event` media.
- Access is evaluated against audience, publication state, chapter membership, and relevant scoped admin permission.
- Cross-chapter member access is denied server-side.
- Images use private/no-store caching, no-sniff, and detected MIME type.

### 6. Chapter/National Event image upload and member rendering — CODE COMPLETE

Implementation head: `1bdce47f4f118a3eab1ac163e81f75539d96035d`.

- Event Manager accepts optional JPG, PNG, or WEBP image using PSP private-media validation/storage.
- Event creation supports secure multipart submission while retaining JSON compatibility.
- `Event.imageUrl` stores only the private media reference.
- Failed event persistence cleans up a newly stored orphaned file.
- Audit metadata records whether an image was attached.
- Notification failure after a committed event is logged without falsely reporting that event creation failed.
- Admin Event Management renders authorized images.
- Member Events renders published national or same-chapter images responsively.
- Chapter Admin remains constrained to its assigned chapter through `events.manage`.

### 7. Exact release/deployment generation — CODE COMPLETE

- Release ID advanced to `2026-09-04-r5`.
- Deployment generation advanced to `2026-09-04-admin-lifecycle-media-v1`.
- CI runtime smoke requires the new exact release/generation.
- Production Smoke waits for the same exact release/generation after merge.
- This prevents the previous `r4 / professional-ui-v1` marker from being reused as proof of this release.

## Current CI / PR State

PR #16 is open against `main`.

An initial PR CI run (#382 / run `33846413588`) started on earlier head `95b901b4f4a770e1eaf03ca8ef3874f2a695432f`. That head was intentionally superseded before merge because it still reused the prior production release marker. Regardless of its eventual result, it is **not eligible for merge**.

A fresh exact-head CI is required after the `r5 / admin-lifecycle-media-v1` marker changes and documentation reconciliation. Merge only the final exact head that passes every required gate.

If any gate fails: inspect the failed job/log, fix the exact cause, push a new head, rerun, and continue.

## Pending Validation / Delivery

### P0 — Exact-head CI

Required gate set includes:

- committed high-risk secret scan;
- security-header configuration;
- dependency install;
- Prisma validation/client generation/MySQL schema application;
- baseline seed/bootstrap validation;
- cross-chapter security fixtures;
- strict TypeScript;
- optimized production build;
- runtime/security smoke with exact `r5 / admin-lifecycle-media-v1` identity;
- cross-chapter isolation;
- production runtime dependency audit.

### P0 — Merge

- Confirm PR head has not moved after the passing run.
- Confirm no unresolved review threads that block closure.
- Merge PR #16 only using the exact passing `expected_head_sha`.

### P0 — Production verification after merge

Production closure requires:

- `/api/health` exposes `release=2026-09-04-r5` and `deploymentGeneration=2026-09-04-admin-lifecycle-media-v1`;
- `/api/health/ready` remains ready for database/auth/member-mobile schema;
- public/PWA/security/origin verification in Production Smoke passes on that exact generation;
- Chapter Admin assignment is verified through the actual National Admin UI without the reset error;
- controlled chapter deactivate/reactivate is verified;
- controlled user suspend/disable/reactivate is verified;
- chapter-scoped announcement with image is visible to same-chapter member and denied cross-chapter;
- chapter-scoped event with image is visible to same-chapter member and denied cross-chapter;
- responsive member image presentation is verified on a representative mobile viewport.

Automated/public production checks may close from Production Smoke evidence. Authenticated admin/content workflows must not be claimed complete without controlled authenticated production evidence.

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

1. all required PSP CI gates pass on one exact final head;
2. that exact head is merged using expected-head protection;
3. production serves `2026-09-04-r5 / 2026-09-04-admin-lifecycle-media-v1`;
4. automated production health/readiness/security smoke passes on that exact generation;
5. authenticated production admin/content checks are completed or explicitly remain open for controlled credentials/device evidence;
6. `AGENTS.md`, `docs/STATUS.md`, and this tracker are reconciled with final PR/head/merge/run/production evidence.
