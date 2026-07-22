IWP Community Connections Landing — Sprint 9M Hotfix

Fixed:
- A single available category no longer stretches across the page and creates an enormous portrait tile.
- The single category tile is capped at a compact 16:9 card.
- The featured adventure now attempts to display the actual published event image, including Google Drive thumbnail URLs returned by the Community Connections API.
- The category icon remains only as a true image-load fallback.
- The one-adventure featured card is narrower and more compact on desktop and mobile.

Deployment:
1. Replace the landing project files with this package.
2. Commit and push to the landing repository.
3. Deploy the Cloudflare Pages update.

Suggested commit:
Fix oversized landing category and featured event image
