M7.3.1 — Shadow read time normalization

- Normalizes D1 HH:MM / HH:MM:SS values to the existing public Apps Script 12-hour display contract.
- Keeps Google Apps Script as the live production backend.
- Changes only the M7.3 shadow-read comparison endpoint.
- No D1 data mutation and no production cutover.

Expected verification:
/api/migration-shadow-read should report match=true and mismatchCount=0 when Google and D1 data otherwise agree.
