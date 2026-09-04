# PSP Private Media Turbopack Build-Tracing Fix — Work Tracker

**Date:** 2026-09-04  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Branch:** `fix/private-media-build-tracing-2026-09-04`  
**Base main SHA:** `44fd3bff155ac2c27a1cc4877cbf323b625ad5d6`

## Objective

Remove the two Next.js/Turbopack whole-project filesystem-tracing warnings emitted from `src/lib/storage/private-media.ts` without changing PSP private-media security, storage semantics, accepted image validation, RBAC/chapter isolation, or production data.

## Build Evidence

The production build succeeds but reports two warnings:

1. dynamic `path.resolve(...)` in `storageRoot()` can cause Turbopack to trace the whole project;
2. dynamic `readFile(absolute)` in `readPrivateFile()` can cause the same whole-project trace.

Turbopack warns that this can include unnecessary project/public files in server output and increase deployment size or failure risk.

## Safety Constraints

The fix must preserve:

- `STORAGE_ROOT` runtime configurability;
- the existing default `${process.cwd()}/storage` location;
- path traversal protection that requires resolved file paths to remain inside the storage root;
- private/no-store authenticated delivery enforced by the existing route layer;
- JPG/PNG/WEBP validation and upload size limits;
- existing write/remove behavior.

No database, API contract, payment, authentication, RBAC, or chapter-isolation change is allowed in this task.

## Implementation

- The default storage root is now expressed as the statically scoped `path.join(process.cwd(), "storage")` path.
- Runtime-configured `STORAGE_ROOT` keeps the same `path.resolve` semantics and is marked with Turbopack's documented `turbopackIgnore` annotation so it is resolved at runtime rather than expanded into a build-time whole-project filesystem trace.
- The already-authorized and path-validated private file read keeps the exact same `readFile(absolute)` runtime behavior and is annotated so Turbopack does not glob the project while tracing it.
- Existing `absolute.startsWith(`${root}${path.sep}`)` traversal checks are unchanged.

## Acceptance Criteria

1. exact final PR head passes the complete PSP CI gate set;
2. production build no longer reports the two `src/lib/storage/private-media.ts` whole-project tracing warnings;
3. runtime/security smoke and cross-chapter isolation remain green;
4. dependency audit evidence passes under the fail-closed PR #19 policy;
5. merge only the exact passing head;
6. post-merge PSP CI and Production Smoke remain green;
7. reconcile `AGENTS.md`, `docs/STATUS.md`, and this tracker with final evidence.

## Current State

Implementation is in progress. Exact-head CI evidence is pending.
