M7.13 — Recurring Adventures and Holiday Blackouts

1. BACK UP the D1 database first.
2. Run migrations/M7.13-recurring-adventures.sql ONCE in Cloudflare D1 Console. It only creates three new tables.
3. Deploy extracted ZIP contents to GitHub main (same workflow as M7.12).
4. In Create Adventure, save your template adventure first. Reopen it via Manage Adventures, choose recurrence, preview, then generate.
5. Generated occurrences are separate events with independent registrations. The original event is NOT automatically changed or removed. Generated events inherit Published/Draft from the template, but are not featured.
6. Generating again skips already-generated dates. Cancel/edit occurrences individually in Manage Adventures. Changing the template does NOT automatically update existing occurrences. No background scheduler: generate the next 6 or 12 when needed.
7. Custom blackouts are managed from the Recurring Adventures panel in the organizer builder. Changes apply to future generation only.
8. Christmas/New Year blackouts are Dec 24–31 and Jan 1–7 inclusive. Federal holidays include observed days; additional exclusions include Easter, Mother's Day, Father's Day and Halloween.

NOTE: This is an additive feature. It does not delete or modify any existing event registrations. Test on a draft first before publishing multiple occurrences.

M7.13.1: Added Every Other Week schedule, anchored to the original adventure start date. Holiday skips do not shift the 14-day cycle. No additional D1 migration is needed.
