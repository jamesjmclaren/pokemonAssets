-- Migration v14: Public portfolio sharing
-- Adds is_public flag and public_token to portfolios table.
-- Run this in the Supabase SQL editor.

ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_token text;

-- Ensure tokens are unique across all portfolios
CREATE UNIQUE INDEX IF NOT EXISTS portfolios_public_token_unique
  ON portfolios (public_token)
  WHERE public_token IS NOT NULL;
