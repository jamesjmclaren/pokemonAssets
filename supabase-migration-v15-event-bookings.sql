-- Migration v15: Event bookings table for TCG card show table sales
-- If you already ran an earlier version of this migration, run v16 instead.
CREATE TABLE event_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  instagram_handle TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('TCG', 'Sports', 'Collectibles', 'Other')),
  tables_count INTEGER NOT NULL CHECK (tables_count IN (1, 2, 3)),
  event_day TEXT NOT NULL CHECK (event_day IN ('Saturday', 'Sunday')),
  amount_paid_pence INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_bookings_payment_status ON event_bookings(payment_status);
CREATE INDEX idx_event_bookings_day ON event_bookings(event_day);

CREATE OR REPLACE FUNCTION update_event_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_bookings_updated_at
  BEFORE UPDATE ON event_bookings
  FOR EACH ROW EXECUTE FUNCTION update_event_bookings_updated_at();
