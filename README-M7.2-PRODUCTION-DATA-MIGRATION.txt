IWP COMMUNITY CONNECTIONS - M7.2 PRODUCTION DATA MIGRATION
==========================================================

PURPOSE
-------
Copy the current production Google Sheets data into Cloudflare D1 without
changing production traffic. Google Apps Script + Sheets remain the live source
of truth throughout M7.2.

BACKEND / APPS SCRIPT CHANGE
----------------------------
MigrationExport.gs adds one manual utility:

  exportD1MigrationPackage()

Run it from the Apps Script editor after clasp push. It reads the production
Community Connections spreadsheet and writes two private files into:

  Community Storage / System / Backups

Files:
  - JSON snapshot for audit/recovery
  - SQL import file ready for Cloudflare D1

The export covers:
  admins, settings, event types, events, registrations, memories,
  resource templates, adventure resources, and logs.

The function does NOT change any production read/write path.

LANDING / CLOUDFLARE CHANGE
---------------------------
Adds:

  /api/migration-reconcile

This endpoint returns D1 row counts, the latest M7.2 import package marker,
and orphan checks for registrations, memories, and resources. It returns no
registration/person details.

M7.2 IMPORT WORKFLOW
--------------------
1. Push the Apps Script repo with clasp.
2. Run exportD1MigrationPackage() manually in Apps Script.
3. Download the generated .sql file from Google Drive.
4. Put that .sql file in the Landing repo (temporary local file only; DO NOT
   commit it because it contains production registration data).
5. Import it:

   npx wrangler d1 execute iwp-community-connections --remote --file="<downloaded-file>.sql"

6. Deploy the Landing repo so /api/migration-reconcile is available.
7. Open:

   https://connections.redlinecreates.com/api/migration-reconcile

8. Compare D1 counts with the counts returned by exportD1MigrationPackage().
   All three integrity values must be 0.
9. Delete the downloaded SQL file from the Landing repo folder after verification.

IMPORTANT
---------
- Do not commit the generated migration JSON or SQL files.
- Do not switch production reads/writes to D1 in M7.2.
- The import uses INSERT OR REPLACE and migration_imports tracking so a fresh
  export can be imported again before cutover if Sheets changes.
