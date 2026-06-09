-- AutoFlow schema. Run via scripts/migrate.mjs or paste into the Supabase SQL editor.
-- Note: auth.users is a Supabase-managed system table — we reference it but never alter it.

-- Connections table
create table if not exists connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null,
  api_key text,
  access_token text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- One connection per platform per user.
alter table connections add constraint connections_user_platform_unique unique (user_id, platform);

alter table connections enable row level security;
create policy "Users own their connections" on connections
  for all using (auth.uid() = user_id);

-- Automations table
create table if not exists automations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text default '',
  workflow_json jsonb not null default '{}'::jsonb,
  platform text default 'autoflow',
  status text default 'paused' check (status in ('active', 'paused', 'running', 'error')),
  last_run timestamptz,
  created_at timestamptz default now()
);

alter table automations enable row level security;
create policy "Users own their automations" on automations
  for all using (auth.uid() = user_id);

-- Runs table
create table if not exists runs (
  id uuid default gen_random_uuid() primary key,
  automation_id uuid references automations(id) on delete cascade not null,
  status text default 'running' check (status in ('running', 'success', 'failed')),
  log jsonb default '[]'::jsonb,
  started_at timestamptz default now(),
  finished_at timestamptz
);

alter table runs enable row level security;
create policy "Users own their runs" on runs
  for all using (
    automation_id in (select id from automations where user_id = auth.uid())
  );

-- Subscriptions table (managed by Stripe webhook)
create table if not exists subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  plan text default 'free' check (plan in ('free', 'pro', 'team')),
  status text default 'inactive' check (status in ('active', 'inactive')),
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;
create policy "Users read own subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- Generated sites table
create table if not exists generated_sites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  automation_id uuid references automations(id) on delete cascade,
  site_code text not null,
  deploy_url text,
  created_at timestamptz default now()
);

alter table generated_sites enable row level security;
create policy "Users own their sites" on generated_sites
  for all using (auth.uid() = user_id);
