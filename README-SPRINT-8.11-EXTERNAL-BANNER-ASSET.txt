Sprint 8.11 - External Banner Asset Cleanup

Changes:
- Removed the large base64-embedded IWP Community Connections banner from Index.html.
- Index.html now loads the existing Cloudflare-hosted banner directly:
  https://connections.redlinecreates.com/assets/community-connections-da7705b32bd8.png
- Preserved the existing responsive image element, alt text, decoding, and fetch priority.
- This reduces the Apps Script HTML payload substantially and prevents the banner from being duplicated inside every rendered page response.

Deployment:
1. Copy these files into the existing repository and replace matching files.
2. Commit and push.
3. Run clasp push --force.
4. Create a new Apps Script deployment version.

No Cloudflare deployment is required because the referenced asset already exists.
