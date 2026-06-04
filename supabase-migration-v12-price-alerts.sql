-- Migration v12: Price Alerts / Watchlist
-- Users can track price movements on any card (owned or not) and receive
-- email alerts when prices hit thresholds or as a daily digest.

CREATE TABLE IF NOT EXISTS public.price_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Clerk user ID (auth managed at application layer, not Supabase auth)
  user_id         TEXT NOT NULL,

  -- Poketrace card reference
  poketrace_id    TEXT NOT NULL,

  -- Human-readable card metadata (denormalised for display without API calls)
  card_name       TEXT NOT NULL,
  set_name        TEXT NOT NULL DEFAULT '',
  image_url       TEXT,

  -- Which price tier to track, stored as a Poketrace tier key.
  -- Raw conditions: 'NEAR_MINT' | 'LIGHTLY_PLAYED' | 'MODERATELY_PLAYED' etc.
  -- Graded:         'PSA_10' | 'PSA_9' | 'CGC_10' | 'CGC_9.5' etc.
  condition_tier  TEXT NOT NULL DEFAULT 'NEAR_MINT',

  -- Which sources to track. User can enable any combination; at least one required.
  -- CardMarket is EU-only and is only valid when market = 'EU'.
  track_tcgplayer   BOOLEAN NOT NULL DEFAULT false,
  track_ebay        BOOLEAN NOT NULL DEFAULT false,
  track_cardmarket  BOOLEAN NOT NULL DEFAULT false,

  -- Poketrace market region
  market          TEXT NOT NULL DEFAULT 'US' CHECK (market IN ('US', 'EU')),

  -- Currency for threshold values and stored prices (always USD in this app)
  currency        TEXT NOT NULL DEFAULT 'USD',

  -- Alert settings
  alert_daily_digest  BOOLEAN NOT NULL DEFAULT false,
  target_low_price    NUMERIC(12, 2),   -- alert when price drops BELOW this
  target_high_price   NUMERIC(12, 2),   -- alert when price rises ABOVE this

  -- Last known price per source; null if source not tracked or price unavailable
  last_price_tcgplayer  NUMERIC(12, 2),
  last_price_ebay       NUMERIC(12, 2),
  last_price_cardmarket NUMERIC(12, 2),

  -- Debounce: only send threshold alerts once per 24h per alert
  last_notified_at    TIMESTAMPTZ,

  is_active       BOOLEAN NOT NULL DEFAULT true,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_price_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_price_alerts_updated_at
  BEFORE UPDATE ON public.price_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_price_alerts_updated_at();

-- Index for per-user queries (tracking management page)
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id
  ON public.price_alerts (user_id);

-- Index for the cron job: fetch all active alerts efficiently
CREATE INDEX IF NOT EXISTS idx_price_alerts_active
  ON public.price_alerts (is_active) WHERE is_active = true;

-- Prevent duplicate alerts for the same card+tier per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_alerts_unique_user_card_tier
  ON public.price_alerts (user_id, poketrace_id, condition_tier);

-- RLS enabled; ownership enforced at application layer (consistent with assets table)
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Permissive policy: application layer enforces user_id ownership
CREATE POLICY "price_alerts_all" ON public.price_alerts
  FOR ALL USING (true);
