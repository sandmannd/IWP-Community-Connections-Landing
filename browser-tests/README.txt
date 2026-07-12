IWP COMMUNITY CONNECTIONS V20.2 ONE-CLICK TESTING

Run:
  Run-V20-All-Tests.bat

What it does:
- Opens the production landing page and public app.
- Runs the existing Apps Script backend regression suite through google.script.run.
- Tests landing-page links, live adventure data, images, public event cards, search, categories, Adventure Details, registration route, public/admin separation, mobile navigation, overflow, and browser errors.
- Uses a dedicated Chrome profile for organizer detection.
- Creates an HTML and JSON report in browser-tests\reports.

First run:
- The batch file automatically installs the Playwright test package.
- Chrome must already be installed.
- Organizer testing will show a warning until the dedicated test Chrome window is signed into the approved Google organizer account. Public and backend tests still run normally.

No production records are created, edited, registered, emailed, uploaded, or deleted.

V20.2 runner fix:
- Creates the reports folder before testing.
- Deletes stale latest-report.html before each run.
- Opens the HTML report only when it was actually generated.
- Saves the complete console output to reports\latest-run.log.
- Opens the diagnostic log in Notepad when report generation fails.


V20.2 runs Node.js and Playwright from a local Windows AppData folder so Google Drive paths and synced node_modules cannot corrupt the test engine. Reports are copied back into browser-tests\reports.
