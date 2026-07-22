IWP Community Connections - Community Memories Storage Acceptance Sprint

Modified files
- Memories.gs
  Added a safe end-to-end production acceptance test for the Community Memories
  Drive pipeline. The test creates a temporary 1x1 PNG, verifies pending storage,
  approval movement, public-gallery availability, and then removes all test data.

Test to run
- File: Memories.gs
- Function: testCommunityMemoriesStoragePipeline

Expected result
- success: true
- every item under checks: true
- errors: []

The test cleans up its temporary Memories row and Drive image automatically.
No live deployment is required for this test-only sprint.
