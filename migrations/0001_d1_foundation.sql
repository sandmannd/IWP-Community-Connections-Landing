-- IWP Community Connections
-- M7.1 Cloudflare D1 foundation
-- This schema intentionally does not change production traffic yet.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS admins (
  admin_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL COLLATE NOCASE,
  role TEXT NOT NULL DEFAULT 'Viewer',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT,
  updated_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

CREATE TABLE IF NOT EXISTS settings (
  setting_id TEXT PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL DEFAULT '',
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS event_types (
  event_type_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_event_types_active_name ON event_types(active, name);

CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'Draft',
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  title TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  image_credit TEXT NOT NULL DEFAULT '',
  cover_memory_id TEXT NOT NULL DEFAULT '',
  organizer_reflection TEXT NOT NULL DEFAULT '',
  facebook_album_url TEXT NOT NULL DEFAULT '',
  custom_event_type TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  start_time TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  location_name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  what_to_expect TEXT NOT NULL DEFAULT '',
  what_to_bring TEXT NOT NULL DEFAULT '',
  provided TEXT NOT NULL DEFAULT '',
  special_notes TEXT NOT NULL DEFAULT '',
  custom_acknowledgements TEXT NOT NULL DEFAULT '',
  allow_flexible_attendance_dates INTEGER NOT NULL DEFAULT 0 CHECK (allow_flexible_attendance_dates IN (0,1)),
  allow_organizer_provided_accommodation INTEGER NOT NULL DEFAULT 0 CHECK (allow_organizer_provided_accommodation IN (0,1)),
  allow_bring_own_accommodation INTEGER NOT NULL DEFAULT 0 CHECK (allow_bring_own_accommodation IN (0,1)),
  allow_participant_reserved_accommodation INTEGER NOT NULL DEFAULT 0 CHECK (allow_participant_reserved_accommodation IN (0,1)),
  allow_day_visitors INTEGER NOT NULL DEFAULT 0 CHECK (allow_day_visitors IN (0,1)),
  children_allowed INTEGER NOT NULL DEFAULT 0 CHECK (children_allowed IN (0,1)),
  registration_required INTEGER NOT NULL DEFAULT 1 CHECK (registration_required IN (0,1)),
  free_event INTEGER NOT NULL DEFAULT 1 CHECK (free_event IN (0,1)),
  paid_event INTEGER NOT NULL DEFAULT 0 CHECK (paid_event IN (0,1)),
  variable_cost INTEGER NOT NULL DEFAULT 0 CHECK (variable_cost IN (0,1)),
  cost_details TEXT NOT NULL DEFAULT '',
  adult_cost REAL,
  child_cost REAL,
  payment_due TEXT NOT NULL DEFAULT '',
  venmo_enabled INTEGER NOT NULL DEFAULT 0 CHECK (venmo_enabled IN (0,1)),
  venmo_handle TEXT NOT NULL DEFAULT '',
  cash_app_enabled INTEGER NOT NULL DEFAULT 0 CHECK (cash_app_enabled IN (0,1)),
  cash_app_handle TEXT NOT NULL DEFAULT '',
  cash_enabled INTEGER NOT NULL DEFAULT 0 CHECK (cash_enabled IN (0,1)),
  pay_at_event_enabled INTEGER NOT NULL DEFAULT 0 CHECK (pay_at_event_enabled IN (0,1)),
  buy_own_tickets_enabled INTEGER NOT NULL DEFAULT 0 CHECK (buy_own_tickets_enabled IN (0,1)),
  ticket_purchase_link TEXT NOT NULL DEFAULT '',
  max_participants INTEGER,
  waitlist_enabled INTEGER NOT NULL DEFAULT 0 CHECK (waitlist_enabled IN (0,1)),
  organizer_name TEXT NOT NULL DEFAULT '',
  organizer_email TEXT NOT NULL DEFAULT '',
  organizer_phone TEXT NOT NULL DEFAULT '',
  organizer_photo_url TEXT NOT NULL DEFAULT '',
  show_attendee_names INTEGER NOT NULL DEFAULT 0 CHECK (show_attendee_names IN (0,1)),
  registration_link TEXT NOT NULL DEFAULT '',
  drive_folder_id TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_status_start ON events(status, start_date, start_time);
CREATE INDEX IF NOT EXISTS idx_events_featured_start ON events(featured, start_date);
CREATE INDEX IF NOT EXISTS idx_events_organizer_email ON events(organizer_email);

CREATE TABLE IF NOT EXISTS registrations (
  registration_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  adult_count INTEGER NOT NULL DEFAULT 0,
  child_count INTEGER NOT NULL DEFAULT 0,
  adult_guest_names TEXT NOT NULL DEFAULT '',
  child_names TEXT NOT NULL DEFAULT '',
  emergency_contact_name TEXT NOT NULL DEFAULT '',
  emergency_contact_phone TEXT NOT NULL DEFAULT '',
  payment_status TEXT NOT NULL DEFAULT 'Not Required',
  payment_method TEXT NOT NULL DEFAULT '',
  payment_notes TEXT NOT NULL DEFAULT '',
  show_name_on_attendee_list INTEGER NOT NULL DEFAULT 0 CHECK (show_name_on_attendee_list IN (0,1)),
  acknowledgement_member_organized INTEGER NOT NULL DEFAULT 0 CHECK (acknowledgement_member_organized IN (0,1)),
  acknowledgement_voluntary INTEGER NOT NULL DEFAULT 0 CHECK (acknowledgement_voluntary IN (0,1)),
  acknowledgement_respect INTEGER NOT NULL DEFAULT 0 CHECK (acknowledgement_respect IN (0,1)),
  acknowledgement_photos_videos INTEGER NOT NULL DEFAULT 0 CHECK (acknowledgement_photos_videos IN (0,1)),
  acknowledgement_payment INTEGER NOT NULL DEFAULT 0 CHECK (acknowledgement_payment IN (0,1)),
  acknowledgement_refund INTEGER NOT NULL DEFAULT 0 CHECK (acknowledgement_refund IN (0,1)),
  custom_acknowledgements_accepted TEXT NOT NULL DEFAULT '',
  attendance_type TEXT NOT NULL DEFAULT '',
  arrival_date TEXT NOT NULL DEFAULT '',
  departure_date TEXT NOT NULL DEFAULT '',
  day_visit_date TEXT NOT NULL DEFAULT '',
  accommodation_type TEXT NOT NULL DEFAULT '',
  accommodation_site_number TEXT NOT NULL DEFAULT '',
  resource_reservations TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  registered_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_registrations_event_status ON registrations(event_id, status);
CREATE INDEX IF NOT EXISTS idx_registrations_event_registered ON registrations(event_id, registered_at);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);

CREATE TABLE IF NOT EXISTS memories (
  memory_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  file_id TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0,1)),
  uploaded_by TEXT NOT NULL DEFAULT '',
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_memories_event_approved ON memories(event_id, approved, created_at);

CREATE TABLE IF NOT EXISTS resource_templates (
  template_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  built_in INTEGER NOT NULL DEFAULT 0 CHECK (built_in IN (0,1)),
  accommodation_options TEXT NOT NULL DEFAULT '',
  resources_json TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS adventure_resources (
  resource_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  quantity INTEGER,
  capacity_per_unit INTEGER,
  reservation_behavior TEXT NOT NULL DEFAULT '',
  time_slots TEXT NOT NULL DEFAULT '',
  available_start_date TEXT NOT NULL DEFAULT '',
  available_end_date TEXT NOT NULL DEFAULT '',
  reservation_required INTEGER NOT NULL DEFAULT 0 CHECK (reservation_required IN (0,1)),
  allow_waitlist INTEGER NOT NULL DEFAULT 0 CHECK (allow_waitlist IN (0,1)),
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_resources_event_active ON adventure_resources(event_id, active);

CREATE TABLE IF NOT EXISTS logs (
  log_id TEXT PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'INFO',
  message TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- Used while we copy production Sheets rows into D1. The migration is resumable
-- and auditable without changing the live application.
CREATE TABLE IF NOT EXISTS migration_imports (
  source_name TEXT NOT NULL,
  source_row_key TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  source_updated_at TEXT,
  checksum TEXT,
  PRIMARY KEY (source_name, source_row_key)
);

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0001_d1_foundation');
