-- Migration v7: Sold Assets & Cash Balance
-- Adds status, sell_price, sell_date to assets
-- Adds cash_balance to portfolios

-- Add sold tracking fields to assets
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SOLD')),
  ADD COLUMN IF NOT EXISTS sell_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sell_date DATE;

-- Add cash balance to portfolios (accumulates sell proceeds)
ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS cash_balance NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Index for efficient filtering by status per portfolio
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(portfolio_id, status);
