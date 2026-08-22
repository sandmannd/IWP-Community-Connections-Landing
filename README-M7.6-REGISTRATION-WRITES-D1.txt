M7.6 — Registration Writes -> D1

- Registration page data now comes from Cloudflare D1.
- New registrations are validated and written to D1 first.
- Duplicate/capacity/waitlist/payment/accommodation/resource rules are preserved in the Cloudflare endpoint.
- During the transition, each successful D1 registration is securely mirrored to Google Sheets so existing email/background services keep working.
- The relay requires REGISTRATION_RELAY_SECRET in Cloudflare and the same Script Property in Apps Script.
- Google is no longer authoritative for new registration writes.
- Organizer/event writes are not moved in this sprint.
