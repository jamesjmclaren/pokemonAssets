-- Poketrace Migration - Schema Migration v8
-- Adds Poketrace product linking fields and currency tracking.
-- Run this in your Supabase SQL Editor after v7.

-- Poketrace product ID (the card/product ID from Poketrace API)
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS poketrace_id TEXT;

-- Poketrace market (US or EU) — determines which market to query for price refresh
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS poketrace_market TEXT DEFAULT 'US';

-- Currency the current_price is denominated in (NULL or 'USD' = USD)
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS price_currency TEXT DEFAULT 'USD';

-- True when current_price was converted from a foreign currency (e.g. EUR → USD)
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS is_converted_price BOOLEAN DEFAULT FALSE;

-- Index for quickly looking up Poketrace-linked assets during price refresh
CREATE INDEX IF NOT EXISTS idx_assets_poketrace
  ON public.assets(poketrace_id) WHERE poketrace_id IS NOT NULL;

-- Currency tracking on price snapshots
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,6);
