# Community Connections Handoff Guide V23

## Current restore point
V23 Sprint 12 release candidate.

## Last verified Green Build
- Backend: 248 passed, 0 failed, 0 warnings
- Browser: 22 passed, 0 failed, 0 warnings

Those counts predate the final V23 deployment. Rerun both suites before promoting V23 to the Green Build.

## Exact next task
Deploy and verify V23:
1. Commit and push the Sprint 12 source.
2. Run `clasp push`.
3. Run `runFullRegressionTest()` from Apps Script.
4. Run `browser-tests\Run-V23-All-Tests.bat`.
5. Record the final counts and fix any failures or warnings.
6. When both suites are clean, tag V23 as the new Green Build.

## Always update before a new Project Brain
- Project Brain
- Changelog
- Sprint Board
- Regression Checklist
- Handoff Guide
- Clean source bundle

## Packaging rule
Never include `.git`, `node_modules`, browser reports, screenshots, or local test profiles in a delivery ZIP.
