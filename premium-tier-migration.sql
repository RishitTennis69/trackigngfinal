alter table public.entitlements
  add column if not exists premium_insights boolean not null default false;

create table if not exists public.service_requests (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  status text not null default 'requested',
  created_at timestamptz not null default now(),
  data jsonb not null
);

create index if not exists idx_service_requests_user_id_created_at
  on public.service_requests (user_id, created_at desc);

alter table public.service_requests enable row level security;

drop policy if exists "Service role can manage service requests" on public.service_requests;
create policy "Service role can manage service requests"
  on public.service_requests
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
