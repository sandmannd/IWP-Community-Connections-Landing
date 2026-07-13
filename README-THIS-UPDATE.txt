IWP Community Connections V23

Community Memories production completion patch:
- Fixed partial memory updates so saving a caption no longer clears Featured or changes approval.
- Unapproving a memory now safely removes Featured status.
- Featured memories are limited to one per adventure, not one across the entire platform.
- Memory captions are trimmed and limited to 240 characters server-side.
- Added stronger file validation and clearer corrupt-upload handling.
- Memory manager now resets its upload form when closed.
- Added event validation before admin memory listing, editing, and deletion.
- Expanded regression checks for per-adventure featured memories and approval integrity.

Baseline entering this patch:
Backend 248/248 PASS
Browser 22/22 PASS

Run the full backend and browser regression suites after deployment.
