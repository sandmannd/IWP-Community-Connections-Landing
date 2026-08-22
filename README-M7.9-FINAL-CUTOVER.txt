M7.9 — Final Cutover, Regression & Google Apps Script Retirement

Production architecture after this release:
- Cloudflare Pages/Functions: application/API
- Cloudflare D1: authoritative application database
- Cloudflare R2: new adventure image storage
- Gmail API: outbound transactional email only
- Google Identity Services: organizer identity only
- GitHub Actions: daily 24-hour reminder / next-day thank-you automation
- Google Apps Script / Google Sheets: no production runtime dependency

Cloudflare secrets required:
ORGANIZER_SESSION_SECRET
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
GMAIL_REFRESH_TOKEN
GMAIL_FROM_ADDRESS
AUTOMATION_SECRET

Cloudflare bindings required:
COMMUNITY_DB (D1)
ADVENTURE_IMAGES (R2)

GitHub Actions repository secret required:
AUTOMATION_SECRET (same value as Cloudflare)

Final cleanup after regression:
- Remove Cloudflare IWP_APPS_SCRIPT_URL
- Remove Cloudflare REGISTRATION_RELAY_SECRET
- Remove COMMUNITY_EMAIL_FROM / EMAIL binding if they were ever added for abandoned Cloudflare Email Service testing
- Disable/archive the old Apps Script web-app deployment only AFTER all M7.9 regression checks pass
- Keep the Google Sheet as a read-only historical backup until you are comfortable deleting it
