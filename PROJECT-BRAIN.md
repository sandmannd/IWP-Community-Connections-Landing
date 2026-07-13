# IWP Community Connections Project Brain V2

Current baseline: V19 test-harness build, July 12, 2026.

## Working baseline
- V18 registration and Adventure Details polish remains the accepted visual baseline.
- The current source includes later portal, discovery, dashboard, registration, memories, database, and dark-theme changes beyond the V18 handoff.
- The current Apps Script ZIP and current landing-page ZIP supplied by Shane are the authoritative codebases. The V18 handoff is historical reference only.

## Current priority
Replace manual batched regression testing with a one-click automated regression harness before continuing feature work.

## V19 automated regression harness
- `Test.gs` now provides `runFullRegressionTest()`.
- The suite is read-only and does not create events, registrations, memories, send email, or delete production data.
- It checks configuration, deployment URLs, database sheets and headers, duplicate IDs, authentication, forced public behavior, registration privacy, schedule formatting, capacity logic, registration validation, Community Memories integrity, landing API output, and settled V18 interface requirements.
- The latest report is saved in Script Properties and can be retrieved with `getLastRegressionTestReport()` or `getLastRegressionTestReportText()`.
- Browser rendering, real email delivery, real Drive upload permissions, QR scanning, and actual mobile-device appearance still require focused human validation only when an automated test cannot prove them.

## Next action
1. Replace only `Test.gs` in the current Apps Script repository.
2. Run `clasp push`.
3. Run `runFullRegressionTest` from Apps Script.
4. Use the resulting failed tests as the defect list. Do not perform the old full manual checklist first.

## Settled decisions
- Public name: Find Your Next Adventure.
- Admin name: Adventure Builder / Organizer Command Center.
- Public use must not require a Google login.
- Organizer access requires an approved Google account.
- Activities are member-organized and are not official IWP events.
- First Responders is inclusive. Do not separately list dispatchers or corrections.
- Do not use em dashes in user-facing writing.
- Preserve working behavior and make targeted changes only.
- Current source wins over older handoffs and chat history.


## V19.1 - Automated Regression Suite Stabilization (July 12, 2026)

- The one-click regression suite is now the standard first testing step before manual browser testing.
- `initializeDatabase()` successfully created and validated the missing `Memories` sheet without altering existing data.
- Production public and admin URLs were normalized to the established `/exec` deployment.
- Automated baseline after configuration: 247 passed, 0 failed, 1 warning.
- Public event records now strip `CreatedBy`, `OrganizerEmail`, and `OrganizerPhone` before being returned in public mode.
- Execution-log output now shows only the summary, failures, and warnings. The complete report remains saved in Script Properties.
- Settled workflow: run `runFullRegressionTest()` from `Test.gs`; only proceed to targeted manual testing after the automated suite passes.

## V20 - One-Click Browser Regression (July 12, 2026)

- Added `browser-tests/Run-V20-All-Tests.bat` as the one-click test entry point.
- The runner launches Chrome, invokes the existing Apps Script backend regression through `google.script.run`, and then tests the production landing page and public application from the browser.
- Browser coverage includes the production landing page, launch URLs, live adventure loading, visible images, public app startup, event cards, search, category filters, Adventure Details, registration route availability, public/admin separation, mobile menu behavior, mobile horizontal overflow, organizer Command Center detection, and unexpected JavaScript errors.
- The suite is read-only. It does not create events, submit registrations, upload memories, send email, or delete production records.
- Timestamped HTML and JSON reports are saved under `browser-tests/reports`, with `latest-report.html` as the primary result.
- Organizer browser coverage uses a dedicated persistent Chrome profile. Until that profile is signed into an approved organizer Google account, organizer detection is reported as a warning rather than a required failure.
- Version naming is settled: ZIP filename, Git commit message, and Project Brain milestone must use the same version name.


## V20.1 - Reliable Browser Test Runner
- Fixed the Windows one-click runner opening a missing latest-report.html file.
- Runner now creates the reports directory first, removes stale reports, and captures output in browser-tests/reports/latest-run.log.
- The HTML report opens only when successfully created. If the Node test runner fails before report generation, the diagnostic log opens in Notepad instead.
- Version/commit/package name: IWP-Community-Connections-V20.1-Reliable-Browser-Test-Runner.


## V20.2 - Local Browser Test Runtime
- Browser tests now copy their runner files to `%LOCALAPPDATA%\IWP-Community-Connections-Browser-Tests` and execute there.
- This prevents Google Drive paths, ampersands, sync placeholders, and damaged `node_modules` package files from breaking Node.js or Playwright.
- Reports and screenshots are copied back into the project `browser-tests` folder after each run.
- The runner validates the local Playwright package and automatically reinstalls it if damaged.


## V20.3 Incognito Browser Runtime
- Browser regression now launches a fresh non-persistent Chrome context for every run, matching successful Incognito public access.
- App startup waits for the actual portal/home view instead of assuming any loaded page is the app.
- Failed app loads save a screenshot, HTML snapshot, URL, page title, and body excerpt for diagnosis.
- Browser timeout increased to 60 seconds for Apps Script cold starts.


## V20.4 - Apps Script Iframe-Aware Browser Regression
- Browser automation now locates and tests the sandboxed iframe used by Google Apps Script web apps.
- Public app selectors, backend regression calls, detail navigation, registration navigation, organizer checks, and mobile overflow checks run inside the app frame rather than Google’s outer wrapper.
- The broken featured Google Drive thumbnail remains a genuine application defect and is intentionally still reported.


## V20.5 Accurate Full-Stack Regression
- Browser automation now verifies the latest saved server-side regression summary through a public-safe status-only endpoint.
- Anonymous browser sessions no longer attempt to execute admin-only regression code.
- Public category filters load active Event Types and merge them with categories present on published events.
- Browser category checks wait for asynchronous category loading.


V20.6: Browser regression now calls the Apps Script backend summary with a direct google.script.run method invocation. Dynamic property invocation is not supported by the Apps Script client proxy. Landing image checks now allow fallback rendering to settle.


## V23 - Community Memories Production Completion (July 13, 2026)

- Community Memories update operations now preserve fields that were not explicitly changed.
- Featured status is enforced per adventure rather than globally.
- Unapproved memories cannot remain featured.
- Server-side upload and caption validation was hardened.
- Admin memory actions validate the parent adventure before reading, editing, or deleting.
- The memory manager upload form resets when closed.
- Regression coverage now checks per-adventure featured limits and featured/approved consistency.

### Deployment validation
1. Push the V23 source.
2. Run `runFullRegressionTest()`.
3. Run the one-click browser regression suite.
4. Confirm memory upload, caption-only save, approve/unapprove, feature/unfeature, and delete on one test adventure.
