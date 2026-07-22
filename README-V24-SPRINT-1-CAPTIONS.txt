IWP Community Connections - V24 Sprint 1 Community Memories Caption Fix

Updated files:
- Memories.gs
- JavaScript.html
- Test.gs

Fix:
- Public Community Memories now normalizes and renders captions from the standard Caption field and supported legacy/imported caption field names.
- Gallery cards, image alternative text, and lightbox captions use the same caption resolver.
- Backend client payload always exposes the normalized value as Caption.
- Added backend regression coverage for standard and legacy caption fields.

Deployment test:
1. Push the updated Apps Script files.
2. Deploy a new web app version.
3. Open a completed adventure with an approved memory containing a caption.
4. Confirm the caption appears below the gallery image and inside the lightbox.
