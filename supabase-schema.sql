-- PokeVault Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Assets table
create table if not exists public.assets (
  id uuid primary key default uuid_generate_v4(),
  external_id text not null,
  name text not null,
  set_name text not null default '',
  asset_type text not null default 'card' check (asset_type in ('card', 'sealed')),
  image_url text,
  custom_image_url text,
  purchase_price numeric(10, 2) not null,
  purchase_date date not null,
  purchase_location text not null default '',
  condition text not null default 'Near Mint',
  notes text,
  current_price numeric(10, 2),
  price_updated_at timestamptz,
  rarity text,
  card_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Price snapshots for tracking history from our own recordings
create table if not exists public.price_snapshots (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  price numeric(10, 2) not null,
  source text not null default 'tcgplayer',
  recorded_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_assets_external_id on public.assets(external_id);
create index if not exists idx_assets_created_at on public.assets(created_at desc);
create index if not exists idx_assets_asset_type on public.assets(asset_type);
create index if not exists idx_price_snapshots_asset_id on public.price_snapshots(asset_id);
create index if not exists idx_price_snapshots_recorded_at on public.price_snapshots(recorded_at desc);

-- Updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_assets_updated_at
  before update on public.assets
  for each row
  execute function public.update_updated_at_column();

-- Row Level Security (permissive for now, will add auth later)
alter table public.assets enable row level security;
alter table public.price_snapshots enable row level security;

-- Allow all operations for now (will restrict with auth later)
create policy "Allow all operations on assets"
  on public.assets for all
  using (true)
  with check (true);

create policy "Allow all operations on price_snapshots"
  on public.price_snapshots for all
  using (true)
  with check (true);

-- Storage bucket for custom asset images
-- Run this separately in the Supabase dashboard or via the API:
-- insert into storage.buckets (id, name, public) values ('asset-images', 'asset-images', true);
