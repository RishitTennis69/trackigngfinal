create table if not exists public.profiles (
  id text primary key,
  email text not null unique,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  email text primary key,
  status text not null,
  plan text,
  premium_insights boolean not null default false,
  trial_ends_at timestamptz,
  source_app text,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  user_id text primary key references public.profiles(id) on delete cascade,
  business_name text not null,
  website text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dashboard_credentials (
  user_id text primary key references public.profiles(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dashboard_sessions (
  token text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at bigint not null,
  expires_at bigint not null
);

create table if not exists public.dashboard_scans (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  data jsonb not null
);

create table if not exists public.service_requests (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  status text not null default 'requested',
  created_at timestamptz not null default now(),
  data jsonb not null
);

create index if not exists idx_profiles_email on public.profiles (email);
create index if not exists idx_entitlements_status on public.entitlements (status);
create index if not exists idx_dashboard_sessions_user_id on public.dashboard_sessions (user_id);
create index if not exists idx_dashboard_sessions_expires_at on public.dashboard_sessions (expires_at);
create index if not exists idx_dashboard_scans_user_id_created_at on public.dashboard_scans (user_id, created_at desc);
create index if not exists idx_service_requests_user_id_created_at on public.service_requests (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.workspaces enable row level security;
alter table public.dashboard_credentials enable row level security;
alter table public.dashboard_sessions enable row level security;
alter table public.dashboard_scans enable row level security;
alter table public.service_requests enable row level security;

drop policy if exists "Service role can manage profiles" on public.profiles;
create policy "Service role can manage profiles"
  on public.profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage entitlements" on public.entitlements;
create policy "Service role can manage entitlements"
  on public.entitlements
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage workspaces" on public.workspaces;
create policy "Service role can manage workspaces"
  on public.workspaces
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage dashboard credentials" on public.dashboard_credentials;
create policy "Service role can manage dashboard credentials"
  on public.dashboard_credentials
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage dashboard sessions" on public.dashboard_sessions;
create policy "Service role can manage dashboard sessions"
  on public.dashboard_sessions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage dashboard scans" on public.dashboard_scans;
create policy "Service role can manage dashboard scans"
  on public.dashboard_scans
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage service requests" on public.service_requests;
create policy "Service role can manage service requests"
  on public.service_requests
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
