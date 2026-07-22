IWP Community Connections - Sprint 8.12
Stylesheet Cleanup and Regression Hardening

Changes:
- Removed seven exact duplicate copies of the shared modal, mobile, focus, retry, and touch-interaction CSS block.
- Preserved the first canonical copy in its original cascade position.
- Reduced Styles.html without changing selectors, declarations, or the Cloudflare-hosted banner.
- Confirmed Styles.html contains no nested <style> tags that could print CSS above the page.

Deployment:
1. Copy the project files into the existing repository.
2. Commit: Sprint 8.12 - Remove duplicate shared CSS
3. Push to GitHub.
4. Run clasp push --force.
5. Create a new Apps Script deployment version.

No Cloudflare deployment is required.
