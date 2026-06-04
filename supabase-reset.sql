-- Reset and setup database for Clerk auth with portfolios
-- WARNING: This will delete all existing data!

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.portfolio_invitations CASCADE;
DROP TABLE IF EXISTS public.portfolio_members CASCADE;
DROP TABLE IF EXISTS public.price_snapshots CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.portfolios CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Portfolios table
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  owner_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Portfolio members table
CREATE TABLE public.portfolio_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'read_only')) DEFAULT 'read_only',
  invited_by text NOT NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

-- Portfolio invitations
CREATE TABLE public.portfolio_invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'read_only')) DEFAULT 'read_only',
  invited_by text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, email)
);

-- Assets table (with portfolio_id required)
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  set_name text NOT NULL DEFAULT '',
  asset_type text NOT NULL DEFAULT 'card' CHECK (asset_type IN ('card', 'sealed')),
  image_url text,
  custom_image_url text,
  purchase_price numeric(10, 2) NOT NULL,
  purchase_date date NOT NULL,
  purchase_location text NOT NULL DEFAULT '',
  condition text NOT NULL DEFAULT 'Near Mint',
  notes text,
  current_price numeric(10, 2),
  price_updated_at timestamptz,
  rarity text,
  card_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Price snapshots
CREATE TABLE public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  price numeric(10, 2) NOT NULL,
  source text NOT NULL DEFAULT 'tcgplayer',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_portfolios_owner_id ON public.portfolios(owner_id);
CREATE INDEX idx_portfolio_members_user_id ON public.portfolio_members(user_id);
CREATE INDEX idx_portfolio_members_portfolio_id ON public.portfolio_members(portfolio_id);
CREATE INDEX idx_portfolio_invitations_email ON public.portfolio_invitations(email);
CREATE INDEX idx_portfolio_invitations_token ON public.portfolio_invitations(token);
CREATE INDEX idx_assets_portfolio_id ON public.assets(portfolio_id);
CREATE INDEX idx_assets_external_id ON public.assets(external_id);
CREATE INDEX idx_assets_created_at ON public.assets(created_at DESC);
CREATE INDEX idx_price_snapshots_asset_id ON public.price_snapshots(asset_id);
CREATE INDEX idx_price_snapshots_recorded_at ON public.price_snapshots(recorded_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS (permissive for now - Clerk handles auth at app level)
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.portfolios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.portfolio_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.portfolio_invitations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.price_snapshots FOR ALL USING (true) WITH CHECK (true);
