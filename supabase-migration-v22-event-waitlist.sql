-- Migration v22: waitlist for sold-out table types
-- When a vendor wants a type that's sold out, they can leave their email and be
-- notified when one frees up (e.g. after a refund/release). Idempotent.

CREATE TABLE IF NOT EXISTS event_waitlist (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_day       TEXT        NOT NULL,
  table_type_key  TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  notified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_event ON event_waitlist(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_match ON event_waitlist(event_id, event_day, table_type_key);

ALTER TABLE event_waitlist ENABLE ROW LEVEL SECURITY;
