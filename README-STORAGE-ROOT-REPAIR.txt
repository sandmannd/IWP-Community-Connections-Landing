IWP Community Connections - Storage Root Repair

Correct data folder:
https://drive.google.com/drive/folders/1kjZRw4KzcWEqglHaO9aO8rYUAo7OiK4B

Changes:
- Config.gs now identifies that exact folder as the permanent storage root.
- Storage.gs now treats the configured root ID as authoritative instead of a stale Settings value.
- Existing linked adventure folders found elsewhere are moved into the correct Adventures/year folder.
- Missing adventure folders and standard subfolders are recreated.
- Added repairAdventureStorageLocations() for one-time repair and verification.

After clasp push --force, run:
repairAdventureStorageLocations

Expected rootFolderId:
1kjZRw4KzcWEqglHaO9aO8rYUAo7OiK4B
