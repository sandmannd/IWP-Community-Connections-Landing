IWP COMMUNITY CONNECTIONS - COMMUNITY MEMORIES SPRINT 2

Changes:
- Pending submissions are shown before approved memories in the organizer manager.
- Added explicit Reject action for individual and selected pending memories.
- Rejected photos move into the adventure Archive folder instead of being destroyed.
- Rejected records leave the moderation queue and never appear in the public gallery.
- Added a Sprint 2 acceptance test covering approval, featured selection, public visibility, rejection, archive movement, and cleanup.

TEST
File: Memories.gs
Function: testCommunityMemoriesModerationSprint2

Do not commit or deploy until the test reports success: true with no errors.
