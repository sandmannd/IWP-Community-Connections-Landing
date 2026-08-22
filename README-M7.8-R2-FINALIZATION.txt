M7.8 R2 finalization

Purpose:
- Forces a fresh Git-triggered Pages deployment after the ADVENTURE_IMAGES R2 binding was added.
- Adds /api/storage-health to verify the production deployment can see and query both D1 and R2.
- Keeps the existing R2 upload/serve implementation unchanged except for a clearer deployment-specific error and response marker.
- No Apps Script changes.

Expected health response after deployment:
  success: true
  d1Configured: true
  r2Configured: true
  r2Probe.ok: true

Then re-test Adventure Builder image upload.
