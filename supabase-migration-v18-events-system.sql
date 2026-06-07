-- Migration v18: Generalized events system (idempotent — safe to re-run)
-- Creates: events, event_table_types, event_bookings_v2
-- Seeds/refreshes: The Collectors Exhibition (Copper Box Arena, June 2027)
-- NOTE: Run after v17. Existing event_bookings table is NOT affected.

-- ============================================================
-- 1. events — master event records
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  venue TEXT NOT NULL,
  event_days TEXT[] NOT NULL,    -- e.g. ARRAY['Saturday', 'Sunday']
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_slug   ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active);

-- ============================================================
-- 2. event_table_types — per-event table type config
-- ============================================================
CREATE TABLE IF NOT EXISTS event_table_types (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type_key         TEXT    NOT NULL,               -- 'standard' | 'corner' | 'premier_corner'
  label            TEXT    NOT NULL,
  description      TEXT,
  price_pence      INTEGER NOT NULL CHECK (price_pence > 0),
  total_available  INTEGER NOT NULL CHECK (total_available > 0),
  display_color    TEXT    NOT NULL DEFAULT '#D4AF37',
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, type_key)
);

CREATE INDEX IF NOT EXISTS idx_event_table_types_event ON event_table_types(event_id);

-- ============================================================
-- 3. event_bookings_v2 — one row per line item (type × day)
-- ============================================================
CREATE TABLE IF NOT EXISTS event_bookings_v2 (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT    NOT NULL,              -- suffixed per row: {session_id}_{i}
  payment_status    TEXT    NOT NULL DEFAULT 'pending'
                            CHECK (payment_status IN ('pending', 'paid', 'expired')),
  event_id          UUID    NOT NULL REFERENCES events(id),
  event_day         TEXT    NOT NULL,              -- 'Saturday' | 'Sunday'
  table_type_key    TEXT    NOT NULL,
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  first_name        TEXT    NOT NULL,
  last_name         TEXT    NOT NULL,
  business_name     TEXT    NOT NULL,
  instagram_handle  TEXT,
  email             TEXT    NOT NULL,
  phone             TEXT    NOT NULL,
  card_types        TEXT    NOT NULL,
  amount_paid_pence INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ev2_status ON event_bookings_v2(payment_status);
CREATE INDEX IF NOT EXISTS idx_ev2_event  ON event_bookings_v2(event_id);
CREATE INDEX IF NOT EXISTS idx_ev2_day    ON event_bookings_v2(event_day);
CREATE INDEX IF NOT EXISTS idx_ev2_type   ON event_bookings_v2(table_type_key);

CREATE OR REPLACE FUNCTION update_event_bookings_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_bookings_v2_updated_at ON event_bookings_v2;
CREATE TRIGGER event_bookings_v2_updated_at
  BEFORE UPDATE ON event_bookings_v2
  FOR EACH ROW EXECUTE FUNCTION update_event_bookings_v2_updated_at();

-- ============================================================
-- RLS: service-role access only — same pattern as event_bookings
-- (ENABLE is a no-op if already enabled, so this is safe to re-run)
-- ============================================================
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_table_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bookings_v2 ENABLE ROW LEVEL SECURITY;
-- No public policies: anon/authenticated roles are denied all access.
-- Server-side routes use the service_role key which bypasses RLS.

-- ============================================================
-- 4. Seed / refresh: The Collectors Exhibition — Copper Box Arena, June 2027
-- Re-running UPDATEs the values, so prices/counts always match the latest.
-- NOTE: Confirm exact Sat/Sun dates before going live.
-- ============================================================
INSERT INTO events (slug, name, venue, event_days, start_date, end_date, is_active)
VALUES (
  'collectors-exhibition-june-2027',
  'The Collectors Exhibition',
  'Copper Box Arena',
  ARRAY['Saturday', 'Sunday'],
  '2027-06-04',
  '2027-06-05',
  true
)
ON CONFLICT (slug) DO UPDATE
  SET name       = EXCLUDED.name,
      venue      = EXCLUDED.venue,
      event_days = EXCLUDED.event_days,
      start_date = EXCLUDED.start_date,
      end_date   = EXCLUDED.end_date,
      is_active  = EXCLUDED.is_active;

INSERT INTO event_table_types
  (event_id, type_key, label, description, price_pence, total_available, display_color, sort_order)
SELECT
  e.id, v.type_key, v.label, v.description, v.price_pence, v.total_available, v.display_color, v.sort_order
FROM events e, (VALUES
  ('standard',
   'Standard Table',
   'A single vendor table.',
   10000, 120, '#3b82f6', 1),

  ('corner',
   'End Corner',
   'End-of-row corner — two tables at a right angle, sold as one unit.',
   20000, 24, '#22c55e', 2),

  ('premier_corner',
   'Premier Corner',
   'Premium corner — two tables at a right angle, prime position, sold as one unit.',
   27500, 32, '#ef4444', 3)
) AS v(type_key, label, description, price_pence, total_available, display_color, sort_order)
WHERE e.slug = 'collectors-exhibition-june-2027'
ON CONFLICT (event_id, type_key) DO UPDATE
  SET label           = EXCLUDED.label,
      description     = EXCLUDED.description,
      price_pence     = EXCLUDED.price_pence,
      total_available = EXCLUDED.total_available,
      display_color   = EXCLUDED.display_color,
      sort_order      = EXCLUDED.sort_order;
