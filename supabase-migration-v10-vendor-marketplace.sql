-- Vendor Marketplace Migration - Schema Migration v10
-- Adds vendor profiles and for-sale listing capability to the asset tracker.
-- Run this in your Supabase SQL Editor after v9.

-- Vendor profiles (one per Clerk user)
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL UNIQUE,
  shop_name text NOT NULL,
  description text,
  shop_image_url text,
  website_url text,
  ebay_url text,
  whatsapp_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX idx_vendors_is_active ON public.vendors(is_active);

-- Trigger to keep updated_at current
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add for-sale fields to assets
-- for_sale=true means the item is listed in the marketplace
-- sale_price is the vendor's asking price (distinct from current_price/market price)
-- Note: status=SOLD tracks completed sales — these are separate concepts
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS for_sale boolean NOT NULL DEFAULT false;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sale_price numeric(10,2);

CREATE INDEX idx_assets_for_sale ON public.assets(for_sale) WHERE for_sale = true;
