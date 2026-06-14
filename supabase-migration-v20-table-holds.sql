-- Migration v20: 15-minute table holds + double-booking safeguard
-- Idempotent — safe to re-run.
--
-- hold_expires_at: when a 'pending' reservation expires (NULL once paid).
-- The unique index guarantees at most ONE active row (paid, or a live pending
-- hold) per table per day, so the same table can never be sold twice. Expired
-- holds are flipped to 'expired' by the app, which frees the slot.

ALTER TABLE event_bookings_v2 ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ev2_hold_expires ON event_bookings_v2(hold_expires_at);

-- Double-booking safeguard: at most one active booking per (event, day, table).
-- NOTE: if this fails with a "could not create unique index" / duplicate key
-- error, you have existing duplicate test rows — clear them first, e.g.:
--   DELETE FROM event_bookings_v2 WHERE table_label IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ev2_active_table
  ON event_bookings_v2 (event_id, event_day, table_label)
  WHERE table_label IS NOT NULL AND payment_status IN ('paid', 'pending');
