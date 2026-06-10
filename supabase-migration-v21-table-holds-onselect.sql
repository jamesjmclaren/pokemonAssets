-- Migration v21: reserve-on-select holds
-- A short-lived hold is created the moment a vendor clicks a table, keyed by a
-- per-browser hold_token. Holds live in their own table (no vendor details yet),
-- and are converted to paid rows in event_bookings_v2 by the Stripe webhook.
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS event_table_holds (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_day   TEXT        NOT NULL,
  table_label TEXT        NOT NULL,
  hold_token  TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active hold per table per day. Expired rows are purged by the app before
-- a new hold is inserted, so this also blocks two people grabbing the same table.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_event_table_hold
  ON event_table_holds (event_id, event_day, table_label);

CREATE INDEX IF NOT EXISTS idx_holds_token   ON event_table_holds(hold_token);
CREATE INDEX IF NOT EXISTS idx_holds_expires ON event_table_holds(expires_at);

-- Service-role only (same pattern as the other event tables).
ALTER TABLE event_table_holds ENABLE ROW LEVEL SECURITY;
