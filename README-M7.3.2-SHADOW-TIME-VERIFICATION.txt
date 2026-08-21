M7.3.2 — Shadow Time Verification

Purpose:
- Defensively normalizes start/end times during comparison as well as during D1 payload construction.
- Changes the migration response marker to M7.3.2 so the deployed endpoint can be positively verified.
- Does not change D1 data.
- Does not cut production over from Google Apps Script.

Expected verification:
GET /api/migration-shadow-read
migration = M7.3.2
match = true
mismatchCount = 0
