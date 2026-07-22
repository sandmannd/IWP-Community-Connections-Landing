IWP Community Connections - V25 Past Adventures & Community Memories Fix

Changed files:
- Events.gs
- JavaScript.html
- Index.html
- Styles.html
- Test.gs

What changed:
- Public event data now includes Published and Complete adventures only.
- Published adventures remain in All Upcoming Adventures.
- Complete adventures appear in a separate Past Adventures & Community Memories archive.
- Completed adventure details remain publicly accessible.
- Registration buttons remain unavailable on completed adventures.
- Search and type filters apply to both upcoming and past adventures.
- Backend regression expectation updated for the public archive behavior.

Install:
1. Copy the five changed source files over the matching files in the project folder.
2. Run: clasp push --force
3. Deploy a new web-app version if the deployment is versioned.
4. Open the public page in an incognito window.
5. Confirm Rum River Tubing appears under Past Adventures & Community Memories.
6. Open it and submit a Community Memory for approval testing.
