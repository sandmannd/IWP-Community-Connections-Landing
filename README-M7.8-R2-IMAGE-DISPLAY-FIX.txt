M7.8 — R2 image display finalization

Fixes the remaining R2 display issue after upload/storage was verified healthy.

Changes:
- Allows the trusted same-origin /api/adventure-image R2 delivery URL in the active landing-page image normalizer.
- Allows the same R2 delivery URL on public adventure detail pages.
- Future R2 uploads return an absolute same-origin image URL.
- Cache-busts active public JS so browsers immediately receive the fix.
- Existing Google Drive image URLs remain supported.
- No Apps Script changes.
