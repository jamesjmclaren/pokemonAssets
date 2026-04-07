-- Migration v8: Add is_managed flag to portfolios
-- A managed portfolio is one created by an admin user on behalf of a client.

ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS is_managed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_portfolios_is_managed ON portfolios (is_managed) WHERE is_managed = true;
