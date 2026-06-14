-- Migration v19: per-table booking
-- Records WHICH specific table each booking row is for (e.g. 'S5', 'E3', 'P12'),
-- so the admin view can show who bought each numbered table and the floor plan
-- can mark individual tables as sold.
-- Idempotent — safe to re-run.

ALTER TABLE event_bookings_v2 ADD COLUMN IF NOT EXISTS table_label TEXT;

CREATE INDEX IF NOT EXISTS idx_ev2_label ON event_bookings_v2(table_label);
