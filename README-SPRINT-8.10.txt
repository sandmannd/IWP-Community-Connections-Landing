IWP Community Connections - Sprint 8.10

Event-day participant count hardening

Changes:
- Client-side participant totals now recognize current and legacy adult/child column names.
- Event Day dashboard, closeout summary, CSV roster, reports, group filtering, and participant cards all use the same shared party-size resolver.
- Client capacity filtering now recognizes Status, RegistrationStatus, and Registration Status fields.
- Cancelled, canceled, waitlisted, and declined registrations remain excluded consistently.

Deployment:
1. Copy these files into the existing IWP-Community-Connections repository.
2. Commit and push.
3. Run clasp push --force.
4. Create a new Apps Script web-app deployment version.
