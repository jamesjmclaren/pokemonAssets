-- PokeVault Database Schema v2 - With Clerk Auth, Portfolios & Invitations
-- Run this in your Supabase SQL Editor after the original schema

-- Portfolios table
create table if not exists public.portfolios (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  owner_id text not null, -- Clerk user ID
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Portfolio members table (for sharing/invitations)
create table if not exists public.portfolio_members (
  id uuid primary key default uuid_generate_v4(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  user_id text not null, -- Clerk user ID
  email text not null, -- For invitation tracking
  role text not null check (role in ('admin', 'read_only')) default 'read_only',
  invited_by text not null, -- Clerk user ID of inviter
  invited_at timestamptz not null default now(),
  accepted_at timestamptz -- null means pending invitation
);

-- Portfolio invitations (pending invitations by email)
create table if not exists public.portfolio_invitations (
  id uuid primary key default uuid_generate_v4(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'read_only')) default 'read_only',
  invited_by text not null, -- Clerk user ID
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  unique(portfolio_id, email)
);

-- Add portfolio_id to assets table
alter table public.assets add column if not exists portfolio_id uuid references public.portfolios(id) on delete cascade;

-- Indexes
create index if not exists idx_portfolios_owner_id on public.portfolios(owner_id);
create index if not exists idx_portfolio_members_user_id on public.portfolio_members(user_id);
create index if not exists idx_portfolio_members_portfolio_id on public.portfolio_members(portfolio_id);
create index if not exists idx_portfolio_invitations_email on public.portfolio_invitations(email);
create index if not exists idx_portfolio_invitations_token on public.portfolio_invitations(token);
create index if not exists idx_assets_portfolio_id on public.assets(portfolio_id);

-- Updated_at triggers for new tables
create trigger update_portfolios_updated_at
  before update on public.portfolios
  for each row
  execute function public.update_updated_at_column();

-- RLS policies for portfolios
alter table public.portfolios enable row level security;
alter table public.portfolio_members enable row level security;
alter table public.portfolio_invitations enable row level security;

-- Allow all operations for now (Clerk handles auth at application level)
create policy "Allow all operations on portfolios"
  on public.portfolios for all
  using (true)
  with check (true);

create policy "Allow all operations on portfolio_members"
  on public.portfolio_members for all
  using (true)
  with check (true);

create policy "Allow all operations on portfolio_invitations"
  on public.portfolio_invitations for all
  using (true)
  with check (true);
