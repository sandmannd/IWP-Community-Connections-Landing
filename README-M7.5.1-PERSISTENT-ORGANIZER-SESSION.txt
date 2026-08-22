M7.5.1 — Persistent Organizer Session

Purpose
- Extends Cloudflare-signed organizer sessions from 8 hours to 30 days.
- Stores the signed session in a Secure, HttpOnly, SameSite=Lax cookie.
- Restores a remembered organizer session automatically on organizer.html.
- Keeps the existing local/session storage compatibility used by organizer pages.
- Explicit organizer sign-out clears both browser storage and the persistent cookie.
- Every restored session is revalidated against the D1 admins table, so disabling an organizer still takes effect.

Production scope
- Organizer auth/session only.
- No D1 schema changes.
- No Apps Script repository changes.
- No registration or organizer write cutover.

Expected behavior
- Sign in once on a trusted browser/device.
- Reopening the organizer page within 30 days should go directly to the Command Center.
- Explicit Log Out, clearing site data, rotating ORGANIZER_SESSION_SECRET, session expiry, or disabling the admin account requires sign-in again.
