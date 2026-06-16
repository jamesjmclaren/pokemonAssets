-- Migration v24: seed a separate "test" event for PREVIEW deployments.
--
-- We share ONE Supabase database between production and preview. To keep the
-- real booking data clean, preview deploys (VERCEL_ENV != 'production') target
-- this test event instead of the live one — see src/lib/event-config.ts. It is
-- a clone of the v18 seed under a -test slug, so the floor plan, prices and
-- counts behave identically. Holds/bookings/waitlist are keyed by event_id, so
-- test traffic is isolated from production automatically.
--
-- Idempotent. Run once on the shared Supabase project (requires v18).

INSERT INTO events (slug, name, venue, event_days, start_date, end_date, is_active)
VALUES (
  'collectors-exhibition-june-2027-test',
  'The Collectors Exhibition (TEST)',
  'TBC',
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
WHERE e.slug = 'collectors-exhibition-june-2027-test'
ON CONFLICT (event_id, type_key) DO UPDATE
  SET label           = EXCLUDED.label,
      description     = EXCLUDED.description,
      price_pence     = EXCLUDED.price_pence,
      total_available = EXCLUDED.total_available,
      display_color   = EXCLUDED.display_color,
      sort_order      = EXCLUDED.sort_order;
