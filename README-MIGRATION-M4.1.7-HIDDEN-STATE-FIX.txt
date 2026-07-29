Migration M4.1.7 — Organizer Hidden-State Fix

Fixes the organizer dashboard remaining behind the sign-in/loading cards after a successful authenticated API response.

Root cause:
The organizer state cards set display:flex in organizer.css. That author CSS overrode the browser's default [hidden] styling, so JavaScript changed the hidden attributes correctly but the access/loading cards remained visible.

Changes:
- Adds [hidden]{display:none!important} to organizer.css.
- Versions the active organizer scripts as organizer-m417.js and organizer-adventures-m417.js.
- Removes obsolete generated organizer JavaScript versions to prevent stale flows from being deployed accidentally.
