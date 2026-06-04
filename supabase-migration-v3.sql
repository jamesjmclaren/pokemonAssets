-- West Investments Ltd - Schema Migration v3
-- Adds PSA grading, manual price management, and quantity tracking
-- Run this in your Supabase SQL Editor after v2

-- Add PSA/grading column
alter table public.assets add column if not exists psa_grade text;

-- Add manual price flag (when true, refresh-prices skips this asset)
alter table public.assets add column if not exists manual_price boolean not null default false;

-- Add quantity column (number of units of this asset)
alter table public.assets add column if not exists quantity integer not null default 1;

-- Index for manual_price to speed up refresh-prices filtering
create index if not exists idx_assets_manual_price on public.assets(manual_price) where manual_price = true;
