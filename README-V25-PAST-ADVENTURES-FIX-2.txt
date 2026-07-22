IWP Community Connections - V25 Past Adventures Fix 2

This build fixes completed adventures that still failed to appear publicly.

Root cause addressed:
- Older or existing rows may contain either "Complete" or "Completed".
- The backend previously accepted only the exact configured value "Complete".

Changed files:
- Utilities.gs
- Events.gs
- Memories.gs
- PublicApi.gs
- JavaScript.html

Behavior:
- Both Complete and Completed are treated as completed adventures.
- Completed adventures are returned to public browsing.
- Completed adventure detail pages stay publicly accessible.
- Community Memory submissions remain limited to completed adventures.
- The JSONP landing endpoint now also returns a past collection.
- Registration remains unavailable because completed cards are not Published.

Deploy:
1. Replace the matching files in the project folder.
2. Run: clasp push --force
3. Create a NEW web-app deployment version (Deploy > Manage deployments > Edit > New version > Deploy).
4. Open the public URL in a fresh incognito window.
