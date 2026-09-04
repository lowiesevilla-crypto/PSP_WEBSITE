# PSP Runtime Dependency Audit Gate Hardening — Work Tracker

**Date:** 2026-09-04  
**Repository:** `lowiesevilla-crypto/PSP_WEBSITE`  
**Branch:** `ci/fail-closed-runtime-audit-2026-09-04`  
**Production branch at start:** `main` / `8d4cdec1ad315640bad4361f98ac121800dc165e`

## Objective

Make the required production dependency-audit CI gate bounded, diagnostically correct, and fail-closed when the npm audit service cannot provide trustworthy vulnerability evidence.

## Defect Evidence

Successful post-merge PSP CI #402 / run `33851027472` exposed a reliability/security flaw:

- the `npm audit --omit=dev --json` request waited about seven minutes before npm reported its audit endpoint as HTTP 503 Service Unavailable;
- the workflow appended `|| true`, intentionally allowing npm's non-zero vulnerability status to continue to the policy-enforcement step, but this also allowed registry/transport failures to continue;
- `scripts/check-runtime-audit.mjs` used `audit.vulnerabilities ?? {}` and therefore treated an npm operational error payload without vulnerability evidence as an empty vulnerability set;
- the run consequently printed `Runtime dependency audit gate passed.` even though a valid audit report was not obtained.

This does not indicate a discovered application vulnerability. It indicates that the security gate could produce a false pass when its evidence source was unavailable.

## Implementation

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

## Required Delivery Sequence

1. Open a PR from the hardening branch to `main`.
2. Run the complete PSP CI gate set on one exact final head.
3. If any gate fails, inspect the failed job/log, fix the exact cause, push a new head, and rerun.
4. Confirm no unresolved review blockers.
5. Merge only the exact head that passed all required gates using expected-head protection.
6. Confirm post-merge PSP CI and Production Smoke remain green.
7. Reconcile `AGENTS.md`, `docs/STATUS.md`, and this tracker with final head/PR/merge/run evidence.

## Current State

Implementation is code-complete on the working branch. Exact-head CI and merge evidence are still pending.
