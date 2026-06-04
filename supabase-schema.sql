create table if not exists public.gleo_records (
  collection text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.gleo_records enable row level security;

create policy "Service role can manage Gleo records"
  on public.gleo_records
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
