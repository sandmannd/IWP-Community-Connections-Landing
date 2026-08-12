IWP Community Connections — M6.22 Full Regression & Cleanup

Landing changes:
- Restores the already-approved M6.20 category browsing behavior in the ACTIVE site-m64.js file.
- Category cards now show all upcoming adventures in that category on the landing page.
- Next-30-day and category grids clear aria-busy after success/failure.
- Preserves M6.4 adventure prefetch/cache performance improvements.
- Adds Landing static validation to catch missing assets, active JavaScript syntax errors, merge markers, and category wiring regressions.
- No organizer authentication, publishing, registration, check-in, or Apps Script endpoint logic changed.
- .git excluded from delivery ZIP.
