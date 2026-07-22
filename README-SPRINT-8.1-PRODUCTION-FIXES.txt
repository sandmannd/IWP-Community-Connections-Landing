IWP COMMUNITY CONNECTIONS - SPRINT 8.1 PRODUCTION FIXES

FIXED
- Multi-day adventures remain visible through their EndDate instead of disappearing after the StartDate rolls over.
- Registration capacity matching now recognizes Event ID and Adventure ID legacy column variants.
- Canceled, Cancelled, Waitlisted, and Declined rows do not consume available seats.
- The Cloudflare landing page uses a compact featured layout when only one live adventure exists.

APPS SCRIPT FILES
- PublicApi.gs
- Registration.gs
- Test.gs

CLOUDFLARE LANDING FILES
- site.js
- styles.css

DEPLOYMENT
1. Replace the matching files in both project folders.
2. Apps Script: clasp push --force, then create a new web-app deployment version.
3. Landing page: commit and push the Cloudflare project.
4. Verify a multi-day adventure during its second day and confirm live seat totals.
