M7.5 — Organizer reads + Cloudflare authentication

What moves to Cloudflare/D1 in this sprint:
- Google organizer credential verification happens in Cloudflare Pages Functions.
- Approved organizer lookup is read from D1 admins.
- Organizer sessions are HMAC-signed Cloudflare sessions (8 hours).
- Command Center reads from D1.
- Manage Adventures reads from D1.
- Organizer Analytics reads from D1.
- Registration Manager reads from D1.

What remains on Apps Script for later sprints:
- Adventure create/edit/publish/cancel/delete writes.
- Registration changes/check-in writes.
- Email sending and other Google-specific services.
- Image upload / Drive storage.

Compatibility bridge:
- At sign-in Cloudflare also attempts to obtain a legacy Apps Script organizer token.
- The browser stores both tokens. D1 reads use the Cloudflare token; remaining legacy writes use the legacy token when available.
- If Apps Script authorization is broken, Cloudflare/D1 organizer login and read-only pages can still work, while legacy write actions may be unavailable until later migration sprints.

Required Cloudflare secret BEFORE deploying M7.5:
ORGANIZER_SESSION_SECRET
Use a long random value (at least 32 random bytes / 64 hex characters).
