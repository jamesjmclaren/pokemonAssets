-- PriceCharting Tether - Schema Migration v5
-- Adds columns to "tether" an asset to a PriceCharting listing
-- for automatic price updates via web scraping.
-- Run this in your Supabase SQL Editor after v4.

-- PriceCharting product ID (the numeric ID from pricecharting.com)
alter table public.assets add column if not exists pc_product_id text;

-- PriceCharting product URL (used to scrape the detail page for prices)
alter table public.assets add column if not exists pc_url text;

-- Which price field to use from PriceCharting (e.g. "ungraded", "psa10", "grade9")
alter table public.assets add column if not exists pc_grade_field text;

-- Index for quickly finding tethered assets during price refresh
create index if not exists idx_assets_pc_tethered on public.assets(pc_product_id) where pc_product_id is not null;
