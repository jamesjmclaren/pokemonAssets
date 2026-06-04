-- Evidence URL - Schema Migration v6
-- Adds evidence_url column for storing pricing evidence links (eBay listings, etc.)
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS evidence_url text;
