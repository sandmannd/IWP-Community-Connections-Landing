-- Execute once in Cloudflare D1 Console before deploying M7.13. Additive only.
CREATE TABLE IF NOT EXISTS recurring_series (
 series_id TEXT PRIMARY KEY, template_event_id TEXT NOT NULL UNIQUE,
 frequency TEXT NOT NULL, week_ordinal INTEGER, weekday INTEGER NOT NULL,
 skip_holidays INTEGER NOT NULL DEFAULT 1, allow_holidays INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS recurring_occurrences (
 series_id TEXT NOT NULL, event_id TEXT NOT NULL UNIQUE,
 occurrence_date TEXT NOT NULL, PRIMARY KEY(series_id,occurrence_date)
);
CREATE TABLE IF NOT EXISTS recurring_blackouts (
 blackout_id TEXT PRIMARY KEY, start_date TEXT NOT NULL,
 end_date TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL
);
