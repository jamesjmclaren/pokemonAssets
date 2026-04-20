-- Price Source Preference Migration - Schema Migration v9
-- Adds a per-asset preferred price source so the user can lock an asset to
-- TCGPlayer, eBay, or CardMarket instead of the default auto fallback.
-- Run this in your Supabase SQL Editor after v8.

-- Preferred price source: 'tcgplayer' | 'ebay' | 'cardmarket' | NULL (= auto)
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS price_source TEXT;

-- Record which source a snapshot came from (overrides legacy "poketrace" label)
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS price_source TEXT;
