-- Migration v13: Set price trends cache
-- Stores nightly snapshots of the top N cards per set, per tier (raw NM and PSA 10),
-- per trend period (1d and 7d). The /api/set-trends route reads from this table
-- first and falls back to a live Poketrace fetch when no fresh row exists.
--
-- Run order:
--   1. CREATE TABLE + INDEX below
--   2. ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--   3. CREATE POLICY "Public read access" (below)
--   4. Cron writes use the service-role key (see src/lib/supabase-admin.ts),
--      which bypasses RLS — no INSERT policy needed.

CREATE TABLE IF NOT EXISTS set_price_trends (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_slug      text        NOT NULL,
  set_name      text        NOT NULL,
  period        text        NOT NULL CHECK (period IN ('1d', '7d')),
  tier_type     text        NOT NULL CHECK (tier_type IN ('raw', 'psa10')),
  rank          int         NOT NULL,
  card_id       text        NOT NULL,
  card_name     text        NOT NULL,
  card_number   text,
  card_image    text,
  rarity        text,
  current_price numeric     NOT NULL,
  prev_price    numeric,
  abs_change    numeric,
  pct_change    numeric,
  sale_count    int,
  source        text,
  recorded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_set_price_trends_lookup
  ON set_price_trends (set_slug, period, tier_type, recorded_at DESC);

ALTER TABLE set_price_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON set_price_trends
  FOR SELECT
  USING (true);
