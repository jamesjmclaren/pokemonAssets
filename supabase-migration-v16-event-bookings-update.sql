-- Migration v16: Update event_bookings if v15 was already run with old schema
-- Only run this if you already ran the original v15 migration.
-- If starting fresh, run v15 only (it already has the correct schema).

ALTER TABLE event_bookings
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS event_day TEXT;

-- Backfill existing rows so NOT NULL constraints can be added
UPDATE event_bookings SET first_name = vendor_business_name WHERE first_name IS NULL;
UPDATE event_bookings SET last_name = '' WHERE last_name IS NULL;
UPDATE event_bookings SET event_day = 'Saturday' WHERE event_day IS NULL;

-- Rename vendor_business_name to business_name
ALTER TABLE event_bookings RENAME COLUMN vendor_business_name TO business_name;

-- Apply constraints
ALTER TABLE event_bookings
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ALTER COLUMN event_day SET NOT NULL;

ALTER TABLE event_bookings
  ADD CONSTRAINT event_bookings_event_day_check CHECK (event_day IN ('Saturday', 'Sunday'));

-- Update card_type constraint to include Collectibles
ALTER TABLE event_bookings DROP CONSTRAINT IF EXISTS event_bookings_card_type_check;
ALTER TABLE event_bookings
  ADD CONSTRAINT event_bookings_card_type_check CHECK (card_type IN ('TCG', 'Sports', 'Collectibles', 'Other'));

CREATE INDEX IF NOT EXISTS idx_event_bookings_day ON event_bookings(event_day);
