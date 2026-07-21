IWP COMMUNITY CONNECTIONS - SPRINT 8.2 CAPACITY CONSISTENCY

FIXED
- Public adventure details use the same seat-consumption rules as the backend.
- Organizer summary totals exclude Canceled, Cancelled, Waitlist, Waitlisted, and Declined registrations.
- Party-size math now uses one shared client-side helper.

CHANGED FILES
- JavaScript.html

DEPLOYMENT
1. Replace JavaScript.html in the Apps Script project.
2. Run: clasp push --force
3. Create a new web-app deployment version.
4. Live verification can wait until an adventure has registrations.
