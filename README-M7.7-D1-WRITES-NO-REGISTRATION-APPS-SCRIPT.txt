M7.7 — D1 Organizer Writes + Remove Apps Script From Registration Flow

This release:
- Removes the Apps Script relay from new public registrations. D1 is the sole registration write target.
- Moves organizer registration actions (check-in, cancel, payment, edits) to D1.
- Moves Adventure Builder load/save and adventure publish/cancel/delete actions to D1.
- Keeps organizer authentication and reads on Cloudflare/D1.

Intentionally still deferred to M7.8:
- Transactional participant/organizer email delivery from Cloudflare.
- Organizer bulk email delivery.
- Adventure image upload storage migration away from Google Drive/Apps Script.

REGISTRATION_RELAY_SECRET is no longer used by the public registration path and can be removed later during final cleanup.
Google Sheets is no longer mirrored for new registrations after M7.7.
