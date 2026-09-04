# PSP Private Media Turbopack Build-Tracing Fix — Work Tracker

**Date:** 2026-09-04  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Branch:** `fix/private-media-build-tracing-2026-09-04`  
**Base main SHA:** `44fd3bff155ac2c27a1cc4877cbf323b625ad5d6`

## Objective

Remove the two Next.js/Turbopack whole-project filesystem-tracing warnings emitted from `src/lib/storage/private-media.ts` without changing PSP private-media security, storage semantics, accepted image validation, RBAC/chapter isolation, or production data.

## Original Build Evidence

Before this task, the production build succeeded but reported two warnings:

1. dynamic `path.resolve(...)` in `storageRoot()` could cause Turbopack to trace the whole project;
2. dynamic `readFile(absolute)` in `readPrivateFile()` could cause the same whole-project trace.

Turbopack warned that this could include unnecessary project/public files in server output and increase deployment size or failure risk.

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

- The default storage root is expressed as the statically scoped `path.join(process.cwd(), "storage")` path.
- Runtime-configured `STORAGE_ROOT` keeps the same `path.resolve` semantics and is marked with Turbopack's documented `turbopackIgnore` annotation so it is resolved at runtime rather than expanded into a build-time whole-project filesystem trace.
- The already-authorized and path-validated private file read keeps the same `readFile(absolute)` runtime behavior and is annotated so Turbopack does not glob the project while tracing it.
- Existing `absolute.startsWith(`${root}${path.sep}`)` traversal checks are unchanged.

## Exact CI Evidence So Far

PR #21 initially ran PSP CI #420 / run `33861414990` on head `19395bbbbd62b7234c321dd538a7f2400eeeee33`.

Three exact-head attempts were inspected. In every attempt:

- secret-pattern and security-header checks passed;
- Prisma schema/client/database/seed/bootstrap checks passed;
- TypeScript passed;
- production build passed;
- the two former `src/lib/storage/private-media.ts` whole-project tracing warnings were absent from the build log;
- production runtime/security smoke passed;
- cross-chapter isolation passed;
- the only failure was `Produce production dependency audit`, where both bounded 90-second `npm audit` attempts timed out before trustworthy vulnerability evidence was returned.

This proves the private-media build-tracing correction itself works under CI while also confirming that the hardened dependency-audit gate is correctly failing closed rather than treating unavailable evidence as a pass.

## Audit Availability Refinement

Repeated 90-second endpoint stalls showed that the external audit evidence source could consume both available attempts without returning any report. The workflow was therefore refined without weakening the security policy:

- five independent outer attempts instead of two;
- each `npm audit` invocation is capped at 45 seconds;
- npm fetch timeout is capped at 30 seconds;
- npm's internal fetch retry loop is disabled so the workflow controls retry behavior explicitly;
- each returned report must still pass `scripts/check-runtime-audit.mjs --validate-only` before it can be accepted;
- bounded increasing delay is used between attempts;
- if no valid report is obtained, the job still fails closed;
- the separate HIGH/CRITICAL runtime vulnerability enforcement step remains unchanged.

The availability refinement commit is `00ac8c6a447123919d42f579297adf7ba97f39a5`. Documentation commits after that change form a newer PR head and therefore require a fresh complete exact-head PSP CI pass before merge.

## Acceptance Criteria

1. exact final PR head passes the complete PSP CI gate set;
2. production build no longer reports the two `src/lib/storage/private-media.ts` whole-project tracing warnings;
3. runtime/security smoke and cross-chapter isolation remain green;
4. dependency audit evidence passes under the fail-closed PR #19 policy;
5. merge only the exact passing head;
6. post-merge PSP CI and Production Smoke remain green;
7. reconcile `AGENTS.md`, `docs/STATUS.md`, and this tracker with final evidence.

## Current State

The private-media tracing fix is technically validated by repeated successful production builds with the target warnings absent. PR #21 remains **NOT MERGE-ELIGIBLE** until the newest documentation-reconciled exact head passes the complete PSP CI gate, including trusted dependency-audit evidence. No audit bypass or stale evidence is permitted.
