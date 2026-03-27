-- Comic Book Support - Schema Migration v6
-- Adds "comic" to the allowed asset_type values.
-- Run this in your Supabase SQL Editor after v5.

-- Drop the existing check constraint and re-create with "comic" included
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_asset_type_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_asset_type_check
  CHECK (asset_type IN ('card', 'sealed', 'comic'));
