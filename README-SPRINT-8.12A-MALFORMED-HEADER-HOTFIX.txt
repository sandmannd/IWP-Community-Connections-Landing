IWP Community Connections - Sprint 8.12A

Hotfix for malformed Apps Script HTML after Sprint 8.12.

Fixed in Index.html:
- Removed the accidental extra quote after the external banner image URL.
- Properly closed .iwp-app-header-art with </div>.
- Properly closed the page header with </header> instead of </section>.

The banner continues loading from the existing Cloudflare asset.
No Cloudflare deployment is required.
