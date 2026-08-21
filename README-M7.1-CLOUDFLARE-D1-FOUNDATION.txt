IWP Community Connections - M7.1 Cloudflare D1 Foundation

PURPOSE
Begin the migration away from Google Apps Script / Google Sheets without changing production behavior.

WHAT THIS BUILD ADDS
1. migrations/0001_d1_foundation.sql
   - Creates the D1 schema corresponding to the production Sheets database.
   - Includes Events, Registrations, Admins, Settings, Event Types, Memories,
     Adventure Resources, Resource Templates, Logs, and migration tracking.
   - Adds indexes for the public schedule, organizer lookups, registrations,
     resources, and memories.

2. functions/api/migration-health.js
   - Migration-only Cloudflare Pages Function.
   - Verifies the COMMUNITY_DB binding and installed schema.
   - Reports table counts.
   - Nothing in the live application calls this route yet.

PRODUCTION SAFETY
- No existing production route was changed.
- config.js still points at the existing Apps Script deployment.
- Existing /api routes still proxy to Apps Script.
- The public schedule, organizer login, registration, email, and image flows are unchanged.
- D1 is NOT the production database yet.

CLOUDFLARE SETUP FOR NEXT STEP
Create a D1 database named: iwp-community-connections
Bind it to the Pages project as: COMMUNITY_DB
Then apply migrations/0001_d1_foundation.sql to that database.

DO NOT REMOVE APPS SCRIPT OR THE GOOGLE SHEET YET.
They remain the production system until data import and side-by-side regression are complete.

NEXT SPRINT - M7.2
Build the controlled Sheets -> D1 import path, import all existing production data,
validate row counts and relationships, and produce a migration reconciliation report.
There will still be no production cutover in M7.2.
