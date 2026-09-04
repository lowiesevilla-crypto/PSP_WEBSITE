# PSP Runtime Dependency Audit Gate Hardening — Work Tracker

**Date:** 2026-09-04  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Implementation branch:** `ci/fail-closed-runtime-audit-2026-09-04`  
**Implementation PR:** #19 — `ci: fail closed on invalid runtime audit evidence`  
**Exact passing PR head:** `6e8d530f4449c3f335be7f9562eca40bbf80008e`  
**Merge SHA:** `0b10f2bf98678c5cda74450d0c55389895338949`

## Objective

Make the required production dependency-audit CI gate bounded, diagnostically correct, and fail-closed when the npm audit service cannot provide trustworthy vulnerability evidence.

## Defect Evidence

Successful post-merge PSP CI #402 / run `33851027472` exposed a reliability/security flaw:

- the `npm audit --omit=dev --json` request waited about seven minutes before npm reported its audit endpoint as HTTP 503 Service Unavailable;
- the workflow appended `|| true`, intentionally allowing npm's non-zero vulnerability status to continue to the policy-enforcement step, but this also allowed registry/transport failures to continue;
- `scripts/check-runtime-audit.mjs` used `audit.vulnerabilities ?? {}` and therefore treated an npm operational error payload without vulnerability evidence as an empty vulnerability set;
- the run consequently printed `Runtime dependency audit gate passed.` even though a valid audit report was not obtained.

This did not indicate a discovered application vulnerability. It proved that the prior security gate could produce a false pass when its evidence source was unavailable.

## Implementation — COMPLETE

### Evidence validation

`scripts/check-runtime-audit.mjs` now fails when:

- the audit file is missing;
- JSON cannot be parsed;
- the root payload is not an object;
- npm returns an `error` payload;
- `auditReportVersion` is not the supported version 2 format;
- the `vulnerabilities` object is missing/invalid;
- vulnerability metadata is missing/invalid.

A `--validate-only` mode validates evidence integrity without applying severity policy. Normal execution retains the existing narrow Prisma development-tool allow-list and blocks all other HIGH/CRITICAL runtime findings.

### Bounded audit generation

The CI audit-generation step now:

- limits each `npm audit` attempt to 90 seconds;
- allows at most two attempts with a short delay between attempts;
- validates each returned report before accepting it as evidence;
- fails closed if neither attempt yields trusted npm vulnerability data;
- preserves the separate enforcement step so a valid audit report containing blocking vulnerabilities fails for the correct policy reason.

## Exact-Head Delivery Evidence — COMPLETE

- PR #19 final head: `6e8d530f4449c3f335be7f9562eca40bbf80008e`.
- PSP CI #409 / run `33855025604`: **PASSED** on that exact head.
- No unresolved inline review threads blocked merge.
- PR #19 merged using expected-head protection.
- Merge SHA: `0b10f2bf98678c5cda74450d0c55389895338949`.
- Production Smoke #11 / run `33859569443`: **PASSED** on the merge SHA and reconfirmed exact r5 public production health.

## Post-Merge CI Evidence — COMPLETE AFTER FAIL-CLOSED RETRY

PSP CI #410 / run `33859569625` ran on merge SHA `0b10f2bf98678c5cda74450d0c55389895338949`.

### Attempt 1 — FAILED CLOSED AS DESIGNED

All application-facing gates passed first, including:

- secret-pattern and security-header checks;
- dependency installation;
- Prisma validation/client generation/schema application;
- baseline seed and System Admin bootstrap validation;
- cross-chapter security fixtures;
- typecheck;
- production build;
- production runtime/security smoke;
- cross-chapter isolation test;
- development-package pruning.

The only failed step was **Produce production dependency audit**. Both bounded `npm audit` attempts hit the 90-second timeout and produced no trusted vulnerability evidence. The hardened gate correctly emitted `Runtime dependency audit evidence could not be obtained after bounded retries; failing closed.` and failed the job rather than claiming a clean audit.

### Attempt 2 — PASSED

The exact failed job was rerun on the same merge SHA without changing or bypassing the security policy. Attempt 2 completed **SUCCESS** across the full PSP CI gate set, including:

- successful production dependency-audit evidence generation;
- evidence validation;
- HIGH/CRITICAL runtime vulnerability enforcement.

This is the intended behavior: missing evidence fails closed, and a later exact retry may pass only when trustworthy evidence is actually obtained.

## Production Impact

PR #19 changed CI evidence handling only. It did not change PSP business logic, database schema, production release identity, payment behavior, authentication, RBAC, or chapter isolation.

Production remains:

- release `2026-09-04-r5`;
- deployment generation `2026-09-04-admin-lifecycle-media-v1`;
- automated/public production smoke green through Production Smoke #11.

## Current State — CLOSED

The false-green runtime dependency-audit defect is fixed, exact-head CI passed, the exact head was merged, production smoke passed, and the post-merge CI gate passed after correctly rejecting one evidence-unavailable attempt.

No future agent may weaken this gate to make an external npm audit outage green. Registry/transport/timeouts/malformed evidence remain fail-closed conditions. If such a condition occurs, inspect the exact log and rerun the exact job/head; treat it separately from application-regression evidence.

Next acceptance priority is the controlled authenticated production workflow matrix documented in `docs/STATUS.md`. When controlled production credentials/test records are unavailable, the next unblocked internal quality item is the Turbopack private-media whole-project tracing warning.
