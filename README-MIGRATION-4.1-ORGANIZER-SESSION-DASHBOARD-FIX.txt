SPRINT M4.1 — ORGANIZER SESSION & DASHBOARD FIX

BACKEND
- Exchanges Google Identity credentials for an opaque eight-hour organizer session.
- Validates organizer authorization again on every protected request.
- Adds explicit organizer sign-out session revocation.
- Keeps direct Google credential support as a compatibility fallback.

CLOUDFLARE
- Dashboard and adventure index share the same sessionStorage organizer session.
- Google ID credentials are used once and are no longer treated as the app session.
- Expired or invalid sessions return cleanly to sign-in.
- Clears stale JSONP requests and timers so delayed callbacks cannot replace a loaded dashboard with a false timeout.
