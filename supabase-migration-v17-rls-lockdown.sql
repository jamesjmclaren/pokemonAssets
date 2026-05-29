-- Migration v17: Lock down Row Level Security on all sensitive tables.
--
-- BACKGROUND
-- Until now these tables had permissive `USING (true)` policies, which meant
-- anyone holding the public NEXT_PUBLIC_SUPABASE_ANON_KEY (it ships in the
-- browser bundle) could read and write the entire database directly via the
-- Supabase REST API — bypassing the app entirely. This migration removes those
-- policies and enables RLS with NO policy for the anon/authenticated roles, so
-- direct access is denied. The server uses the service_role key, which BYPASSES
-- RLS, so all API routes continue to work.
--
-- ⚠️ DEPLOY ORDER — READ BEFORE RUNNING
--   1. First DEPLOY the matching code change (all API routes switched from the
--      anon client to the service-role client). That deploy is behaviour-neutral
--      on its own and safe.
--   2. Verify the app works (dashboard, add/edit/delete asset, portfolios,
--      sharing, price alerts, marketplace).
--   3. THEN run this migration. If you run it BEFORE the code is deployed, every
--      data route will start failing (the anon client will be denied).
--
-- Image uploads are unaffected: they use Supabase Storage, which has its own
-- policies on the `asset-images` bucket, not table RLS.
--
-- set_price_trends is intentionally left with its "Public read access" policy —
-- it holds non-sensitive aggregate card price data, not user data.

-- Drop EVERY existing policy on the sensitive tables (name-agnostic, so no
-- leftover permissive policy can survive a rename), then enable RLS with none.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'assets',
        'price_snapshots',
        'portfolios',
        'portfolio_members',
        'portfolio_invitations',
        'price_alerts',
        'vendors',
        'event_bookings'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Enable RLS on every sensitive table. With no policy present, the anon and
-- authenticated roles are denied all access; the service_role key bypasses RLS.
ALTER TABLE public.assets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_bookings         ENABLE ROW LEVEL SECURITY;

-- Verify: this should return every table above with rowsecurity = true and 0
-- policies. Run it after applying the migration.
--
--   SELECT t.tablename, t.rowsecurity, COUNT(p.policyname) AS policy_count
--   FROM pg_tables t
--   LEFT JOIN pg_policies p
--     ON p.schemaname = t.schemaname AND p.tablename = t.tablename
--   WHERE t.schemaname = 'public'
--     AND t.tablename IN ('assets','price_snapshots','portfolios',
--       'portfolio_members','portfolio_invitations','price_alerts',
--       'vendors','event_bookings')
--   GROUP BY t.tablename, t.rowsecurity
--   ORDER BY t.tablename;
