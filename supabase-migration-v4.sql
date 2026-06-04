-- West Investments Ltd - Schema Migration v4
-- Adds language, physical location, and manual submission tracking
-- Also ensures price snapshots are recorded daily for pricing history
-- Run this in your Supabase SQL Editor after v3

-- Add language column (e.g. English, Japanese, Korean, etc.)
alter table public.assets add column if not exists language text not null default 'English';

-- Add physical storage location (where the card/product is physically stored)
alter table public.assets add column if not exists storage_location text not null default '';

-- Add manual submission flag (true when asset was added without matching an API result)
alter table public.assets add column if not exists is_manual_submission boolean not null default false;

-- Index for manual submissions
create index if not exists idx_assets_manual_submission on public.assets(is_manual_submission) where is_manual_submission = true;

-- Index for price_updated_at to efficiently find stale prices
create index if not exists idx_assets_price_updated_at on public.assets(price_updated_at);
