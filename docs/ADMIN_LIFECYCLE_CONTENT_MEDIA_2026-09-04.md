# PSP Admin Lifecycle, User Governance, Announcement/Event Media — Work Tracker

**Date:** 2026-09-04  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Implementation PR:** #16 — `fix: admin lifecycle and chapter content media`  
**Final exact passing PR head:** `971c9f7551f402b0c503c560e6fc292954c7b47f`  
**Merge SHA:** `58bb97c09ed6bc2989e9f8e3f79c9a56592b114b`  
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

## Completed Implementation

### 1. Chapter Administrator assignment crash — COMPLETE

- Fixed the async form-reset defect that produced `Cannot read properties of null (reading 'reset')` after a successful/attempted assignment request.
- Form element is captured before the asynchronous request and reset safely afterward.
- The same defensive form-reset pattern was applied to Chapter creation.
- Inactive/non-operational chapters are blocked from receiving a new Chapter Administrator assignment.

### 2. National Admin chapter lifecycle controls — COMPLETE

- Chapter Management exposes National Admin lifecycle controls for `ACTIVE`, `INACTIVE`, `SUSPENDED`, and `ARCHIVED`.
- Lifecycle changes use the audited chapter PATCH API.
- Historical chapter/member/finance/audit records are not deleted.
- Chapter cards remain responsive.

### 3. National Admin user lifecycle management — COMPLETE

- Added National Admin **User Management** under access governance.
- Added account status control for `ACTIVE`, `INVITED`, `SUSPENDED`, and `DISABLED`.
- Status changes require national `roles.manage` and are audit logged.
- Current National Admin cannot suspend/disable their own active session account through this control.
- Disabling/suspending blocks login through existing status checks while preserving history.

### 4. Chapter Admin announcements + private media — COMPLETE

- Existing PSP RBAC grants Chapter Admin `content.manage` only for the assigned chapter.
- Chapter Admin cannot publish national announcements without national permission.
- Announcement creation supports secure image upload.
- Accepted images are validated JPG, PNG, or WEBP subject to `MAX_IMAGE_UPLOAD_BYTES` (default 5 MB).
- Media storage is private and served through authenticated/scoped content-media delivery.
- Admin recent-announcement view shows image previews.
- Member Announcements renders images responsively without uncontrolled overflow.

### 5. Shared private content-media delivery — COMPLETE

- Reusable authenticated content-media delivery supports both `announcement` and `event` media.
- Access is evaluated against audience, publication state, chapter membership, and relevant scoped admin permission.
- Cross-chapter member access is denied server-side.
- Images use private/no-store caching, no-sniff, and detected MIME type.

### 6. Chapter/National Event image upload and member rendering — COMPLETE

- Event Manager accepts optional JPG, PNG, or WEBP image using PSP private-media validation/storage.
- Event creation supports secure multipart submission while retaining JSON compatibility.
- `Event.imageUrl` stores only the private media reference.
- Failed event persistence cleans up a newly stored orphaned file.
- Audit metadata records whether an image was attached.
- Notification failure after a committed event is logged without falsely reporting that event creation failed.
- Admin Event Management renders authorized images.
- Member Events renders published national or same-chapter images responsively.
- Chapter Admin remains constrained to its assigned chapter through `events.manage`.

### 7. Exact release/deployment generation — COMPLETE

- Release ID advanced to `2026-09-04-r5`.
- Deployment generation advanced to `2026-09-04-admin-lifecycle-media-v1`.
- CI runtime smoke requires the new exact release/generation.
- Production Smoke requires the same exact release/generation after merge.

## CI / PR / Merge — COMPLETE

- Final exact PR head: `971c9f7551f402b0c503c560e6fc292954c7b47f`.
- PSP CI #394 / run `33846881681`: **PASSED** on that exact head.
- No unresolved review threads.
- PR #16 merged using expected-head protection.
- Merge SHA: `58bb97c09ed6bc2989e9f8e3f79c9a56592b114b`.
- Post-merge PSP CI #395 / run `33847400145`: **PASSED** on the merge SHA.

The implementation delivery gate is therefore complete. Production deployment/runtime proof is a separate gate and remains open.

## Production Verification — OPEN

Production Smoke #8 / run `33847400143` executed against merge SHA `58bb97c09ed6bc2989e9f8e3f79c9a56592b114b`.

### Attempt 1

- 40/40 `/api/health` polls returned HTTP 200.
- Production remained on `2026-09-04-r4 / 2026-09-04-professional-ui-v1` for the entire window.
- Expected `2026-09-04-r5 / 2026-09-04-admin-lifecycle-media-v1` was not observed.
- Result: failed exact-generation deployment proof; production itself remained responsive.

### Attempt 2

- Failed jobs were rerun immediately.
- Every completed health attempt returned HTTP `000` after a 10-second connection timeout.
- The 15-minute workflow timeout cancelled the job during poll 36 before the configured 40-poll loop could complete.
- Later readiness/public/security checks were skipped.
- Result: no r5 proof; the production endpoint was unreachable from that GitHub runner throughout the attempt.

## Production Smoke Reliability Fix — IN PROGRESS

Follow-up branch: `docs/reconcile-pr16-prod-status-2026-09-04`.

Exact cause fixed in the workflow:

- configured wait loop worst case was roughly 40 × (10-second request timeout + 15-second sleep), which can exceed the prior 15-minute job timeout;
- job timeout is increased to 20 minutes;
- network-level failures are counted explicitly;
- all-network-failure is identified as a reachability/hosting gate rather than a stale-generation assertion;
- resolver diagnostics are printed on terminal failure;
- exact r5/generation checks remain unchanged and fail closed.

Required next delivery sequence:

1. run PSP CI on the final follow-up branch head;
2. if any gate fails, inspect the failed job/log, fix the exact cause, push a new head, and rerun;
3. confirm no unresolved review blockers;
4. merge only the exact passing head;
5. monitor the new main Production Smoke until the exact r5 generation is either proven or a precise hosting/reachability blocker is recorded;
6. reconcile `AGENTS.md`, `docs/STATUS.md`, and this tracker with the final evidence.

## Production Functional Evidence Still Required

Automated/public production proof:

- `/api/health` exposes `release=2026-09-04-r5` and `deploymentGeneration=2026-09-04-admin-lifecycle-media-v1`;
- `/api/health/ready` remains ready for database/auth/member-mobile schema;
- public/PWA/security/origin verification passes on that exact generation;
- verification routes do not produce application 500s.

Controlled authenticated proof:

- Chapter Admin assignment through the actual National Admin UI without the reset error;
- controlled chapter deactivate/reactivate;
- controlled user suspend/disable/reactivate;
- chapter-scoped announcement with image visible to same-chapter member and denied cross-chapter;
- chapter-scoped event with image visible to same-chapter member and denied cross-chapter;
- responsive member image presentation on a representative mobile viewport.

Automated/public checks may close from Production Smoke evidence. Authenticated admin/content workflows must not be claimed complete without controlled authenticated production evidence.

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

1. implementation remains merged from the exact passing PR #16 head;
2. follow-up Production Smoke reliability/status changes pass exact-head CI and merge safely;
3. production serves `2026-09-04-r5 / 2026-09-04-admin-lifecycle-media-v1`;
4. automated production health/readiness/security smoke passes on that exact generation;
5. authenticated production admin/content checks are completed or explicitly remain open for controlled credentials/device evidence;
6. `AGENTS.md`, `docs/STATUS.md`, and this tracker are reconciled with final evidence.
